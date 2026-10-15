"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

type Variant = { id: number; sku: string; label: string; price_cents: number; inventory_quantity: number };
type Artwork = { id: number; slug: string; title: string; description: string; image_url: string; published: boolean; variants: Variant[] };
type CartLine = { variant_id: number; title: string; label: string; price_cents: number; quantity: number };

const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

export default function ShopClient() {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [cart, setCart] = useState<Record<number, CartLine>>({});
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [message, setMessage] = useState("");
  const total = useMemo(() => Object.values(cart).reduce((sum, line) => sum + line.price_cents * line.quantity, 0), [cart]);
  const count = Object.values(cart).reduce((sum, line) => sum + line.quantity, 0);

  useEffect(() => {
    const controller = new AbortController();
    fetch(api + "/api/artworks", { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error("The catalog API is unavailable."); return response.json(); })
      .then((data: Artwork[]) => setArtworks(data))
      .catch((error: unknown) => { if (!(error instanceof Error && error.name === "AbortError")) setMessage("We couldn't reach the live catalog. Check that the API and database are running."); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  function add(artwork: Artwork, variant: Variant) {
    setCart((current) => {
      const existing = current[variant.id];
      return { ...current, [variant.id]: { variant_id: variant.id, title: artwork.title, label: variant.label, price_cents: variant.price_cents, quantity: Math.min(20, (existing?.quantity || 0) + 1) } };
    });
    setMessage(artwork.title + " added to your bag.");
  }

  function changeQuantity(id: number, quantity: number) {
    setCart((current) => {
      if (quantity < 1) { const next = { ...current }; delete next[id]; return next; }
      return { ...current, [id]: { ...current[id], quantity: Math.min(20, quantity) } };
    });
  }

  async function checkout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!count || !email) return;
    setCheckoutBusy(true);
    setMessage("");
    try {
      const response = await fetch(api + "/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, items: Object.values(cart).map((line) => ({ variant_id: line.variant_id, quantity: line.quantity })) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Checkout is not available right now.");
      window.location.assign(data.checkout_url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Checkout failed. Please try again.");
      setCheckoutBusy(false);
    }
  }

  return <div className="shop-content">
    <div className="shop-intro"><div><p className="eyebrow">THE BUNK24 COLLECTION</p><h1>Art for your<br/><em>everyday.</em></h1></div><p>Original work and thoughtfully made prints by TURNER. Pick something that feels like you.</p></div>
    {loading && <p className="shop-notice">Loading the collection…</p>}
    {!loading && artworks.length === 0 && <div className="shop-empty"><h2>The next collection is taking shape.</h2><p>{message || "Artwork will appear here as soon as it is published in the studio catalog."}</p><p>For questions, <a href="mailto:studio@bunk24.com">get in touch ↗</a></p></div>}
    <div className="shop-grid">{artworks.map((artwork) => <article className="work-card shop-card" key={artwork.id}>
      <div className="work-image" style={{ backgroundImage: artwork.image_url ? "url(" + artwork.image_url + ")" : "linear-gradient(135deg,#e8e3d8,#f05a35)" }}><span>{artwork.slug.toUpperCase()}</span><b>↗</b></div>
      <div className="shop-tag">{artwork.variants.length ? artwork.variants.length + " PRINT OPTION" + (artwork.variants.length === 1 ? "" : "S") : "COMING SOON"}</div>
      <div className="work-meta"><div><h3>{artwork.title}</h3><p>{artwork.description || "Art by TURNER"}</p></div>{artwork.variants[0] && <span>{money(artwork.variants[0].price_cents)}</span>}</div>
      {artwork.variants.length > 0 && <div className="variant-list">{artwork.variants.filter((v) => v.inventory_quantity > 0).map((variant) => <button className="variant-button" key={variant.id} onClick={() => add(artwork, variant)}>{variant.label} · {money(variant.price_cents)} <span>+ Add</span></button>)}</div>}
    </article>)}</div>
    {count > 0 && <section className="cart-panel" aria-label="Shopping bag"><div className="cart-heading"><div><p className="eyebrow">YOUR BAG / {count} ITEM{count === 1 ? "" : "S"}</p><h2>Take it <em>home.</em></h2></div><strong>{money(total)}</strong></div>
      {Object.values(cart).map((line) => <div className="cart-line" key={line.variant_id}><div><strong>{line.title}</strong><p>{line.label} · {money(line.price_cents)} each</p></div><div className="quantity-control"><button type="button" aria-label="Remove one" onClick={() => changeQuantity(line.variant_id, line.quantity - 1)}>−</button><span>{line.quantity}</span><button type="button" aria-label="Add one" onClick={() => changeQuantity(line.variant_id, line.quantity + 1)}>+</button></div></div>)}
      <form className="checkout-form" onSubmit={checkout}><label htmlFor="checkout-email">Email for your order receipt</label><input id="checkout-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com"/><button className="button" type="submit" disabled={checkoutBusy}>{checkoutBusy ? "Connecting to checkout…" : "Continue to secure checkout"} <span>↗</span></button><p className="checkout-note">Payments are handled securely by Stripe when checkout is configured. Shipping and tax rules must be finalized before launch.</p></form>
    </section>}
    {message && <p className="shop-notice" role="status">{message}</p>}
  </div>;
}
