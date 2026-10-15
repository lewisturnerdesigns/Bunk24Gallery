from pydantic import BaseModel, ConfigDict, EmailStr, Field, HttpUrl

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
    variants: list[VariantOut] = []

class CheckoutLine(BaseModel):
    variant_id: int
    quantity: int = Field(ge=1, le=20)

class CheckoutRequest(BaseModel):
    email: EmailStr
    items: list[CheckoutLine] = Field(min_length=1, max_length=30)

class CheckoutResponse(BaseModel):
    checkout_url: str
