import os
import stripe
from fastapi import HTTPException

def create_checkout_session(email: str, line_items: list[dict], order_id: int) -> tuple[str, str]:
    secret = os.getenv("STRIPE_SECRET_KEY", "")
    success_url = os.getenv("STRIPE_SUCCESS_URL", "")
    cancel_url = os.getenv("STRIPE_CANCEL_URL", "")
    if not secret or not success_url or not cancel_url:
        raise HTTPException(status_code=503, detail="Checkout is not configured.")
    stripe.api_key = secret
    try:
        session = stripe.checkout.Session.create(
            mode="payment", customer_email=email, line_items=line_items,
            shipping_address_collection={"allowed_countries": ["US"]},
            success_url=success_url + "?session_id={CHECKOUT_SESSION_ID}",
            cancel_url=cancel_url, client_reference_id=str(order_id),
            metadata={"order_id": str(order_id)},
        )
    except stripe.StripeError as exc:
        raise HTTPException(status_code=502, detail="Payment provider could not create a checkout session.") from exc
    if not session.url or not session.id:
        raise HTTPException(status_code=502, detail="Payment provider returned an incomplete checkout session.")
    return session.url, session.id
