import logging
import os
from contextlib import asynccontextmanager
from fastapi import Depends, FastAPI, HTTPException, Request, Header, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session, selectinload
import stripe
from app.database import Base, engine, check_database_connection
from app import models, stripe_events
from app.schemas import ArtworkOut, ArtworkCreate, VariantCreate, VariantUpdate, OrderStatusUpdate, CheckoutRequest, CheckoutResponse
from app.security import create_access_token, require_admin, verify_admin_password
from app.commerce import create_checkout_session

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger(__name__)

@asynccontextmanager
def seed_demo_catalog() -> None:
    if os.getenv("SEED_DEMO_DATA", "false").lower() != "true":
        return
    with Session(engine) as db:
        if db.scalars(select(models.Artwork.id).limit(1)).first() is not None:
            return
        demo = [
            ("blue-hour", "Blue Hour", "Color study · demo catalog", "https://images.unsplash.com/photo-1541961017774-22349e4a1262?auto=format&fit=crop&w=1200&q=85", "B24-001-810", "8 × 10 in print", 4200),
            ("wildflower-24", "Wildflower / 24", "Fine art print · demo catalog", "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=1200&q=85", "B24-002-810", "8 × 10 in print", 4200),
            ("a-quiet-noise", "A Quiet Noise", "Open edition · demo catalog", "https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?auto=format&fit=crop&w=1200&q=85", "B24-003-810", "8 × 10 in print", 3800),
            ("soft-collision", "Soft Collision", "Limited edition · demo catalog", "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?auto=format&fit=crop&w=1200&q=85", "B24-004-810", "8 × 10 in print", 4500),
            ("after-the-rain", "After the Rain", "Open edition · demo catalog", "https://images.unsplash.com/photo-1577083288073-40892c0860a4?auto=format&fit=crop&w=1200&q=85", "B24-005-810", "8 × 10 in print", 3800),
            ("color-has-memory", "Color Has Memory", "Limited edition · demo catalog", "https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&w=1200&q=85", "B24-006-810", "8 × 10 in print", 5200),
        ]
        for slug, title, description, image_url, sku, label, price_cents in demo:
            artwork = models.Artwork(slug=slug, title=title, description=description, image_url=image_url, published=True)
            db.add(artwork)
            db.flush()
            db.add(models.PrintVariant(artwork_id=artwork.id, sku=sku, label=label, price_cents=price_cents, inventory_quantity=25, active=True))
        db.commit()

@asynccontextmanager
async def lifespan(_: FastAPI):
    # Convenient locally; deployments should apply the checked-in SQL migration first.
    Base.metadata.create_all(bind=engine)
    seed_demo_catalog()
    yield

app = FastAPI(title="BUNK24 Gallery API", description="Catalog, orders, and checkout API for BUNK24 — art by TURNER.", version="1.0.0", lifespan=lifespan)
origins = [item.strip() for item in os.getenv("FRONTEND_ORIGIN", "http://localhost:3000").split(",") if item.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=False, allow_methods=["GET", "POST", "PATCH", "OPTIONS"], allow_headers=["Authorization", "Content-Type"])

def get_db():
    session = Session(engine)
    try:
        yield session
    finally:
        session.close()

@app.get("/health", tags=["health"])
def health() -> dict[str, str]:
    return {"status": "ok"}

@app.get("/health/ready", tags=["health"])
def readiness() -> dict[str, str]:
    try:
        check_database_connection()
    except SQLAlchemyError as error:
        logger.exception("Database readiness check failed")
        raise HTTPException(status_code=503, detail="Database is unavailable") from error
    return {"status": "ok", "database": "connected"}

@app.get("/api/artworks", response_model=list[ArtworkOut], tags=["catalog"])
def list_artworks(db: Session = Depends(get_db)):
    try:
        return db.scalars(select(models.Artwork).where(models.Artwork.published.is_(True)).options(selectinload(models.Artwork.variants.and_(models.PrintVariant.active.is_(True)))).order_by(models.Artwork.created_at.desc())).all()
    except SQLAlchemyError as error:
        logger.exception("Could not load artwork catalog")
        raise HTTPException(status_code=503, detail="Catalog is temporarily unavailable") from error

