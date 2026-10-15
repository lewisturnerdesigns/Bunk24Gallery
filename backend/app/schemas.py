from typing import Literal
from pydantic import BaseModel, ConfigDict, EmailStr, Field

class VariantOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    sku: str
    label: str
    price_cents: int
    inventory_quantity: int

class ArtworkOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    slug: str
    title: str
    description: str
    image_url: str
    published: bool
    variants: list[VariantOut] = []

class ArtworkCreate(BaseModel):
    slug: str = Field(min_length=2, max_length=120, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    title: str = Field(min_length=1, max_length=180)
    description: str = Field(default="", max_length=10000)
    image_url: str = Field(default="", max_length=1000)
    published: bool = False

class VariantCreate(BaseModel):
    sku: str = Field(min_length=2, max_length=80)
    label: str = Field(min_length=1, max_length=120)
    price_cents: int = Field(ge=0, le=100000000)
    inventory_quantity: int = Field(ge=0, le=1000000)
    active: bool = True

class VariantUpdate(BaseModel):
    inventory_quantity: int | None = Field(default=None, ge=0, le=1000000)
    active: bool | None = None

class OrderStatusUpdate(BaseModel):
    status: Literal["pending", "paid", "processing", "shipped", "cancelled", "refunded"]

class CheckoutLine(BaseModel):
    variant_id: int
    quantity: int = Field(ge=1, le=20)

class CheckoutRequest(BaseModel):
    email: EmailStr
    items: list[CheckoutLine] = Field(min_length=1, max_length=30)

class CheckoutResponse(BaseModel):
    checkout_url: str
