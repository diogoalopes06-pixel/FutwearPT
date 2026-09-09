"""Tests for new features: bundles, coupons, order delivery_slot+coupon+stock, sitemap, new content fields."""
import os
import uuid
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    with open(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", ".env")) as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")

ADMIN_EMAIL = os.environ.get("TEST_ADMIN_EMAIL")
ADMIN_PASSWORD = os.environ.get("TEST_ADMIN_PASSWORD")


@pytest.fixture(scope="module")
def auth_headers():
    if not ADMIN_EMAIL or not ADMIN_PASSWORD:
        pytest.skip("Defina TEST_ADMIN_EMAIL e TEST_ADMIN_PASSWORD para executar testes administrativos")
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


# ---------- Bundles ----------
class TestBundles:
    def test_list_bundles_public(self):
        r = requests.get(f"{BASE_URL}/api/bundles", timeout=30)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_create_bundle_requires_auth(self):
        r = requests.post(f"{BASE_URL}/api/bundles",
                          json={"name": "x", "price": 1.0}, timeout=30)
        # Endpoint is /api/admin/bundles so hitting /api/bundles POST = 405
        assert r.status_code in (404, 405)
        r2 = requests.post(f"{BASE_URL}/api/admin/bundles",
                           json={"name": "x", "price": 1.0}, timeout=30)
        assert r2.status_code == 401

    def test_bundle_crud(self, auth_headers):
        # CREATE
        payload = {
            "name": "TEST_Cabaz_Frutas",
            "description": "Cabaz de teste",
            "price": 19.99,
            "image": "",
            "items": [{"name": "Maçã", "quantity": 2, "unit": "kg"},
                      {"name": "Banana", "quantity": 1, "unit": "kg"}],
            "active": True,
            "featured": False,
        }
        r = requests.post(f"{BASE_URL}/api/admin/bundles", json=payload,
                          headers=auth_headers, timeout=30)
        assert r.status_code == 200, r.text
        b = r.json()
        assert b["name"] == "TEST_Cabaz_Frutas"
        assert b["price"] == 19.99
        assert len(b["items"]) == 2
        bid = b["id"]

        # LIST active returns it
        lst = requests.get(f"{BASE_URL}/api/bundles?active=true", timeout=30).json()
        assert any(x["id"] == bid for x in lst)

        # UPDATE
        payload["price"] = 24.50
        payload["name"] = "TEST_Cabaz_Atualizado"
        u = requests.put(f"{BASE_URL}/api/admin/bundles/{bid}", json=payload,
                         headers=auth_headers, timeout=30)
        assert u.status_code == 200
        assert u.json()["price"] == 24.50
        assert u.json()["name"] == "TEST_Cabaz_Atualizado"

        # DELETE
        d = requests.delete(f"{BASE_URL}/api/admin/bundles/{bid}",
                            headers=auth_headers, timeout=30)
        assert d.status_code == 200

        # 404 after delete
        d2 = requests.delete(f"{BASE_URL}/api/admin/bundles/{bid}",
                             headers=auth_headers, timeout=30)
        assert d2.status_code == 404


