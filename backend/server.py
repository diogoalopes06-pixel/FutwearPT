from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import logging
import bcrypt
import jwt
import asyncio
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal
import csv
import io
import secrets
import time
from collections import defaultdict, deque
from contextlib import asynccontextmanager

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, BackgroundTasks, UploadFile, File
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import DuplicateKeyError
from pydantic import BaseModel, Field, EmailStr, ConfigDict

from email_service import send_order_confirmation, send_order_ready, send_admin_new_order, send_order_status_update, send_payment_confirmed, send_password_reset_email
from push_service import send_push_to_all, send_push_to_user, VAPID_PUBLIC_KEY


# ---------- Setup ----------
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("futwearpt")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRES_MIN = int(os.environ.get("ACCESS_TOKEN_EXPIRES_MIN", "1440"))


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await seed()
    yield
    client.close()


app = FastAPI(title="FutWearPT API", lifespan=lifespan)
api = APIRouter(prefix="/api")
bearer_scheme = HTTPBearer(auto_error=False)
_rate_windows = defaultdict(deque)


def enforce_rate_limit(request: Request, bucket: str, limit: int, window_seconds: int) -> None:
    """Small per-process limiter. Use a shared limiter (e.g. Redis) when scaling to many workers."""
    client_ip = request.client.host if request.client else "unknown"
    key = f"{bucket}:{client_ip}"
    now = time.monotonic()
    hits = _rate_windows[key]
    while hits and hits[0] <= now - window_seconds:
        hits.popleft()
    if len(hits) >= limit:
        retry_after = max(1, int(window_seconds - (now - hits[0])))
        raise HTTPException(status_code=429, detail="Demasiados pedidos. Tente novamente mais tarde.", headers={"Retry-After": str(retry_after)})
    hits.append(now)


# ---------- Auth helpers ----------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRES_MIN),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_admin(creds: HTTPAuthorizationCredentials = Depends(bearer_scheme)) -> dict:
    if not creds or not creds.credentials:
        raise HTTPException(status_code=401, detail="Não autenticado")
    token = creds.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Sessão expirada")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")
    if payload.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Acesso negado")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Utilizador não encontrado")
    return user


async def get_current_user(creds: HTTPAuthorizationCredentials = Depends(bearer_scheme)) -> dict:
    if not creds or not creds.credentials:
        raise HTTPException(status_code=401, detail="Não autenticado")
    token = creds.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Sessão expirada")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Utilizador não encontrado")
    return user


