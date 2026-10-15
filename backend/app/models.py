from datetime import datetime
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class Artwork(Base):
    __tablename__ = "artworks"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    slug: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(180))
    description: Mapped[str] = mapped_column(Text, default="")
    image_url: Mapped[str] = mapped_column(String(1000), default="")
    published: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    variants: Mapped[list["PrintVariant"]] = relationship(back_populates="artwork", cascade="all, delete-orphan")

class PrintVariant(Base):
    __tablename__ = "print_variants"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    artwork_id: Mapped[int] = mapped_column(ForeignKey("artworks.id", ondelete="CASCADE"), index=True)
    sku: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    label: Mapped[str] = mapped_column(String(120))
    price_cents: Mapped[int] = mapped_column(Integer)
    inventory_quantity: Mapped[int] = mapped_column(Integer, default=0)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    artwork: Mapped[Artwork] = relationship(back_populates="variants")

class Order(Base):
    __tablename__ = "orders"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(320), index=True)
    status: Mapped[str] = mapped_column(String(32), default="pending", index=True)
    currency: Mapped[str] = mapped_column(String(3), default="usd")
    total_cents: Mapped[int] = mapped_column(Integer)
    stripe_session_id: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    inventory_reserved: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    items: Mapped[list["OrderItem"]] = relationship(back_populates="order", cascade="all, delete-orphan")

class OrderItem(Base):
    __tablename__ = "order_items"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), index=True)
    variant_id: Mapped[int] = mapped_column(ForeignKey("print_variants.id"))
    quantity: Mapped[int] = mapped_column(Integer)
    unit_price_cents: Mapped[int] = mapped_column(Integer)
    order: Mapped[Order] = relationship(back_populates="items")