# ---------- Coupons ----------
class TestCoupons:
    def test_admin_coupons_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/admin/coupons", timeout=30)
        assert r.status_code == 401

    def test_create_validate_percent(self, auth_headers):
        code = f"TEST{uuid.uuid4().hex[:6].upper()}"
        payload = {"code": code, "percent_off": 10, "min_order": 0,
                   "max_uses": 0, "active": True, "description": "10% off"}
        r = requests.post(f"{BASE_URL}/api/admin/coupons", json=payload,
                          headers=auth_headers, timeout=30)
        assert r.status_code == 200, r.text
        assert r.json()["code"] == code

        # duplicate
        r2 = requests.post(f"{BASE_URL}/api/admin/coupons", json=payload,
                           headers=auth_headers, timeout=30)
        assert r2.status_code == 400

        # validate valid subtotal=20 → discount=2.00
        v = requests.post(f"{BASE_URL}/api/coupons/validate",
                          json={"code": code, "subtotal": 20}, timeout=30)
        assert v.status_code == 200, v.text
        data = v.json()
        assert data["valid"] is True
        assert abs(data["discount"] - 2.00) < 0.01

        # cleanup
        cid = r.json()["id"]
        requests.delete(f"{BASE_URL}/api/admin/coupons/{cid}",
                        headers=auth_headers, timeout=30)

    def test_validate_invalid_code(self):
        r = requests.post(f"{BASE_URL}/api/coupons/validate",
                          json={"code": "DOESNOTEXIST_xyz", "subtotal": 20}, timeout=30)
        assert r.status_code == 400
        assert "inv" in r.json().get("detail", "").lower() or "exp" in r.json().get("detail", "").lower()

    def test_validate_min_order(self, auth_headers):
        code = f"MIN{uuid.uuid4().hex[:6].upper()}"
        payload = {"code": code, "percent_off": 0, "fixed_off": 5.0,
                   "min_order": 50, "active": True}
        r = requests.post(f"{BASE_URL}/api/admin/coupons", json=payload,
                          headers=auth_headers, timeout=30)
        assert r.status_code == 200
        cid = r.json()["id"]

        # too-low subtotal
        v = requests.post(f"{BASE_URL}/api/coupons/validate",
                          json={"code": code, "subtotal": 20}, timeout=30)
        assert v.status_code == 400
        assert "50" in v.json().get("detail", "") or "mín" in v.json().get("detail", "").lower()

        # sufficient subtotal → discount=5.0 (fixed)
        v2 = requests.post(f"{BASE_URL}/api/coupons/validate",
                           json={"code": code, "subtotal": 60}, timeout=30)
        assert v2.status_code == 200
        assert abs(v2.json()["discount"] - 5.0) < 0.01

        # cleanup
        requests.delete(f"{BASE_URL}/api/admin/coupons/{cid}",
                        headers=auth_headers, timeout=30)


# ---------- Orders with coupon + delivery_slot + stock ----------
class TestOrderExtensions:
    def test_order_with_coupon_and_slot(self, auth_headers):
        code = f"ORD{uuid.uuid4().hex[:6].upper()}"
        r = requests.post(f"{BASE_URL}/api/admin/coupons",
                          json={"code": code, "percent_off": 10, "active": True},
                          headers=auth_headers, timeout=30)
        assert r.status_code == 200
        cid = r.json()["id"]

        prods = requests.get(f"{BASE_URL}/api/products", timeout=30).json()
        item = {"product_id": prods[0]["id"], "name": prods[0]["name"],
                "price": 10.0, "unit": prods[0]["unit"], "quantity": 2}
        payload = {
            "customer_name": "TEST_CouponBuyer",
            "phone": "912000000",
            "delivery_method": "pickup",
            "items": [item],
            "delivery_slot": "Manhã (09h-13h)",
            "coupon_code": code,
        }
        o = requests.post(f"{BASE_URL}/api/orders", json=payload, timeout=30)
        assert o.status_code == 200, o.text
        od = o.json()
        assert abs(od["subtotal"] - 20.00) < 0.01
        assert abs(od["discount"] - 2.00) < 0.01
        assert abs(od["total"] - 18.00) < 0.01
        assert od["delivery_slot"] == "Manhã (09h-13h)"
        assert od["coupon_code"] == code

        # used_count incremented
        time.sleep(0.5)
        lst = requests.get(f"{BASE_URL}/api/admin/coupons",
                           headers=auth_headers, timeout=30).json()
        match = [c for c in lst if c["code"] == code]
        assert match and match[0]["used_count"] >= 1

        # cleanup
        requests.delete(f"{BASE_URL}/api/admin/coupons/{cid}",
                        headers=auth_headers, timeout=30)

    def test_order_with_invalid_coupon(self):
        prods = requests.get(f"{BASE_URL}/api/products", timeout=30).json()
        item = {"product_id": prods[0]["id"], "name": prods[0]["name"],
                "price": prods[0]["price"], "unit": prods[0]["unit"], "quantity": 1}
        payload = {
            "customer_name": "TEST_BadCoupon",
            "phone": "9",
            "delivery_method": "pickup",
            "items": [item],
            "coupon_code": "NOPE_DOES_NOT_EXIST",
        }
        r = requests.post(f"{BASE_URL}/api/orders", json=payload, timeout=30)
        assert r.status_code == 400

    def test_stock_decrement_and_out_of_stock(self, auth_headers):
        # Create product with stock_quantity=2
        create = requests.post(f"{BASE_URL}/api/admin/products",
                               json={"name": "TEST_StockItem", "category": "mercearia",
                                     "price": 3.0, "unit": "un", "in_stock": True,
                                     "stock_quantity": 2},
                               headers=auth_headers, timeout=30)
        assert create.status_code == 200, create.text
        p = create.json()
        pid = p["id"]
        assert p["stock_quantity"] == 2

        # Place order for quantity=2 → stock goes to 0, in_stock=False
        payload = {
            "customer_name": "TEST_StockBuyer",
            "phone": "9",
            "delivery_method": "pickup",
            "items": [{"product_id": pid, "name": p["name"],
                       "price": 3.0, "unit": "un", "quantity": 2}],
        }
        o = requests.post(f"{BASE_URL}/api/orders", json=payload, timeout=30)
        assert o.status_code == 200, o.text

        time.sleep(0.5)
        g = requests.get(f"{BASE_URL}/api/products/{pid}", timeout=30)
        assert g.status_code == 200
        data = g.json()
        assert data["stock_quantity"] == 0
        assert data["in_stock"] is False

        # cleanup
        requests.delete(f"{BASE_URL}/api/admin/products/{pid}",
                        headers=auth_headers, timeout=30)