@app.post("/auth/token", tags=["authentication"])
def login(form: OAuth2PasswordRequestForm = Depends()):
    admin_email = os.getenv("ADMIN_EMAIL", "")
    if not admin_email or form.username.lower() != admin_email.lower() or not verify_admin_password(form.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password", headers={"WWW-Authenticate": "Bearer"})
    try:
        return {"access_token": create_access_token(admin_email), "token_type": "bearer"}
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error

@app.get("/admin/artworks", tags=["admin"])
def admin_artworks(_: str = Depends(require_admin), db: Session = Depends(get_db)):
    return db.scalars(select(models.Artwork).options(selectinload(models.Artwork.variants)).order_by(models.Artwork.created_at.desc())).all()

@app.post("/admin/artworks", response_model=ArtworkOut, tags=["admin"])
def create_artwork(payload: ArtworkCreate, _: str = Depends(require_admin), db: Session = Depends(get_db)):
    artwork = models.Artwork(**payload.model_dump())
    db.add(artwork)
    try:
        db.commit()
        db.refresh(artwork)
        return artwork
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(status_code=409, detail="An artwork with that slug already exists.") from error

@app.post("/admin/artworks/{artwork_id}/variants", tags=["admin"])
def create_variant(artwork_id: int, payload: VariantCreate, _: str = Depends(require_admin), db: Session = Depends(get_db)):
    if not db.get(models.Artwork, artwork_id):
        raise HTTPException(status_code=404, detail="Artwork not found.")
    variant = models.PrintVariant(artwork_id=artwork_id, **payload.model_dump())
    db.add(variant)
    try:
        db.commit()
        db.refresh(variant)
        return variant
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(status_code=409, detail="That SKU already exists.") from error

@app.patch("/admin/variants/{variant_id}", tags=["admin"])
def update_variant(variant_id: int, payload: VariantUpdate, _: str = Depends(require_admin), db: Session = Depends(get_db)):
    variant = db.get(models.PrintVariant, variant_id)
    if not variant:
        raise HTTPException(status_code=404, detail="Print variant not found.")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(variant, key, value)
    db.commit()
    db.refresh(variant)
    return variant

@app.get("/admin/orders", tags=["admin"])
def list_orders(_: str = Depends(require_admin), db: Session = Depends(get_db)):
    orders = db.scalars(select(models.Order).options(selectinload(models.Order.items)).order_by(models.Order.created_at.desc()).limit(100)).all()
    return [{"id": o.id, "email": o.email, "status": o.status, "currency": o.currency, "total_cents": o.total_cents, "created_at": o.created_at, "items": [{"variant_id": i.variant_id, "quantity": i.quantity, "unit_price_cents": i.unit_price_cents} for i in o.items]} for o in orders]

@app.patch("/admin/orders/{order_id}/status", tags=["admin"])
def update_order_status(order_id: int, payload: OrderStatusUpdate, _: str = Depends(require_admin), db: Session = Depends(get_db)):
    order = db.get(models.Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")
    if payload.status in {"paid", "processing", "shipped"} and order.status == "pending":
        raise HTTPException(status_code=409, detail="A pending order cannot be marked paid manually; verify its payment webhook first.")
    if payload.status in {"cancelled", "refunded"} and order.inventory_reserved:
        items = db.scalars(select(models.OrderItem).where(models.OrderItem.order_id == order.id)).all()
        for item in items:
            variant = db.scalar(select(models.PrintVariant).where(models.PrintVariant.id == item.variant_id).with_for_update())
            if variant:
                variant.inventory_quantity += item.quantity
        order.inventory_reserved = False
    order.status = payload.status
    db.commit()
    return {"id": order.id, "status": order.status}


@app.post("/webhooks/stripe", tags=["checkout"])
async def stripe_webhook(request: Request, stripe_signature: str | None = Header(default=None, alias="Stripe-Signature"), db: Session = Depends(get_db)):
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET", "")
    if not webhook_secret:
        raise HTTPException(status_code=503, detail="Stripe webhook is not configured.")
    if not stripe_signature:
        raise HTTPException(status_code=400, detail="Missing Stripe signature.")
    body = await request.body()
    try:
        event = stripe.Webhook.construct_event(body, stripe_signature, webhook_secret)
    except (ValueError, stripe.SignatureVerificationError) as error:
        raise HTTPException(status_code=400, detail="Invalid Stripe webhook signature or payload.") from error
    event_id = event["id"]
    if db.get(stripe_events.StripeEvent, event_id):
        return {"received": True, "duplicate": True}
    event_type = event["type"]
    handled_types = {"checkout.session.completed", "checkout.session.async_payment_succeeded", "checkout.session.expired", "checkout.session.async_payment_failed"}
    if event_type in handled_types:
        session_data = event["data"]["object"]
        metadata = session_data.get("metadata") or {}
        try:
            order_id = int(metadata.get("order_id", ""))
        except (TypeError, ValueError) as error:
            raise HTTPException(status_code=400, detail="Checkout session has no valid order reference.") from error
        order = db.scalar(select(models.Order).where(models.Order.id == order_id).with_for_update())
        if not order:
            raise HTTPException(status_code=404, detail="Order reference was not found.")
        if order.stripe_session_id and order.stripe_session_id != session_data.get("id"):
            raise HTTPException(status_code=400, detail="Checkout session does not match this order.")
        if event_type in {"checkout.session.completed", "checkout.session.async_payment_succeeded"} and session_data.get("payment_status") == "paid":
            if order.status not in {"paid", "processing", "shipped", "refunded"}:
                items = db.scalars(select(models.OrderItem).where(models.OrderItem.order_id == order.id)).all()
                # Normally stock was reserved before checkout. A late payment after expiry
                # needs a fresh decrement and may require manual oversell review.
                if not order.inventory_reserved:
                    for item in items:
                        variant = db.scalar(select(models.PrintVariant).where(models.PrintVariant.id == item.variant_id).with_for_update())
                        if variant:
                            if variant.inventory_quantity < item.quantity:
                                logger.error("Inventory shortfall on late paid order %s, variant %s", order.id, variant.id)
                            variant.inventory_quantity = max(0, variant.inventory_quantity - item.quantity)
                order.inventory_reserved = False
                order.status = "paid"
        elif event_type in {"checkout.session.expired", "checkout.session.async_payment_failed"} and order.inventory_reserved and order.status == "pending":
            items = db.scalars(select(models.OrderItem).where(models.OrderItem.order_id == order.id)).all()
            for item in items:
                variant = db.scalar(select(models.PrintVariant).where(models.PrintVariant.id == item.variant_id).with_for_update())
                if variant:
                    variant.inventory_quantity += item.quantity
            order.inventory_reserved = False
            order.status = "cancelled"
    db.add(stripe_events.StripeEvent(id=event_id, event_type=event_type))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        return {"received": True, "duplicate": True}
    return {"received": True}

@app.post("/api/checkout", response_model=CheckoutResponse, tags=["checkout"])
def checkout(payload: CheckoutRequest, db: Session = Depends(get_db)):
    requested: dict[int, int] = {}
    for item in payload.items:
        requested[item.variant_id] = requested.get(item.variant_id, 0) + item.quantity
    variants = db.scalars(select(models.PrintVariant).where(models.PrintVariant.id.in_(requested), models.PrintVariant.active.is_(True), models.PrintVariant.artwork.has(models.Artwork.published.is_(True))).with_for_update()).all()
    by_id = {v.id: v for v in variants}
    if len(by_id) != len(requested):
        raise HTTPException(status_code=400, detail="One or more print variants are unavailable.")
    total = 0
    for variant_id, quantity in requested.items():
        variant = by_id[variant_id]
        if variant.inventory_quantity < quantity:
            raise HTTPException(status_code=409, detail="One or more items no longer have enough inventory.")
        total += variant.price_cents * quantity
    order = models.Order(email=str(payload.email), total_cents=total, currency="usd", status="pending")
    db.add(order)
    try:
        db.flush()
        for variant_id, quantity in requested.items():
            db.add(models.OrderItem(order_id=order.id, variant_id=variant_id, quantity=quantity, unit_price_cents=by_id[variant_id].price_cents))
        db.flush()
        for variant_id, quantity in requested.items():
            by_id[variant_id].inventory_quantity -= quantity
        order.inventory_reserved = True
        stripe_items = [{"quantity": quantity, "price_data": {"currency": "usd", "unit_amount": by_id[variant_id].price_cents, "product_data": {"name": by_id[variant_id].artwork.title + " — " + by_id[variant_id].label}}} for variant_id, quantity in requested.items()]
        url, session_id = create_checkout_session(str(payload.email), stripe_items, order.id)
        order.stripe_session_id = session_id
        db.commit()
        return CheckoutResponse(checkout_url=url)
    except Exception:
        db.rollback()
        raise