async def get_current_customer(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "customer":
        raise HTTPException(status_code=403, detail="Acesso negado")
    return user


# ---------- Models ----------
class LoginInput(BaseModel):
    email: EmailStr
    password: str


class CustomerRegisterInput(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: Optional[str] = None
    address: Optional[str] = None
    avatar_url: Optional[str] = None


class CustomerUpdateInput(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    avatar_url: Optional[str] = None


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    password: str


class UserOut(BaseModel):
    id: str
    email: EmailStr
    name: str
    role: str
    phone: Optional[str] = ""
    address: Optional[str] = ""
    avatar_url: Optional[str] = ""


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class ProductIn(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    category: str  # clubes, selecoes, retro, treino, crianca, acessorios
    price: float = Field(ge=0, le=100000)
    unit: str = "un"  # un
    image: str = ""
    description: str = ""
    in_stock: bool = True
    featured: bool = False
    seasonal: bool = False
    bestseller: bool = False
    promotion: bool = False
    related_ids: List[str] = Field(default_factory=list)
    stock_quantity: Optional[float] = None  # None = unlimited; 0 = out of stock
    sizes: List[str] = Field(default_factory=lambda: ["S", "M", "L", "XL"])
    personalizable: bool = True
    season: str = "2026"


class Product(ProductIn):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ProductReviewIn(BaseModel):
    product_id: str
    name: str
    text: str
    stars: int = Field(default=5, ge=1, le=5)


class ProductReview(ProductReviewIn):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    approved: bool = False
    featured: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ReviewStatusUpdate(BaseModel):
    approved: Optional[bool] = None
    featured: Optional[bool] = None


class OrderItem(BaseModel):
    product_id: str
    name: str
    price: float = Field(ge=0)
    unit: str
    quantity: float = Field(gt=0, le=1000)
    size: Optional[str] = None
    custom_name: Optional[str] = None
    custom_number: Optional[str] = None


class OrderIn(BaseModel):
    customer_name: str = Field(min_length=2, max_length=120)
    phone: str = Field(min_length=6, max_length=30)
    email: Optional[EmailStr] = None
    delivery_method: Literal["delivery", "pickup"]
    address: Optional[str] = Field(default=None, max_length=500)
    notes: Optional[str] = Field(default=None, max_length=1000)
    items: List[OrderItem] = Field(min_length=1, max_length=100)
    delivery_slot: Optional[str] = None  # e.g. "Manhã (09h-13h)", "Tarde (14h-18h)", or specific
    coupon_code: Optional[str] = None
    payment_method: Literal["manual"] = "manual"
    client_order_id: Optional[str] = Field(default=None, min_length=20, max_length=100)


class Order(OrderIn):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    subtotal: float = 0.0
    discount: float = 0.0
    total: float = 0.0
    status: str = "pending"  # pending, confirmed, preparing, ready, delivered, cancelled
    payment_status: str = "pending"  # pending, paid, failed, refunded
    archived: bool = False
    archived_at: Optional[str] = None
    customer_avatar_url: Optional[str] = ""
    tracking_token: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class OrderStatusUpdate(BaseModel):
    status: Literal["pending", "confirmed", "preparing", "ready", "delivered", "cancelled"]


class PushSubscriptionIn(BaseModel):
    subscription: dict


# ---------- Bundles (cabazes) ----------
class BundleItem(BaseModel):
    name: str
    quantity: float = 1
    unit: str = "un"


class BundleIn(BaseModel):
    name: str
    description: str = ""
    price: float
    image: str = ""
    items: List[BundleItem] = Field(default_factory=list)
    active: bool = True
    featured: bool = False
    stock_quantity: Optional[int] = None  # None = sem limite; 0 = esgotado
    in_stock: bool = True
    badge: str = ""
    details: str = ""


class Bundle(BundleIn):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ---------- Coupons ----------
class CouponIn(BaseModel):
    code: str = Field(min_length=2, max_length=40)
    percent_off: int = Field(default=0, ge=0, le=100)
    fixed_off: float = Field(default=0.0, ge=0)
    min_order: float = Field(default=0.0, ge=0)
    max_uses: int = Field(default=0, ge=0)  # 0 = unlimited
    expires_at: Optional[str] = None  # ISO date
    active: bool = True
    description: str = ""


class Coupon(CouponIn):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    used_count: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CouponValidate(BaseModel):
    code: str = Field(min_length=2, max_length=40)
    subtotal: float = Field(ge=0, le=100000)



# ---------- Site content (CMS) ----------
class HeroContent(BaseModel):
    tagline: str = "FUTEBOL · PORTUGAL · 2026"
    title_part1: str = "Veste"
    title_emphasis: str = "a tua paixão"
    title_part2: str = "."
    subtitle: str = "Camisolas de futebol, modelos retro e equipamento de treino. Escolhe o tamanho, personaliza e compra online."
    image: str = "https://static.prod-images.emergentagent.com/jobs/29644c96-d4a1-4651-9cb8-e1e8ae32b23e/images/f98aea86f70724fbb9799d980b3ef521853eda75aad46dd1aff41ab887d01aff.png"
    cta_primary: str = "Ver camisolas"
    cta_secondary: str = "Sobre a FutWearPT"
    rating_value: str = "4.6"
    rating_label: str = "Paixão pelo futebol"


class AboutContent(BaseModel):
    tagline: str = "Sobre nós"
    title: str = "A tua paixão. A tua camisola."
    paragraph1: str = "A FutWearPT nasceu para juntar camisolas de futebol, cultura de bancada e personalização numa experiência de compra simples."
    paragraph2: str = "Escolhe o modelo, seleciona o tamanho, acrescenta nome e número e recebe a tua encomenda em Portugal."
    image: str = "https://static.prod-images.emergentagent.com/jobs/29644c96-d4a1-4651-9cb8-e1e8ae32b23e/images/eba9781416b8f4f38f11a3dcff467e1fdb4df4177b33d9d09aee2dc0ad093416.png"


class ContactContent(BaseModel):
    address_line1: str = "Av. Mário Soares 37 loja 1"
    address_line2: str = "2200-192 Abrantes"
    phone: str = "+351 241 402 897"
    email: str = "hello@futwearpt.pt"
    facebook_url: str = ""
    facebook_handle: str = ""
    hours_weekday_label: str = "Online"
    hours_weekday_time: str = "24/7"
    hours_weekend_label: str = "Encomendas"
    hours_weekend_time: str = "Sempre abertas"
    map_query: str = "Portugal"


class ReviewContent(BaseModel):
    name: str
    text: str
    stars: int = 5


class CategoryContent(BaseModel):
    slug: str
    name: str
    image: str = ""


class SiteContent(BaseModel):
    hero: HeroContent = Field(default_factory=HeroContent)
    about: AboutContent = Field(default_factory=AboutContent)
    contact: ContactContent = Field(default_factory=ContactContent)
    reviews: List[ReviewContent] = Field(default_factory=list)
    categories: List[CategoryContent] = Field(default_factory=list)
    cta_title: str = "Do drop à tua porta."
    cta_subtitle: str = "Preparação habitual em 24–48h úteis. Portes e opções apresentados no checkout."
    footer_tagline: str = "Camisolas de futebol, retro e treino. Personaliza a tua camisola e veste a tua paixão."
    promo_banner: "PromoBanner" = Field(default_factory=lambda: PromoBanner())
    analytics: "AnalyticsConfig" = Field(default_factory=lambda: AnalyticsConfig())
    seo: "SeoConfig" = Field(default_factory=lambda: SeoConfig())


class PromoBanner(BaseModel):
    active: bool = False
    text: str = ""
    link: str = ""
    bg_color: str = "#C1292E"
    text_color: str = "#FDFBF7"


class AnalyticsConfig(BaseModel):
    google_analytics_id: str = ""  # e.g. G-XXXXXXX
    meta_pixel_id: str = ""


class SeoConfig(BaseModel):
    site_title: str = "FutWearPT — Camisolas de Futebol"
    site_description: str = "Camisolas de futebol, retro e treino. Personaliza a tua camisola e compra online em Portugal."
    og_image: str = ""


# ---------- Auth routes ----------
@api.post("/auth/login", response_model=LoginResponse)
async def login(data: LoginInput, request: Request):
    enforce_rate_limit(request, "admin-login", 10, 15 * 60)
    email = data.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(data.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    token = create_access_token(user["id"], user["email"], user["role"])
    return LoginResponse(
        access_token=token,
        user=UserOut(id=user["id"], email=user["email"], name=user["name"], role=user["role"]),
    )


@api.get("/auth/me", response_model=UserOut)
async def auth_me(admin: dict = Depends(get_current_user)):
    return UserOut(**admin)


# ---------- Customer account routes ----------
@api.post("/customers/register", response_model=LoginResponse)
async def customer_register(data: CustomerRegisterInput, request: Request):
    enforce_rate_limit(request, "customer-register", 10, 60 * 60)
    email = data.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Já existe uma conta com este email")
    if len(data.password) < 6:
        raise HTTPException(status_code=400, detail="A password deve ter pelo menos 6 caracteres")
    user = {
        "id": str(uuid.uuid4()),
        "email": email,
        "name": data.name.strip() or email.split("@")[0],
        "phone": data.phone or "",
        "address": data.address or "",
        "role": "customer",
        "password_hash": hash_password(data.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user)
    token = create_access_token(user["id"], user["email"], user["role"])
    return LoginResponse(access_token=token, user=UserOut(id=user["id"], email=user["email"], name=user["name"], role=user["role"], phone=user.get("phone", ""), address=user.get("address", ""), avatar_url=user.get("avatar_url", "")))


@api.post("/customers/login", response_model=LoginResponse)
async def customer_login(data: LoginInput, request: Request):
    enforce_rate_limit(request, "customer-login", 15, 15 * 60)
    email = data.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or user.get("role") != "customer" or not verify_password(data.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    token = create_access_token(user["id"], user["email"], user["role"])
    return LoginResponse(access_token=token, user=UserOut(id=user["id"], email=user["email"], name=user["name"], role=user["role"], phone=user.get("phone", ""), address=user.get("address", ""), avatar_url=user.get("avatar_url", "")))


@api.get("/customers/me", response_model=UserOut)
async def customer_me(user: dict = Depends(get_current_customer)):
    return UserOut(**user)


@api.patch("/customers/me", response_model=UserOut)
async def customer_update(data: CustomerUpdateInput, user: dict = Depends(get_current_customer)):
    update = {}
    if data.name is not None and data.name.strip():
        update["name"] = data.name.strip()
    if data.phone is not None:
        update["phone"] = data.phone.strip()
    if data.address is not None:
        update["address"] = data.address.strip()
    if data.avatar_url is not None:
        update["avatar_url"] = data.avatar_url.strip()
    if update:
        await db.users.update_one({"id": user["id"]}, {"$set": update})
    updated = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    return UserOut(**updated)


@api.post("/customers/password-reset/request")
async def customer_password_reset_request(data: PasswordResetRequest, background: BackgroundTasks, request: Request):
    enforce_rate_limit(request, "password-reset", 5, 60 * 60)
    email = data.email.lower().strip()
    user = await db.users.find_one({"email": email, "role": "customer"}, {"_id": 0})
    # Do not reveal whether the email exists.
    if user:
        token = secrets.token_urlsafe(32)
        expires = datetime.now(timezone.utc) + timedelta(hours=1)
        await db.password_resets.insert_one({
            "token": token,
            "user_id": user["id"],
            "email": email,
            "expires_at": expires.isoformat(),
            "used": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        background.add_task(send_password_reset_email, email, token, user.get("name", "Cliente"))
    return {"ok": True, "message": "Se existir uma conta com esse email, vai receber instruções para recuperar a password."}


@api.post("/customers/password-reset/confirm")
async def customer_password_reset_confirm(data: PasswordResetConfirm, request: Request):
    enforce_rate_limit(request, "password-reset-confirm", 10, 60 * 60)
    if len(data.password) < 6:
        raise HTTPException(status_code=400, detail="A password deve ter pelo menos 6 caracteres")
    doc = await db.password_resets.find_one({"token": data.token, "used": False})
    if not doc:
        raise HTTPException(status_code=400, detail="Link inválido ou expirado")
    try:
        exp = datetime.fromisoformat(doc["expires_at"].replace("Z", "+00:00"))
    except Exception:
        exp = datetime.now(timezone.utc) - timedelta(seconds=1)
    if exp < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Link expirado")
    await db.users.update_one({"id": doc["user_id"]}, {"$set": {"password_hash": hash_password(data.password)}})
    await db.password_resets.update_one({"token": data.token}, {"$set": {"used": True, "used_at": datetime.now(timezone.utc).isoformat()}})
    return {"ok": True}


@api.get("/customers/orders", response_model=List[Order])
async def customer_orders(user: dict = Depends(get_current_customer)):
    docs = await db.orders.find({"email": user["email"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return docs


# ---------- Public products ----------
@api.get("/products", response_model=List[Product])
async def list_products(category: Optional[str] = None, featured: Optional[bool] = None):
    await ensure_default_catalog()
    q: dict = {}
    if category:
        q["category"] = category
    if featured is not None:
        q["featured"] = featured
    docs = await db.products.find(q, {"_id": 0}).sort("name", 1).to_list(500)
    for d in docs:
        if isinstance(d.get("created_at"), str):
            d["created_at"] = datetime.fromisoformat(d["created_at"])
    return docs


@api.get("/products/{pid}", response_model=Product)
async def get_product(pid: str):
    await ensure_default_catalog()
    doc = await db.products.find_one({"id": pid}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    if isinstance(doc.get("created_at"), str):
        doc["created_at"] = datetime.fromisoformat(doc["created_at"])
    return doc


@api.get("/products/{pid}/reviews", response_model=List[ProductReview])
async def list_product_reviews(pid: str):
    docs = await db.product_reviews.find({"product_id": pid, "approved": True}, {"_id": 0}).sort("created_at", -1).to_list(100)
    for d in docs:
        if isinstance(d.get("created_at"), str):
            d["created_at"] = datetime.fromisoformat(d["created_at"])
    return docs


@api.post("/products/{pid}/reviews", response_model=ProductReview)
async def create_product_review(pid: str, data: ProductReviewIn, request: Request):
    enforce_rate_limit(request, "reviews", 10, 60 * 60)
    exists = await db.products.find_one({"id": pid}, {"_id": 1})
    if not exists:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    review = ProductReview(**{**data.model_dump(), "product_id": pid})
    doc = review.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.product_reviews.insert_one(doc)
    return review


@api.get("/admin/product-reviews", response_model=List[ProductReview])
async def admin_list_product_reviews(admin=Depends(get_current_admin)):
    docs = await db.product_reviews.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    for d in docs:
        if isinstance(d.get("created_at"), str):
            d["created_at"] = datetime.fromisoformat(d["created_at"])
    return docs


@api.patch("/admin/product-reviews/{rid}", response_model=ProductReview)
async def admin_update_product_review(rid: str, data: ReviewStatusUpdate, admin=Depends(get_current_admin)):
    update = {k: v for k, v in data.model_dump().items() if v is not None}
    if update:
        await db.product_reviews.update_one({"id": rid}, {"$set": update})
    doc = await db.product_reviews.find_one({"id": rid}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Avaliação não encontrada")
    if isinstance(doc.get("created_at"), str):
        doc["created_at"] = datetime.fromisoformat(doc["created_at"])
    return doc


@api.delete("/admin/product-reviews/{rid}")
async def admin_delete_product_review(rid: str, admin=Depends(get_current_admin)):
    res = await db.product_reviews.delete_one({"id": rid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Avaliação não encontrada")
    return {"ok": True}


@api.get("/categories")
async def list_categories():
    return [
        {"slug": "clubes", "name": "Clubes"},
        {"slug": "selecoes", "name": "Seleções"},
        {"slug": "retro", "name": "Retro"},
        {"slug": "treino", "name": "Treino"},
        {"slug": "crianca", "name": "Criança"},
        {"slug": "acessorios", "name": "Acessórios"},
    ]


# ---------- Public orders ----------
async def _validate_coupon_internal(code: str, subtotal: float):
    """Returns (discount, coupon_doc) or raises HTTPException."""
    code = code.strip().upper()
    if not code:
        return 0.0, None
    coupon = await db.coupons.find_one({"code": code, "active": True}, {"_id": 0})
    if not coupon:
        raise HTTPException(status_code=400, detail="Código inválido ou expirado")
    if coupon.get("expires_at"):
        try:
            exp = datetime.fromisoformat(coupon["expires_at"].replace("Z", "+00:00"))
            if exp < datetime.now(timezone.utc):
                raise HTTPException(status_code=400, detail="Código expirado")
        except (ValueError, TypeError):
            pass
    if coupon.get("max_uses", 0) > 0 and coupon.get("used_count", 0) >= coupon["max_uses"]:
        raise HTTPException(status_code=400, detail="Código já não disponível")
    if subtotal < coupon.get("min_order", 0):
        raise HTTPException(status_code=400, detail=f"Encomenda mínima €{coupon['min_order']:.2f} para este código")

    discount = 0.0
    if coupon.get("percent_off", 0) > 0:
        discount = round(subtotal * coupon["percent_off"] / 100, 2)
    elif coupon.get("fixed_off", 0) > 0:
        discount = min(coupon["fixed_off"], subtotal)
    return discount, coupon


@api.post("/coupons/validate")
async def validate_coupon(data: CouponValidate, request: Request):
    enforce_rate_limit(request, "coupon", 30, 60)
    discount, coupon = await _validate_coupon_internal(data.code, data.subtotal)
    return {
        "valid": True,
        "discount": discount,
        "code": coupon["code"],
        "description": coupon.get("description", ""),
    }


@api.post("/orders", response_model=Order)
async def create_order(data: OrderIn, background: BackgroundTasks, request: Request):
    await ensure_default_catalog()
    enforce_rate_limit(request, "orders", 20, 60 * 60)
    if data.client_order_id:
        existing_order = await db.orders.find_one({"client_order_id": data.client_order_id}, {"_id": 0})
        if existing_order:
            if isinstance(existing_order.get("created_at"), str):
                existing_order["created_at"] = datetime.fromisoformat(existing_order["created_at"])
            return Order(**existing_order)
    if data.delivery_method == "delivery" and not (data.address and data.address.strip()):
        raise HTTPException(status_code=400, detail="Indique a morada de entrega")

    # Never trust names, units, or prices supplied by the browser. Build every line
    # from the catalogue and retain only the requested quantity.
    canonical_items = []
    for it in data.items:
        if str(it.product_id).startswith("bundle-"):
            if not float(it.quantity).is_integer():
                raise HTTPException(status_code=400, detail="A quantidade de um cabaz tem de ser um número inteiro")
            bundle_id = str(it.product_id).replace("bundle-", "", 1)
            bundle = await db.bundles.find_one({"id": bundle_id}, {"_id": 0})
            if not bundle:
                raise HTTPException(status_code=400, detail="Um dos cabazes já não está disponível")
            if not bundle.get("active", True) or not bundle.get("in_stock", True):
                raise HTTPException(status_code=400, detail=f"'{bundle['name']}' está esgotado")
            canonical_items.append(OrderItem(product_id=f"bundle-{bundle_id}", name=bundle["name"], price=bundle["price"], unit="un", quantity=it.quantity))
            continue

        product = await db.products.find_one({"id": it.product_id}, {"_id": 0})
        if not product:
            raise HTTPException(status_code=400, detail="Um dos produtos já não está disponível")
        if not product.get("in_stock", True):
            raise HTTPException(status_code=400, detail=f"'{product['name']}' está esgotado")
        canonical_items.append(OrderItem(product_id=product["id"], name=product["name"], price=product["price"], unit=product.get("unit", "un"), quantity=it.quantity, size=it.size, custom_name=it.custom_name, custom_number=it.custom_number))

    subtotal = round(sum(it.price * it.quantity for it in canonical_items), 2)
    discount = 0.0
    coupon_doc = None
    if data.coupon_code:
        discount, coupon_doc = await _validate_coupon_internal(data.coupon_code, subtotal)
    total = round(max(0, subtotal - discount), 2)

    customer_avatar_url = ""
    if data.email:
        customer_for_avatar = await db.users.find_one({"email": data.email.lower().strip()}, {"_id": 0, "avatar_url": 1})
        customer_avatar_url = customer_for_avatar.get("avatar_url", "") if customer_for_avatar else ""

    tracking_token = secrets.token_urlsafe(32)
    order = Order(**data.model_dump(exclude={"items"}), items=canonical_items, subtotal=subtotal, discount=discount, total=total, customer_avatar_url=customer_avatar_url, tracking_token=tracking_token)
    if coupon_doc:
        order.coupon_code = coupon_doc["code"]  # normalise to upper-case
    doc = order.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    # Reserve finite stock atomically. Roll back every earlier reservation if a
    # later line cannot be fulfilled.
    reservations = []
    for it in canonical_items:
        if str(it.product_id).startswith("bundle-"):
            bundle_id = str(it.product_id).replace("bundle-", "", 1)
            finite = await db.bundles.find_one({"id": bundle_id, "stock_quantity": {"$ne": None}}, {"_id": 0, "stock_quantity": 1, "name": 1})
            if finite:
                reserved = await db.bundles.update_one(
                    {"id": bundle_id, "active": True, "in_stock": True, "stock_quantity": {"$gte": it.quantity}},
                    {"$inc": {"stock_quantity": -it.quantity}},
                )
                if reserved.modified_count == 0:
                    for collection, item_id, qty in reservations:
                        await collection.update_one({"id": item_id}, {"$inc": {"stock_quantity": qty}, "$set": {"in_stock": True, "active": True}})
                    raise HTTPException(status_code=409, detail=f"Stock insuficiente de '{it.name}'")
                reservations.append((db.bundles, bundle_id, it.quantity))
        else:
            finite = await db.products.find_one({"id": it.product_id, "stock_quantity": {"$ne": None}}, {"_id": 0, "stock_quantity": 1})
            if finite:
                reserved = await db.products.update_one(
                    {"id": it.product_id, "in_stock": True, "stock_quantity": {"$gte": it.quantity}},
                    {"$inc": {"stock_quantity": -it.quantity}},
                )
                if reserved.modified_count == 0:
                    for collection, item_id, qty in reservations:
                        await collection.update_one({"id": item_id}, {"$inc": {"stock_quantity": qty}, "$set": {"in_stock": True, "active": True}})
                    raise HTTPException(status_code=409, detail=f"Stock insuficiente de '{it.name}'")
                reservations.append((db.products, it.product_id, it.quantity))

    coupon_reserved = False
    if coupon_doc:
        coupon_filter = {"code": coupon_doc["code"], "active": True}
        if coupon_doc.get("max_uses", 0) > 0:
            coupon_filter["used_count"] = {"$lt": coupon_doc["max_uses"]}
        coupon_result = await db.coupons.update_one(coupon_filter, {"$inc": {"used_count": 1}})
        coupon_reserved = coupon_result.modified_count == 1
        if not coupon_reserved:
            for collection, item_id, qty in reservations:
                await collection.update_one({"id": item_id}, {"$inc": {"stock_quantity": qty}, "$set": {"in_stock": True, "active": True}})
            raise HTTPException(status_code=409, detail="Código já não disponível")

    try:
        await db.orders.insert_one(doc)
    except DuplicateKeyError:
        for collection, item_id, qty in reservations:
            await collection.update_one({"id": item_id}, {"$inc": {"stock_quantity": qty}, "$set": {"in_stock": True, "active": True}})
        if coupon_reserved:
            await db.coupons.update_one({"code": coupon_doc["code"]}, {"$inc": {"used_count": -1}})
        if data.client_order_id:
            existing_order = await db.orders.find_one({"client_order_id": data.client_order_id}, {"_id": 0})
            if existing_order:
                if isinstance(existing_order.get("created_at"), str):
                    existing_order["created_at"] = datetime.fromisoformat(existing_order["created_at"])
                return Order(**existing_order)
        raise
    except Exception:
        for collection, item_id, qty in reservations:
            await collection.update_one({"id": item_id}, {"$inc": {"stock_quantity": qty}, "$set": {"in_stock": True, "active": True}})
        if coupon_reserved:
            await db.coupons.update_one({"code": coupon_doc["code"]}, {"$inc": {"used_count": -1}})
        raise

    # If this email belongs to a customer account, keep basic profile data updated.
    if doc.get("email"):
        await db.users.update_one(
            {"email": doc["email"].lower().strip(), "role": "customer"},
            {"$set": {
                "name": doc.get("customer_name", ""),
                "phone": doc.get("phone", ""),
                "address": doc.get("address", "") or "",
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }},
        )

    # Hide depleted catalogue entries after the reservation succeeds.
    for collection, item_id, _qty in reservations:
        depleted = await collection.find_one({"id": item_id, "stock_quantity": {"$lte": 0}}, {"_id": 0, "id": 1})
        if depleted:
            update = {"in_stock": False}
            if collection.name == db.bundles.name:
                update["active"] = False
            await collection.update_one({"id": item_id}, {"$set": update})

    # Notifications
    background.add_task(send_admin_new_order, doc)
    background.add_task(
        send_push_to_all,
        db,
        {
            "title": "🍎 Nova encomenda recebida",
            "body": f"{order.customer_name} · €{total:.2f} · {len(canonical_items)} produto(s)",
            "tag": f"order-{order.id}",
            "url": "/admin",
            "order_id": order.id,
        },
    )
    if order.email:
        background.add_task(send_order_confirmation, doc)
    return order


@api.get("/orders/{oid}", response_model=Order)
async def get_order(oid: str, token: Optional[str] = None, creds: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
    doc = await db.orders.find_one({"id": oid}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Encomenda não encontrada")
    # Legacy orders have no tracking token. New orders require either the secret
    # link or an authenticated account that owns the order.
    expected = doc.get("tracking_token")
    authorised = bool(expected and token and secrets.compare_digest(expected, token))
    if not authorised and creds and creds.credentials:
        try:
            payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            authorised = payload.get("role") == "admin" or payload.get("email", "").lower() == (doc.get("email") or "").lower()
        except jwt.InvalidTokenError:
            authorised = False
    if expected and not authorised:
        raise HTTPException(status_code=404, detail="Encomenda não encontrada")
    if isinstance(doc.get("created_at"), str):
        doc["created_at"] = datetime.fromisoformat(doc["created_at"])
    return doc


# ---------- Admin: products ----------
@api.post("/admin/products", response_model=Product)
async def admin_create_product(data: ProductIn, admin=Depends(get_current_admin)):
    p = Product(**data.model_dump())
    doc = p.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.products.insert_one(doc)
    return p


@api.put("/admin/products/{pid}", response_model=Product)
async def admin_update_product(pid: str, data: ProductIn, admin=Depends(get_current_admin)):
    existing = await db.products.find_one({"id": pid}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    update = data.model_dump()
    await db.products.update_one({"id": pid}, {"$set": update})
    merged = {**existing, **update}
    if isinstance(merged.get("created_at"), str):
        merged["created_at"] = datetime.fromisoformat(merged["created_at"])
    return Product(**merged)


@api.delete("/admin/products/{pid}")
async def admin_delete_product(pid: str, admin=Depends(get_current_admin)):
    res = await db.products.delete_one({"id": pid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    return {"ok": True}


# ---------- Admin: orders ----------
@api.get("/admin/orders", response_model=List[Order])
async def admin_list_orders(status: Optional[str] = None, view: str = "active", admin=Depends(get_current_admin)):
    # Auto-archive delivered/cancelled orders older than 7 days.
    cutoff = datetime.now(timezone.utc) - timedelta(days=7)
    await db.orders.update_many(
        {
            "archived": {"$ne": True},
            "status": {"$in": ["delivered", "cancelled"]},
            "created_at": {"$lt": cutoff.isoformat()},
        },
        {"$set": {"archived": True, "archived_at": datetime.now(timezone.utc).isoformat()}},
    )

    q: dict = {}
    if status:
        q["status"] = status
    if view == "archive":
        q["archived"] = True
    elif view == "active":
        q["archived"] = {"$ne": True}

    docs = await db.orders.find(q, {"_id": 0}).sort("created_at", -1).to_list(1000)
    emails = [d.get("email", "").lower().strip() for d in docs if d.get("email")]
    users_by_email = {}
    if emails:
        users = await db.users.find({"email": {"$in": emails}}, {"_id": 0, "email": 1, "avatar_url": 1}).to_list(1000)
        users_by_email = {u.get("email"): u.get("avatar_url", "") for u in users}
    for d in docs:
        if d.get("email"):
            d["customer_avatar_url"] = users_by_email.get(d.get("email", "").lower().strip(), d.get("customer_avatar_url", ""))
        if isinstance(d.get("created_at"), str):
            d["created_at"] = datetime.fromisoformat(d["created_at"])
    return docs


@api.patch("/admin/orders/{oid}/status", response_model=Order)
async def admin_update_order_status(oid: str, data: OrderStatusUpdate, background: BackgroundTasks, admin=Depends(get_current_admin)):
    res = await db.orders.update_one({"id": oid}, {"$set": {"status": data.status}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Encomenda não encontrada")
    doc = await db.orders.find_one({"id": oid}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Encomenda não encontrada")

    # Email automático ao cliente quando o estado muda
    if doc.get("email") and data.status in ["confirmed", "preparing", "ready", "delivered", "cancelled"]:
        background.add_task(send_order_status_update, doc)

    # Push para os administradores quando há atualização importante
    background.add_task(
        send_push_to_all,
        db,
        {
            "title": "Estado da encomenda atualizado",
            "body": f"#{doc['id'][:8].upper()} → {data.status}",
            "tag": f"order-status-{doc['id']}",
            "url": "/admin",
            "order_id": doc["id"],
        },
    )

    customer_user = None
    if doc.get("email"):
        customer_user = await db.users.find_one({"email": doc["email"].lower().strip(), "role": "customer"}, {"_id": 0})
    if customer_user:
        status_labels = {
            "confirmed": "confirmada",
            "preparing": "a ser preparada",
            "ready": "pronta",
            "delivered": "entregue",
            "cancelled": "cancelada",
            "pending": "pendente",
        }
        background.add_task(
            send_push_to_user,
            db,
            customer_user["id"],
            {
                "title": "Atualização da sua encomenda",
                "body": f"A encomenda #{doc['id'][:8].upper()} está {status_labels.get(data.status, data.status)}.",
                "tag": f"customer-order-{doc['id']}-{data.status}",
                "url": f"/encomenda/{doc['id']}",
                "order_id": doc["id"],
            },
        )

    if isinstance(doc.get("created_at"), str):
        doc["created_at"] = datetime.fromisoformat(doc["created_at"])
    return doc




class PaymentStatusUpdate(BaseModel):
    payment_status: Literal["pending", "paid", "failed", "refunded"]


@api.patch("/admin/orders/{oid}/payment", response_model=Order)
async def admin_update_payment_status(oid: str, data: PaymentStatusUpdate, background: BackgroundTasks, admin=Depends(get_current_admin)):
    res = await db.orders.update_one({"id": oid}, {"$set": {"payment_status": data.payment_status}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Encomenda não encontrada")
    doc = await db.orders.find_one({"id": oid}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Encomenda não encontrada")

    if data.payment_status == "paid" and doc.get("email"):
        background.add_task(send_payment_confirmed, doc)

    background.add_task(
        send_push_to_all,
        db,
        {
            "title": "Pagamento atualizado",
            "body": f"#{doc['id'][:8].upper()} → {data.payment_status}",
            "tag": f"order-payment-{doc['id']}",
            "url": "/admin",
            "order_id": doc["id"],
        },
    )

    customer_user = None
    if doc.get("email"):
        customer_user = await db.users.find_one({"email": doc["email"].lower().strip(), "role": "customer"}, {"_id": 0})
    if customer_user and data.payment_status == "paid":
        background.add_task(
            send_push_to_user,
            db,
            customer_user["id"],
            {
                "title": "Pagamento confirmado",
                "body": f"O pagamento da encomenda #{doc['id'][:8].upper()} foi confirmado.",
                "tag": f"customer-payment-{doc['id']}",
                "url": f"/encomenda/{doc['id']}",
                "order_id": doc["id"],
            },
        )

    if isinstance(doc.get("created_at"), str):
        doc["created_at"] = datetime.fromisoformat(doc["created_at"])
    return doc

@api.post("/admin/orders/{oid}/notify-ready")
async def admin_notify_ready(oid: str, background: BackgroundTasks, admin=Depends(get_current_admin)):
    doc = await db.orders.find_one({"id": oid}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Encomenda não encontrada")
    if not doc.get("email"):
        raise HTTPException(status_code=400, detail="Esta encomenda não tem email registado")
    # Update status to ready (idempotent)
    await db.orders.update_one({"id": oid}, {"$set": {"status": "ready"}})
    doc["status"] = "ready"
    background.add_task(send_order_ready, doc)
    return {"ok": True, "message": f"Email enviado para {doc['email']}"}


@api.patch("/admin/orders/{oid}/archive", response_model=Order)
async def admin_archive_order(oid: str, admin=Depends(get_current_admin)):
    res = await db.orders.update_one({"id": oid}, {"$set": {"archived": True, "archived_at": datetime.now(timezone.utc).isoformat()}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Encomenda não encontrada")
    doc = await db.orders.find_one({"id": oid}, {"_id": 0})
    if isinstance(doc.get("created_at"), str):
        doc["created_at"] = datetime.fromisoformat(doc["created_at"])
    return doc


@api.patch("/admin/orders/{oid}/unarchive", response_model=Order)
async def admin_unarchive_order(oid: str, admin=Depends(get_current_admin)):
    res = await db.orders.update_one({"id": oid}, {"$set": {"archived": False}, "$unset": {"archived_at": ""}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Encomenda não encontrada")
    doc = await db.orders.find_one({"id": oid}, {"_id": 0})
    if isinstance(doc.get("created_at"), str):
        doc["created_at"] = datetime.fromisoformat(doc["created_at"])
    return doc


@api.get("/admin/stats")
async def admin_stats(admin=Depends(get_current_admin)):
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    (status_agg, total_rev_agg, today_agg, month_agg, daily_agg, monthly_agg, top_products_agg, low_stock_agg, product_count) = await asyncio.gather(
        db.orders.aggregate([{"$group": {"_id": "$status", "count": {"$sum": 1}}}]).to_list(20),
        db.orders.aggregate([{"$match": {"status": {"$ne": "cancelled"}}}, {"$group": {"_id": None, "total": {"$sum": "$total"}}}]).to_list(1),
        db.orders.aggregate([{"$match": {"status": {"$ne": "cancelled"}, "created_at": {"$gte": today_start.isoformat()}}}, {"$group": {"_id": None, "orders": {"$sum": 1}, "revenue": {"$sum": "$total"}}}]).to_list(1),
        db.orders.aggregate([{"$match": {"status": {"$ne": "cancelled"}, "created_at": {"$gte": month_start.isoformat()}}}, {"$group": {"_id": None, "orders": {"$sum": 1}, "revenue": {"$sum": "$total"}}}]).to_list(1),
        db.orders.aggregate([{"$match": {"status": {"$ne": "cancelled"}}}, {"$group": {"_id": {"$substr": ["$created_at", 0, 10]}, "orders": {"$sum": 1}, "revenue": {"$sum": "$total"}}}, {"$sort": {"_id": -1}}, {"$limit": 30}]).to_list(30),
        db.orders.aggregate([{"$match": {"status": {"$ne": "cancelled"}}}, {"$group": {"_id": {"$substr": ["$created_at", 0, 7]}, "orders": {"$sum": 1}, "revenue": {"$sum": "$total"}}}, {"$sort": {"_id": -1}}, {"$limit": 12}]).to_list(12),
        db.orders.aggregate([{"$match": {"status": {"$ne": "cancelled"}}}, {"$unwind": "$items"}, {"$group": {"_id": {"$ifNull": ["$items.product_id", "$items.name"]}, "product_id": {"$first": "$items.product_id"}, "name": {"$first": "$items.name"}, "quantity": {"$sum": "$items.quantity"}, "revenue": {"$sum": {"$multiply": ["$items.price", "$items.quantity"]}}}}, {"$sort": {"revenue": -1}}, {"$limit": 10}]).to_list(10),
        db.products.aggregate([{"$match": {"stock_quantity": {"$lte": 5, "$ne": None}}}, {"$project": {"_id": 0, "id": 1, "name": 1, "stock_quantity": 1, "unit": 1}}, {"$sort": {"stock_quantity": 1}}, {"$limit": 20}]).to_list(20),
        db.products.count_documents({}),
    )

    status_counts = {s: 0 for s in ["pending", "confirmed", "preparing", "ready", "delivered", "cancelled"]}
    total_orders = 0
    for s in status_agg:
        status_counts[s["_id"]] = s["count"]
        total_orders += s["count"]

    return {
        "total_orders": total_orders,
        "pending": status_counts["pending"],
        "confirmed": status_counts["confirmed"],
        "preparing": status_counts["preparing"],
        "ready": status_counts["ready"],
        "delivered": status_counts["delivered"],
        "cancelled": status_counts["cancelled"],
        "products": product_count,
        "total_revenue": round(total_rev_agg[0]["total"] if total_rev_agg else 0, 2),
        "today_orders": today_agg[0]["orders"] if today_agg else 0,
        "today_revenue": round(today_agg[0]["revenue"] if today_agg else 0, 2),
        "month_orders": month_agg[0]["orders"] if month_agg else 0,
        "month_revenue": round(month_agg[0]["revenue"] if month_agg else 0, 2),
        "daily_sales": sorted([{"date": d["_id"], "orders": d["orders"], "revenue": round(d["revenue"], 2)} for d in daily_agg], key=lambda x: x["date"]),
        "monthly_sales": sorted([{"month": d["_id"], "orders": d["orders"], "revenue": round(d["revenue"], 2)} for d in monthly_agg], key=lambda x: x["month"]),
        "top_products": [{"product_id": d.get("product_id", ""), "name": d.get("name", "Produto"), "quantity": round(d["quantity"], 2), "revenue": round(d["revenue"], 2)} for d in top_products_agg],
        "low_stock": low_stock_agg,
    }

@api.get("/admin/orders/export.csv")
async def admin_export_orders_csv(admin=Depends(get_current_admin)):
    docs = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(5000)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["referencia", "data", "cliente", "telefone", "email", "metodo_entrega", "pagamento", "estado_pagamento", "estado", "subtotal", "desconto", "total", "produtos", "morada", "notas"])
    for order in docs:
        products = "; ".join([f"{it.get('name', '')} x {it.get('quantity', '')}{' kg' if it.get('unit') == 'kg' else ''}" for it in order.get("items", [])])
        writer.writerow([
            str(order.get("id", ""))[:8].upper(),
            order.get("created_at", ""),
            order.get("customer_name", ""),
            order.get("phone", ""),
            order.get("email", ""),
            order.get("delivery_method", ""),
            order.get("payment_method", "manual"),
            order.get("payment_status", "pending"),
            order.get("status", ""),
            order.get("subtotal", 0),
            order.get("discount", 0),
            order.get("total", 0),
            products,
            order.get("address", ""),
            order.get("notes", ""),
        ])
    output.seek(0)
    filename = f"encomendas-{datetime.now(timezone.utc).strftime('%Y-%m-%d')}.csv"
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv; charset=utf-8", headers={"Content-Disposition": f"attachment; filename={filename}"})


@api.get("/")
async def root():
    return {"app": "FutWearPT", "status": "ok"}


# ---------- Bundles (cabazes) ----------
@api.get("/bundles", response_model=List[Bundle])
async def list_bundles(active: Optional[bool] = True):
    q = {"active": True} if active else {}
    docs = await db.bundles.find(q, {"_id": 0}).sort("name", 1).to_list(200)
    for d in docs:
        if isinstance(d.get("created_at"), str):
            d["created_at"] = datetime.fromisoformat(d["created_at"])
    return docs


@api.get("/bundles/{bid}", response_model=Bundle)
async def get_bundle(bid: str):
    doc = await db.bundles.find_one({"id": bid}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Cabaz não encontrado")
    if isinstance(doc.get("created_at"), str):
        doc["created_at"] = datetime.fromisoformat(doc["created_at"])
    return doc


@api.post("/admin/bundles", response_model=Bundle)
async def admin_create_bundle(data: BundleIn, admin=Depends(get_current_admin)):
    b = Bundle(**data.model_dump())
    doc = b.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.bundles.insert_one(doc)
    return b


@api.put("/admin/bundles/{bid}", response_model=Bundle)
async def admin_update_bundle(bid: str, data: BundleIn, admin=Depends(get_current_admin)):
    existing = await db.bundles.find_one({"id": bid}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Cabaz não encontrado")
    update = data.model_dump()
    await db.bundles.update_one({"id": bid}, {"$set": update})
    merged = {**existing, **update}
    if isinstance(merged.get("created_at"), str):
        merged["created_at"] = datetime.fromisoformat(merged["created_at"])
    return Bundle(**merged)


@api.delete("/admin/bundles/{bid}")
async def admin_delete_bundle(bid: str, admin=Depends(get_current_admin)):
    res = await db.bundles.delete_one({"id": bid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Cabaz não encontrado")
    return {"ok": True}


# ---------- Coupons ----------
@api.get("/admin/coupons", response_model=List[Coupon])
async def admin_list_coupons(admin=Depends(get_current_admin)):
    docs = await db.coupons.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    for d in docs:
        if isinstance(d.get("created_at"), str):
            d["created_at"] = datetime.fromisoformat(d["created_at"])
    return docs


@api.post("/admin/coupons", response_model=Coupon)
async def admin_create_coupon(data: CouponIn, admin=Depends(get_current_admin)):
    code = data.code.strip().upper()
    if await db.coupons.find_one({"code": code}):
        raise HTTPException(status_code=400, detail="Já existe um código com este nome")
    payload = data.model_dump()
    payload["code"] = code
    c = Coupon(**payload)
    doc = c.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.coupons.insert_one(doc)
    return c


@api.put("/admin/coupons/{cid}", response_model=Coupon)
async def admin_update_coupon(cid: str, data: CouponIn, admin=Depends(get_current_admin)):
    existing = await db.coupons.find_one({"id": cid}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Código não encontrado")
    update = data.model_dump()
    update["code"] = update["code"].strip().upper()
    await db.coupons.update_one({"id": cid}, {"$set": update})
    merged = {**existing, **update}
    if isinstance(merged.get("created_at"), str):
        merged["created_at"] = datetime.fromisoformat(merged["created_at"])
    return Coupon(**merged)


@api.delete("/admin/coupons/{cid}")
async def admin_delete_coupon(cid: str, admin=Depends(get_current_admin)):
    res = await db.coupons.delete_one({"id": cid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Código não encontrado")
    return {"ok": True}


# ---------- Sitemap ----------
from fastapi.responses import Response


@api.get("/sitemap")
async def sitemap_data():
    products = await db.products.find({}, {"_id": 0, "id": 1, "category": 1}).to_list(1000)
    return {
        "static": ["/", "/loja", "/sobre", "/contactos"],
        "products": [p["id"] for p in products],
        "categories": list({p["category"] for p in products}),
    }


# ---------- Push notifications ----------
@api.get("/push/vapid-public-key")
async def push_public_key():
    return {"key": VAPID_PUBLIC_KEY}


@api.post("/admin/push/subscribe")
async def admin_push_subscribe(data: PushSubscriptionIn, admin=Depends(get_current_admin)):
    sub = data.subscription
    endpoint = sub.get("endpoint")
    if not endpoint:
        raise HTTPException(status_code=400, detail="Subscrição inválida")
    await db.push_subscriptions.update_one(
        {"subscription.endpoint": endpoint},
        {"$set": {
            "subscription": sub,
            "user_id": admin["id"],
            "user_email": admin.get("email"),
            "role": "admin",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )
    return {"ok": True}


@api.post("/admin/push/unsubscribe")
async def admin_push_unsubscribe(data: PushSubscriptionIn, admin=Depends(get_current_admin)):
    endpoint = data.subscription.get("endpoint")
    if endpoint:
        await db.push_subscriptions.delete_many({"subscription.endpoint": endpoint})
    return {"ok": True}


@api.post("/admin/push/test")
async def admin_push_test(admin=Depends(get_current_admin)):
    res = await send_push_to_all(
        db,
        {"title": "🔔 Teste de notificação", "body": "As notificações estão a funcionar!", "url": "/admin"},
    )
    return res




@api.post("/customers/push/subscribe")
async def customer_push_subscribe(data: PushSubscriptionIn, customer=Depends(get_current_customer)):
    sub = data.subscription
    endpoint = sub.get("endpoint")
    if not endpoint:
        raise HTTPException(status_code=400, detail="Subscrição inválida")
    await db.push_subscriptions.update_one(
        {"subscription.endpoint": endpoint},
        {"$set": {
            "subscription": sub,
            "user_id": customer["id"],
            "user_email": customer.get("email"),
            "role": "customer",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )
    return {"ok": True}


@api.post("/customers/push/unsubscribe")
async def customer_push_unsubscribe(data: PushSubscriptionIn, customer=Depends(get_current_customer)):
    endpoint = data.subscription.get("endpoint")
    if endpoint:
        await db.push_subscriptions.delete_many({
            "subscription.endpoint": endpoint,
            "user_id": customer["id"],
            "role": "customer",
        })
    return {"ok": True}


@api.post("/customers/push/test")
async def customer_push_test(customer=Depends(get_current_customer)):
    return await send_push_to_user(
        db,
        customer["id"],
        {
            "title": "🔔 Notificações ativas",
            "body": "Vai receber novidades sobre as suas encomendas aqui.",
            "url": "/minha-conta",
            "tag": "customer-push-test",
        },
    )

# ---------- Site content (CMS) ----------
@api.get("/content", response_model=SiteContent)
async def get_content():
    doc = await db.site_content.find_one({"id": "main"}, {"_id": 0, "id": 0})
    if not doc:
        return SiteContent()
    return SiteContent(**doc)


@api.put("/admin/content", response_model=SiteContent)
async def admin_update_content(data: SiteContent, admin=Depends(get_current_admin)):
    payload = data.model_dump()
    payload["id"] = "main"
    payload["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.site_content.update_one({"id": "main"}, {"$set": payload}, upsert=True)
    return data


import base64

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_UPLOAD_BYTES = 4 * 1024 * 1024  # 4 MB


@api.post("/admin/upload")
async def admin_upload(file: UploadFile = File(...), admin=Depends(get_current_admin)):
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Formato não suportado. Use JPG, PNG, WEBP ou GIF.")
    contents = await file.read()
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail="Imagem demasiado grande (máx 4 MB).")
    encoded = base64.b64encode(contents).decode("ascii")
    data_url = f"data:{file.content_type};base64,{encoded}"
    return {"url": data_url, "size": len(contents), "content_type": file.content_type}


# ---------- Seed ----------
DEFAULT_PRODUCTS = [
    {"name": "Camisola Portugal 2026", "category": "selecoes", "price": 34.90, "unit": "un", "season": "2026", "personalizable": True, "sizes": ["XS","S","M","L","XL","XXL"],
     "image": "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&q=85&w=900",
     "description": "Camisola inspirada na seleção portuguesa. Personaliza com nome e número.", "featured": True, "bestseller": True, "stock_quantity": 25},
    {"name": "Camisola Club Edition", "category": "clubes", "price": 32.90, "unit": "un", "season": "2026", "personalizable": True, "sizes": ["XS","S","M","L","XL"],
     "image": "https://images.unsplash.com/photo-1553778263-73a83bab9b0c?auto=format&fit=crop&q=85&w=900",
     "description": "Design clássico de futebol para os verdadeiros apaixonados pelo jogo.", "featured": True, "stock_quantity": 20},
    {"name": "Camisola Retro 90s", "category": "retro", "price": 39.90, "unit": "un", "season": "Retro", "personalizable": True, "sizes": ["S","M","L","XL"],
     "image": "https://images.unsplash.com/photo-1521412644187-c49fa049e84d?auto=format&fit=crop&q=85&w=900",
     "description": "Visual vintage, corte confortável e espírito de futebol dos anos 90.", "bestseller": True, "stock_quantity": 15},
    {"name": "Camisola Treino Pro", "category": "treino", "price": 27.90, "unit": "un", "season": "2026", "personalizable": False, "sizes": ["S","M","L","XL","XXL"],
     "image": "https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&q=85&w=900",
     "description": "Leve e confortável para treinar, jogar ou usar no dia a dia.", "promotion": True, "stock_quantity": 30},
    {"name": "Camisola Junior", "category": "crianca", "price": 24.90, "unit": "un", "season": "2026", "personalizable": True, "sizes": ["4A","6A","8A","10A","12A","14A"],
     "image": "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&q=85&w=900",
     "description": "Modelo infantil para os pequenos craques. Personalização disponível.", "featured": True, "stock_quantity": 18},
    {"name": "Cachecol FutWearPT", "category": "acessorios", "price": 14.90, "unit": "un", "season": "2026", "personalizable": False, "sizes": ["Único"],
     "image": "https://images.unsplash.com/photo-1526232761682-d26e03ac148e?auto=format&fit=crop&q=85&w=900",
     "description": "Acessório FutWearPT para completar o look de bancada.", "stock_quantity": 35},
]




async def ensure_default_catalog():
    """Guarantee the public FutWearPT catalogue exists whenever the API is used.
    This makes the shop self-healing after a fresh/partial MongoDB deployment.
    """
    football_categories = {"clubes", "selecoes", "retro", "treino", "crianca", "acessorios"}
    legacy = await db.products.find({"category": {"$nin": list(football_categories)}}).to_list(1000)
    if legacy:
        await db.products.delete_many({"_id": {"$in": [d["_id"] for d in legacy]}})
    for index, default in enumerate(DEFAULT_PRODUCTS, start=1):
        stable_id = f"fw-default-{index}"
        existing_product = await db.products.find_one({"id": stable_id})
        if not existing_product:
            existing_product = await db.products.find_one({"name": default["name"], "category": default["category"]})
        if not existing_product:
            obj = Product(**{**default, "id": stable_id})
            doc = obj.model_dump()
            doc["created_at"] = doc["created_at"].isoformat()
            await db.products.insert_one(doc)

async def seed():
    # admin
    admin_email = os.environ["ADMIN_EMAIL"].lower().strip()
    admin_password = os.environ["ADMIN_PASSWORD"]
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Administrador",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info("Admin seeded")
    elif not verify_password(admin_password, existing.get("password_hash", "")):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}},
        )
        logger.info("Admin password updated")

    # products — self-heal the public football catalogue
    await ensure_default_catalog()

    # site content — one-time FutWearPT migration from the original shop
    existing_content = await db.site_content.find_one({"id": "main"}, {"_id": 0, "brand_key": 1})
    if not existing_content or existing_content.get("brand_key") != "futwearpt-v2":
        default_content = SiteContent(
            hero=HeroContent(tagline="FUTEBOL · PORTUGAL · 2026", title_part1="Veste.", title_emphasis="Joga.", title_part2="Domina.", subtitle="Camisolas para quem leva o futebol a sério. Clubes, seleções, retro, treino e personalização.", image="/futwearpt-logo.png", cta_primary="Ver camisolas", cta_secondary="Conhecer a FutWearPT", rating_value="5.0", rating_label="Paixão pelo futebol"),
            about=AboutContent(tagline="Football only", title="Não é moda. É cultura.", paragraph1="A FutWearPT existe para quem vê uma camisola e vê muito mais do que tecido. É clube, memória, bancada e paixão pelo jogo.", paragraph2="Escolhe o modelo, seleciona o tamanho, acrescenta nome e número quando disponível e recebe a tua encomenda em Portugal."),
            reviews=[],
            categories=[
                CategoryContent(slug="clubes", name="Clubes", image="https://images.unsplash.com/photo-1526232761682-d26e03ac148e?auto=format&fit=crop&q=80&w=900"),
                CategoryContent(slug="selecoes", name="Seleções", image="https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&q=80&w=900"),
                CategoryContent(slug="retro", name="Retro", image="https://images.unsplash.com/photo-1521412644187-c49fa049e84d?auto=format&fit=crop&q=80&w=900"),
                CategoryContent(slug="treino", name="Treino", image="https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&q=80&w=900"),
            ],
            cta_title="Veste a tua história.", cta_subtitle="Escolhe a camisola, personaliza quando disponível e acompanha a encomenda até à tua porta.", footer_tagline="Football only. Camisolas, retro, treino e personalização.");
            seo=SeoConfig(site_title="FutWearPT — Camisolas de Futebol", site_description="Camisolas de futebol, retro e treino. Personaliza a tua camisola e compra online em Portugal.")
        )
        payload = default_content.model_dump()
        payload["id"] = "main"
        payload["brand_key"] = "futwearpt-v2"
        payload["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.site_content.update_one({"id": "main"}, {"$set": payload}, upsert=True)
        logger.info("FutWearPT content migrated")

    # indexes
    await db.users.create_index("email", unique=True)
    await db.products.create_index("id", unique=True)
    await db.orders.create_index("id", unique=True)
    await db.orders.create_index("client_order_id", unique=True, sparse=True)
    await db.site_content.create_index("id", unique=True)
    await db.bundles.create_index("id", unique=True)
    await db.coupons.create_index("code", unique=True)
    await db.password_resets.create_index("token", unique=True)
    await db.password_resets.create_index("expires_at")


# ---------- Gallery ----------
class GalleryPhoto(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    url: str
    caption: Optional[str] = ""
    category: Optional[str] = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class GalleryPhotoIn(BaseModel):
    url: str
    caption: Optional[str] = ""
    category: Optional[str] = ""

@api.get("/gallery")
async def list_gallery():
    docs = await db.gallery.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return docs

@api.post("/admin/gallery", response_model=GalleryPhoto)
async def add_gallery_photo(data: GalleryPhotoIn, admin=Depends(get_current_admin)):
    photo = GalleryPhoto(**data.model_dump())
    await db.gallery.insert_one(photo.model_dump())
    return photo

@api.delete("/admin/gallery/{pid}")
async def delete_gallery_photo(pid: str, admin=Depends(get_current_admin)):
    res = await db.gallery.delete_one({"id": pid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Foto não encontrada")
    return {"ok": True}

@api.patch("/admin/gallery/{pid}", response_model=GalleryPhoto)
async def update_gallery_photo(pid: str, data: GalleryPhotoIn, admin=Depends(get_current_admin)):
    await db.gallery.update_one({"id": pid}, {"$set": data.model_dump()})
    doc = await db.gallery.find_one({"id": pid}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Foto não encontrada")
    return doc

# ---------- Sitemap XML ----------
@api.get("/sitemap.xml", response_class=None)
async def sitemap_xml(request: Request):
    from fastapi.responses import Response
    products = await db.products.find({}, {"_id": 0, "id": 1}).to_list(1000)
    base = os.environ.get("SITE_URL", "https://futwear-pt-l3cp.vercel.app").rstrip("/")
    static = ["/", "/loja", "/sobre", "/galeria", "/termos", "/privacidade"]
    urls = []
    for path in static:
        urls.append(f"<url><loc>{base}{path}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>")
    for p in products:
        urls.append(f"<url><loc>{base}/produto/{p['id']}</loc><changefreq>weekly</changefreq><priority>0.6</priority></url>")
    xml = '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + "".join(urls) + "</urlset>"
    return Response(content=xml, media_type="application/xml")

app.include_router(api)

configured_origins = [origin.strip() for origin in os.environ.get("CORS_ORIGINS", "").split(",") if origin.strip() and origin.strip() != "*"]
if not configured_origins:
    configured_origins = [
        origin for origin in {
            os.environ.get("FRONTEND_URL", "").rstrip("/"),
            os.environ.get("SITE_URL", "").rstrip("/"),
            "http://localhost:3000",
        } if origin
    ]

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=configured_origins,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    return response