# ---------- Sitemap ----------
class TestSitemap:
    def test_sitemap_structure(self):
        r = requests.get(f"{BASE_URL}/api/sitemap", timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        for k in ("static", "products", "categories", "bundles"):
            assert k in data, f"missing key {k}"
        assert isinstance(data["static"], list)
        assert "/" in data["static"]
        assert isinstance(data["products"], list)
        assert len(data["products"]) > 0
        assert isinstance(data["categories"], list)
        assert isinstance(data["bundles"], list)


# ---------- Content new fields ----------
class TestContentNewFields:
    def test_content_has_new_fields(self):
        r = requests.get(f"{BASE_URL}/api/content", timeout=30)
        assert r.status_code == 200
        data = r.json()
        for k in ("promo_banner", "analytics", "seo"):
            assert k in data, f"missing {k}"
        # promo_banner shape
        pb = data["promo_banner"]
        for k in ("active", "text", "link", "bg_color", "text_color"):
            assert k in pb
        # analytics shape
        an = data["analytics"]
        assert "google_analytics_id" in an
        assert "meta_pixel_id" in an
        # seo shape
        seo = data["seo"]
        for k in ("site_title", "site_description", "og_image"):
            assert k in seo

    def test_put_content_with_new_fields(self, auth_headers):
        orig = requests.get(f"{BASE_URL}/api/content", timeout=30).json()
        modified = dict(orig)
        modified["promo_banner"] = {"active": True, "text": "TEST_PROMO_XYZ",
                                     "link": "/loja", "bg_color": "#ff0000",
                                     "text_color": "#ffffff"}
        modified["analytics"] = {"google_analytics_id": "G-TESTXYZ",
                                  "meta_pixel_id": "123456"}
        modified["seo"] = {"site_title": "TEST_TITLE", "site_description": "TEST_DESC",
                            "og_image": ""}
        p = requests.put(f"{BASE_URL}/api/admin/content", json=modified,
                         headers=auth_headers, timeout=30)
        assert p.status_code == 200, p.text

        g = requests.get(f"{BASE_URL}/api/content", timeout=30).json()
        assert g["promo_banner"]["text"] == "TEST_PROMO_XYZ"
        assert g["promo_banner"]["active"] is True
        assert g["analytics"]["google_analytics_id"] == "G-TESTXYZ"
        assert g["seo"]["site_title"] == "TEST_TITLE"

        # restore
        restore = dict(g)
        restore["promo_banner"] = orig.get("promo_banner", {"active": False, "text": "",
                                                             "link": "", "bg_color": "#C1292E",
                                                             "text_color": "#FDFBF7"})
        restore["analytics"] = orig.get("analytics", {"google_analytics_id": "",
                                                       "meta_pixel_id": ""})
        restore["seo"] = orig.get("seo", {"site_title": "", "site_description": "",
                                           "og_image": ""})
        requests.put(f"{BASE_URL}/api/admin/content", json=restore,
                     headers=auth_headers, timeout=30)
