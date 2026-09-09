"""Backend tests for As Delícias da Quintinha."""
import os
import time
import io
import struct
import zlib
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if os.environ.get("REACT_APP_BACKEND_URL") else None
if not BASE_URL:
    # fallback to frontend .env
    with open(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", ".env")) as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")

ADMIN_EMAIL = os.environ.get("TEST_ADMIN_EMAIL")
ADMIN_PASSWORD = os.environ.get("TEST_ADMIN_PASSWORD")


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin_token(session):
    if not ADMIN_EMAIL or not ADMIN_PASSWORD:
        pytest.skip("Defina TEST_ADMIN_EMAIL e TEST_ADMIN_PASSWORD para executar testes administrativos")
    r = session.post(f"{BASE_URL}/api/auth/login",
                     json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    if r.status_code != 200:
        pytest.skip(f"Admin login failed {r.status_code}: {r.text}")
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# ---------- Public products / categories ----------
class TestPublicProducts:
    def test_list_products(self, session):
        r = session.get(f"{BASE_URL}/api/products", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 20, f"Expected >=20 seeded products, got {len(data)}"
        sample = data[0]
        for k in ("id", "name", "category", "price", "unit"):
            assert k in sample

    def test_filter_by_category(self, session):
        r = session.get(f"{BASE_URL}/api/products?category=frutas", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert len(data) > 0
        assert all(p["category"] == "frutas" for p in data)

    def test_filter_featured(self, session):
        r = session.get(f"{BASE_URL}/api/products?featured=true", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert all(p.get("featured") is True for p in data)

    def test_get_categories(self, session):
        r = session.get(f"{BASE_URL}/api/categories", timeout=30)
        assert r.status_code == 200
        cats = r.json()
        assert len(cats) == 6
        slugs = {c["slug"] for c in cats}
        assert {"frutas", "legumes", "queijos-enchidos", "vinhos", "compotas", "mercearia"} <= slugs


# ---------- Public orders ----------
class TestOrders:
    def _sample_items(self, session):
        prods = session.get(f"{BASE_URL}/api/products", timeout=30).json()
        return [{
            "product_id": prods[0]["id"],
            "name": prods[0]["name"],
            "price": prods[0]["price"],
            "unit": prods[0]["unit"],
            "quantity": 2,
        }]

    def test_create_order_pickup(self, session):
        items = self._sample_items(session)
        payload = {
            "customer_name": "TEST_Cliente",
            "phone": "912345678",
            "delivery_method": "pickup",
            "items": items,
        }
        r = session.post(f"{BASE_URL}/api/orders", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "id" in data
        expected_total = round(items[0]["price"] * items[0]["quantity"], 2)
        assert abs(data["total"] - expected_total) < 0.01
        assert data["status"] == "pending"

        # Verify GET
        oid = data["id"]
        g = session.get(f"{BASE_URL}/api/orders/{oid}", timeout=30)
        assert g.status_code == 200
        assert g.json()["customer_name"] == "TEST_Cliente"

    def test_create_order_empty_cart(self, session):
        payload = {"customer_name": "TEST", "phone": "1", "delivery_method": "pickup", "items": []}
        r = session.post(f"{BASE_URL}/api/orders", json=payload, timeout=30)
        assert r.status_code == 400

    def test_create_order_delivery_no_address(self, session):
        items = self._sample_items(session)
        payload = {
            "customer_name": "TEST_Delivery",
            "phone": "912000000",
            "delivery_method": "delivery",
            "items": items,
        }
        r = session.post(f"{BASE_URL}/api/orders", json=payload, timeout=30)
        assert r.status_code == 400

    def test_create_order_with_email_returns_200(self, session):
        items = self._sample_items(session)
        payload = {
            "customer_name": "TEST_Email",
            "phone": "912000000",
            "email": "test_buyer@example.com",
            "delivery_method": "pickup",
            "items": items,
        }
        r = session.post(f"{BASE_URL}/api/orders", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        assert r.json()["email"] == "test_buyer@example.com"


# ---------- Auth ----------
class TestAuth:
    def test_login_success(self, session):
        r = session.post(f"{BASE_URL}/api/auth/login",
                         json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "access_token" in data and isinstance(data["access_token"], str)
        assert data["user"]["email"] == ADMIN_EMAIL
        assert data["user"]["role"] == "admin"

    def test_login_wrong_password(self, session):
        r = session.post(f"{BASE_URL}/api/auth/login",
                         json={"email": ADMIN_EMAIL, "password": "wrong"}, timeout=30)
        assert r.status_code == 401

    def test_auth_me(self, session, auth_headers):
        r = session.get(f"{BASE_URL}/api/auth/me", headers=auth_headers, timeout=30)
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN_EMAIL

    def test_admin_orders_requires_auth(self, session):
        r = session.get(f"{BASE_URL}/api/admin/orders", timeout=30)
        assert r.status_code == 401

    def test_admin_orders_with_auth(self, session, auth_headers):
        r = session.get(f"{BASE_URL}/api/admin/orders", headers=auth_headers, timeout=30)
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ---------- Admin orders ----------
class TestAdminOrders:
    def _create_order(self, session, with_email=False):
        prods = session.get(f"{BASE_URL}/api/products", timeout=30).json()
        items = [{
            "product_id": prods[0]["id"], "name": prods[0]["name"],
            "price": prods[0]["price"], "unit": prods[0]["unit"], "quantity": 1,
        }]
        payload = {
            "customer_name": "TEST_AdminFlow",
            "phone": "912000000",
            "delivery_method": "pickup",
            "items": items,
        }
        if with_email:
            payload["email"] = "test_admin_flow@example.com"
        r = session.post(f"{BASE_URL}/api/orders", json=payload, timeout=30)
        assert r.status_code == 200
        return r.json()["id"]

    def test_update_order_status(self, session, auth_headers):
        oid = self._create_order(session)
        r = session.patch(f"{BASE_URL}/api/admin/orders/{oid}/status",
                          headers=auth_headers, json={"status": "confirmed"}, timeout=30)
        assert r.status_code == 200
        assert r.json()["status"] == "confirmed"

    def test_notify_ready_with_email(self, session, auth_headers):
        oid = self._create_order(session, with_email=True)
        r = session.post(f"{BASE_URL}/api/admin/orders/{oid}/notify-ready",
                         headers=auth_headers, timeout=30)
        assert r.status_code == 200, r.text
        # status should now be ready
        time.sleep(1)
        g = session.get(f"{BASE_URL}/api/orders/{oid}", timeout=30)
        assert g.json()["status"] == "ready"

    def test_notify_ready_no_email_returns_400(self, session, auth_headers):
        oid = self._create_order(session, with_email=False)
        r = session.post(f"{BASE_URL}/api/admin/orders/{oid}/notify-ready",
                         headers=auth_headers, timeout=30)
        assert r.status_code == 400


# ---------- Admin products ----------
class TestAdminProducts:
    def test_create_update_delete_product(self, session, auth_headers):
        # CREATE
        payload = {
            "name": "TEST_Produto", "category": "mercearia", "price": 1.0,
            "unit": "un", "image": "", "description": "test", "in_stock": True,
        }
        r = session.post(f"{BASE_URL}/api/admin/products", json=payload, headers=auth_headers, timeout=30)
        assert r.status_code == 200, r.text
        pid = r.json()["id"]
        assert r.json()["name"] == "TEST_Produto"

        # UPDATE
        payload["price"] = 2.5
        payload["name"] = "TEST_Produto_Updated"
        u = session.put(f"{BASE_URL}/api/admin/products/{pid}", json=payload, headers=auth_headers, timeout=30)
        assert u.status_code == 200
        assert u.json()["name"] == "TEST_Produto_Updated"
        assert u.json()["price"] == 2.5

        # GET to verify persistence
        g = session.get(f"{BASE_URL}/api/products/{pid}", timeout=30)
        assert g.status_code == 200
        assert g.json()["price"] == 2.5

        # DELETE
        d = session.delete(f"{BASE_URL}/api/admin/products/{pid}", headers=auth_headers, timeout=30)
        assert d.status_code == 200

        # 404 after delete
        g2 = session.get(f"{BASE_URL}/api/products/{pid}", timeout=30)
        assert g2.status_code == 404


# ---------- Push notifications ----------
class TestPushNotifications:
    def test_vapid_public_key_no_auth(self, session):
        r = session.get(f"{BASE_URL}/api/push/vapid-public-key", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert "key" in data
        assert isinstance(data["key"], str)
        assert len(data["key"]) > 50  # base64 VAPID public key is ~87 chars

    def test_subscribe_requires_auth(self, session):
        r = session.post(f"{BASE_URL}/api/admin/push/subscribe",
                         json={"subscription": {"endpoint": "https://example.com/x", "keys": {"p256dh": "a", "auth": "b"}}},
                         timeout=30)
        assert r.status_code == 401

    def test_unsubscribe_requires_auth(self, session):
        r = session.post(f"{BASE_URL}/api/admin/push/unsubscribe",
                         json={"subscription": {"endpoint": "https://example.com/x"}},
                         timeout=30)
        assert r.status_code == 401

    def test_test_push_requires_auth(self, session):
        r = session.post(f"{BASE_URL}/api/admin/push/test", timeout=30)
        assert r.status_code == 401

    def test_subscribe_invalid_payload(self, session, auth_headers):
        # Missing endpoint
        r = session.post(f"{BASE_URL}/api/admin/push/subscribe",
                         json={"subscription": {}}, headers=auth_headers, timeout=30)
        assert r.status_code == 400

    def test_subscribe_and_unsubscribe_flow(self, session, auth_headers):
        sub = {
            "endpoint": "https://fcm.googleapis.com/fcm/send/TEST_endpoint_unique_xyz",
            "expirationTime": None,
            "keys": {"p256dh": "BPvR2VbBOehCx1nMtqHsvf4RBbsZgC6mSLdJ5gJ3kZE-MOCK", "auth": "MOCK_auth_secret_8b"},
        }
        r = session.post(f"{BASE_URL}/api/admin/push/subscribe",
                         json={"subscription": sub}, headers=auth_headers, timeout=30)
        assert r.status_code == 200, r.text
        assert r.json().get("ok") is True

        # Idempotent upsert - subscribing same endpoint again should still 200
        r2 = session.post(f"{BASE_URL}/api/admin/push/subscribe",
                          json={"subscription": sub}, headers=auth_headers, timeout=30)
        assert r2.status_code == 200

        # Unsubscribe
        u = session.post(f"{BASE_URL}/api/admin/push/unsubscribe",
                         json={"subscription": sub}, headers=auth_headers, timeout=30)
        assert u.status_code == 200
        assert u.json().get("ok") is True

    def test_admin_push_test(self, session, auth_headers):
        # With no real subs (or only the synthetic one we just removed), should return {sent: 0 or N}
        r = session.post(f"{BASE_URL}/api/admin/push/test", headers=auth_headers, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "sent" in data
        assert isinstance(data["sent"], int)
        assert data["sent"] >= 0


# ---------- PWA static assets via frontend ----------
class TestPWAAssets:
    @pytest.fixture(scope="class")
    def frontend_url(self):
        # frontend served at REACT_APP_BACKEND_URL root (same domain)
        return BASE_URL

    def test_manifest_served(self, session, frontend_url):
        r = session.get(f"{frontend_url}/manifest.json", timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("name")
        assert data.get("theme_color") == "#C1292E"
        assert isinstance(data.get("icons"), list) and len(data["icons"]) > 0

    def test_service_worker_served(self, session, frontend_url):
        r = session.get(f"{frontend_url}/service-worker.js", timeout=30)
        assert r.status_code == 200, r.text
        body = r.text
        assert "push" in body
        assert "notificationclick" in body

    def test_index_html_has_manifest_and_apple_meta(self, session, frontend_url):
        r = session.get(f"{frontend_url}/", timeout=30)
        assert r.status_code == 200
        html = r.text
        assert 'rel="manifest"' in html or "rel='manifest'" in html
        assert "apple-mobile-web-app-capable" in html


# ---------- Admin stats ----------
class TestAdminStats:
    def test_stats(self, session, auth_headers):
        r = session.get(f"{BASE_URL}/api/admin/stats", headers=auth_headers, timeout=30)
        assert r.status_code == 200
        data = r.json()
        for k in ("total_orders", "pending", "confirmed", "delivered", "products"):
            assert k in data
            assert isinstance(data[k], int)


# ---------- Site Content (CMS) ----------
def _make_png_bytes(width=4, height=4):
    """Generate a tiny valid PNG byte sequence."""
    def chunk(tag, data):
        return (struct.pack(">I", len(data)) + tag + data
                + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF))
    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)  # 8-bit RGB
    raw = b""
    for _ in range(height):
        raw += b"\x00" + b"\xff\x00\x00" * width  # red pixels
    idat = zlib.compress(raw)
    return sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")


class TestSiteContent:
    def test_get_content_public_no_auth(self, session):
        # New session w/o auth headers
        r = requests.get(f"{BASE_URL}/api/content", timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        # Top-level keys
        for k in ("hero", "about", "contact", "reviews", "categories",
                  "cta_title", "cta_subtitle", "footer_tagline"):
            assert k in data, f"Missing key {k}"
        # Hero shape
        for k in ("tagline", "title_part1", "title_emphasis", "title_part2",
                  "subtitle", "image", "cta_primary", "cta_secondary",
                  "rating_value", "rating_label"):
            assert k in data["hero"], f"hero missing {k}"
        # About shape
        for k in ("tagline", "title", "paragraph1", "paragraph2", "image"):
            assert k in data["about"], f"about missing {k}"
        # Contact shape
        for k in ("address_line1", "address_line2", "phone", "email",
                  "facebook_url", "facebook_handle", "hours_weekday_label",
                  "hours_weekday_time", "hours_weekend_label",
                  "hours_weekend_time", "map_query"):
            assert k in data["contact"], f"contact missing {k}"
        # Lists
        assert isinstance(data["reviews"], list)
        assert isinstance(data["categories"], list)

    def test_put_content_requires_auth(self, session):
        r = requests.put(f"{BASE_URL}/api/admin/content",
                         json={"hero": {}}, timeout=30)
        assert r.status_code == 401

    def test_put_content_round_trip(self, session, auth_headers):
        # 1. GET current
        r = requests.get(f"{BASE_URL}/api/content", timeout=30)
        assert r.status_code == 200
        original = r.json()
        original_subtitle = original["hero"]["subtitle"]
        original_phone = original["contact"]["phone"]

        # 2. Modify
        modified = dict(original)
        modified["hero"] = dict(original["hero"])
        modified["hero"]["subtitle"] = "TEST_subtitle_modified_xyz"
        modified["contact"] = dict(original["contact"])
        modified["contact"]["phone"] = "+351 999 111 222"

        # 3. PUT
        p = requests.put(f"{BASE_URL}/api/admin/content",
                         json=modified, headers=auth_headers, timeout=30)
        assert p.status_code == 200, p.text
        put_data = p.json()
        assert put_data["hero"]["subtitle"] == "TEST_subtitle_modified_xyz"
        assert put_data["contact"]["phone"] == "+351 999 111 222"

        # 4. GET again — verify persistence
        g = requests.get(f"{BASE_URL}/api/content", timeout=30)
        assert g.status_code == 200
        new = g.json()
        assert new["hero"]["subtitle"] == "TEST_subtitle_modified_xyz"
        assert new["contact"]["phone"] == "+351 999 111 222"

        # 5. Restore originals
        modified["hero"]["subtitle"] = original_subtitle
        modified["contact"]["phone"] = original_phone
        r2 = requests.put(f"{BASE_URL}/api/admin/content",
                          json=modified, headers=auth_headers, timeout=30)
        assert r2.status_code == 200

    def test_put_content_bad_payload(self, session, auth_headers):
        # Missing required nested? Pydantic should accept due to defaults; check minimal valid
        r = requests.put(f"{BASE_URL}/api/admin/content",
                         json={"hero": {"subtitle": "x"}}, headers=auth_headers, timeout=30)
        # Should accept (defaults fill in); just verify 200 or 422 (both acceptable)
        assert r.status_code in (200, 422)

    def test_upload_requires_auth(self, session):
        png = _make_png_bytes()
        r = requests.post(f"{BASE_URL}/api/admin/upload",
                          files={"file": ("test.png", png, "image/png")},
                          timeout=30)
        assert r.status_code == 401

    def test_upload_valid_png(self, session, auth_headers):
        png = _make_png_bytes()
        r = requests.post(f"{BASE_URL}/api/admin/upload",
                          files={"file": ("test.png", png, "image/png")},
                          headers=auth_headers, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "url" in data
        assert data["url"].startswith("data:image/png;base64,")
        assert data["content_type"] == "image/png"
        assert data["size"] == len(png)

    def test_upload_valid_jpeg(self, session, auth_headers):
        # Smallest 1x1 JPEG
        jpeg = bytes.fromhex(
            "ffd8ffe000104a46494600010100000100010000ffdb0043000806060706"
            "05080707070909080a0c140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c20"
            "242e2720222c231c1c2837292c30313434341f27393d38323c2e333432ff"
            "c0000b080001000101011100ffc4001f0000010501010101010100000000"
            "00000000010203040506070809000affc400b5100002010303020403050504"
            "040000017d01020300041105122131410613516107227114328191a10823"
            "42b1c11552d1f02433627282090a161718191a25262728292a3435363738"
            "393a434445464748494a535455565758595a636465666768696a73747576"
            "7778797a838485868788898a92939495969798999aa2a3a4a5a6a7a8a9aa"
            "b2b3b4b5b6b7b8b9bac2c3c4c5c6c7c8c9cad2d3d4d5d6d7d8d9dae1e2e3"
            "e4e5e6e7e8e9eaf1f2f3f4f5f6f7f8f9faffda0008010100003f00fb00ff"
            "d9"
        )
        r = requests.post(f"{BASE_URL}/api/admin/upload",
                          files={"file": ("test.jpg", jpeg, "image/jpeg")},
                          headers=auth_headers, timeout=30)
        assert r.status_code == 200, r.text
        assert r.json()["url"].startswith("data:image/jpeg;base64,")

    def test_upload_rejects_non_image(self, session, auth_headers):
        r = requests.post(f"{BASE_URL}/api/admin/upload",
                          files={"file": ("test.txt", b"hello world", "text/plain")},
                          headers=auth_headers, timeout=30)
        assert r.status_code == 400
        assert "Formato" in r.json().get("detail", "") or "supported" in r.json().get("detail", "").lower() or "suportado" in r.json().get("detail", "").lower()

    def test_upload_rejects_oversize(self, session, auth_headers):
        # 5 MB of zeros, claimed as image/png — should be rejected by size check
        big = b"\x00" * (5 * 1024 * 1024)
        r = requests.post(f"{BASE_URL}/api/admin/upload",
                          files={"file": ("big.png", big, "image/png")},
                          headers=auth_headers, timeout=60)
        assert r.status_code == 400
        detail = r.json().get("detail", "")
        assert "grande" in detail.lower() or "4 mb" in detail.lower() or "max" in detail.lower()
