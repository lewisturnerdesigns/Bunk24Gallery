from typing import Literal
from pydantic import BaseModel, ConfigDict, EmailStr, Field

class ArtistCreate(BaseModel):
    name: str = Field(min_length=1, max_length=180)
    slug: str = Field(min_length=2, max_length=120, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    bio: str = Field(default="", max_length=10000)

class ArtistOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    slug: str
    bio: str

class VariantOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    sku: str
    label: str
    price_cents: int
    inventory_quantity: int
    active: bool = True

class ArtworkOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    slug: str
    title: str
    description: str
    image_url: str
    artist_id: int | None = None
    artist_featured: bool = False
    artist_featured_order: int = 0
    site_featured: bool = False
    site_featured_order: int = 0
    published: bool
    variants: list[VariantOut] = Field(default_factory=list)

class ArtworkCreate(BaseModel):
    slug: str = Field(min_length=2, max_length=120, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    title: str = Field(min_length=1, max_length=180)
    description: str = Field(default="", max_length=10000)
    image_url: str = Field(default="", max_length=1000)
    artist_id: int | None = None
    artist_featured: bool = False
    artist_featured_order: int = Field(default=0, ge=0, le=100000)
    site_featured: bool = False
    site_featured_order: int = Field(default=0, ge=0, le=100000)
    published: bool = False

class ArtworkUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=180)
    description: str | None = Field(default=None, max_length=10000)
    artist_id: int | None = None
    artist_featured: bool | None = None
    artist_featured_order: int | None = Field(default=None, ge=0, le=100000)
    site_featured: bool | None = None
    site_featured_order: int | None = Field(default=None, ge=0, le=100000)
    published: bool | None = None

class VariantCreate(BaseModel):
    sku: str = Field(min_length=2, max_length=80)
    label: str = Field(min_length=1, max_length=120)
    price_cents: int = Field(ge=0, le=100000000)
    inventory_quantity: int = Field(ge=0, le=1000000)
    active: bool = True

class VariantUpdate(BaseModel):
    price_cents: int | None = Field(default=None, ge=0, le=100000000)
    inventory_quantity: int | None = Field(default=None, ge=0, le=1000000)
    active: bool | None = None
    label: str | None = Field(default=None, min_length=1, max_length=120)

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
