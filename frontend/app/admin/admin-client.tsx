"use client";

import { useState, type FormEvent } from "react";

type Variant = { id: number; sku: string; label: string; price_cents: number; inventory_quantity: number; active: boolean };
type Artwork = { id: number; slug: string; title: string; description: string; image_url: string; published: boolean; variants: Variant[] };
type Order = { id: number; email: string; status: string; total_cents: number; currency: string; created_at: string; items: { variant_id: number; quantity: number; unit_price_cents: number }[] };
const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

export default function AdminClient() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function request(path: string, options: RequestInit = {}) {
    const response = await fetch(api + path, { ...options, headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}), ...options.headers } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.detail || "Request failed (" + response.status + ")");
    return data;
  }
  async function refresh(auth = token) {
    const headers = { Authorization: "Bearer " + auth };
    const [a, o] = await Promise.all([fetch(api + "/admin/artworks", { headers }), fetch(api + "/admin/orders", { headers })]);
    if (!a.ok || !o.ok) throw new Error("Your admin session may have expired. Sign in again.");
    setArtworks(await a.json());
    setOrders(await o.json());
  }
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setNotice("");
    try {
      const body = new URLSearchParams({ username: email, password });
      const response = await fetch(api + "/auth/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Sign-in failed.");
      setToken(data.access_token); await refresh(data.access_token); setPassword(""); setNotice("Signed in. Admin data loaded.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Sign-in failed."); }
    finally { setBusy(false); }
  }
  async function createArtwork(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement); setNotice("");
    try {
      await request("/admin/artworks", { method: "POST", body: JSON.stringify({ title: form.get("title"), slug: form.get("slug"), description: form.get("description"), image_url: form.get("image_url"), published: form.get("published") === "on" }) });
      formElement.reset(); await refresh(); setNotice("Artwork created.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not create artwork."); }
  }
  async function createVariant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); setNotice("");
    try {
      await request("/admin/artworks/" + form.get("artwork_id") + "/variants", { method: "POST", body: JSON.stringify({ sku: form.get("sku"), label: form.get("label"), price_cents: Math.round(Number(form.get("price")) * 100), inventory_quantity: Number(form.get("inventory")), active: true }) });
      formElement.reset(); await refresh(); setNotice("Print variant created.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not create print variant."); }
  }
  async function changeInventory(variant: Variant, raw: string) {
    const quantity = Number(raw);
    if (!Number.isInteger(quantity) || quantity < 0) return;
    try { await request("/admin/variants/" + variant.id, { method: "PATCH", body: JSON.stringify({ inventory_quantity: quantity }) }); await refresh(); setNotice("Inventory updated."); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Could not update inventory."); }
  }
  async function changeStatus(order: Order, status: string) {
    try { await request("/admin/orders/" + order.id + "/status", { method: "PATCH", body: JSON.stringify({ status }) }); await refresh(); setNotice("Order status updated."); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Could not update order."); }
  }

  return <section className="admin-page">
    <div className="admin-top"><div><p className="eyebrow">BUNK24 / CONTROL ROOM</p><h1>Good work, organized.</h1><p>Manage TURNER artwork, print stock, and orders.</p></div><span className="shop-tag">STUDIO ADMIN</span></div>
    {!token ? <form className="admin-panel admin-login" onSubmit={login}><h2>Studio sign-in</h2><p>Sign in with the admin credentials configured on the API server.</p><label htmlFor="admin-email">Admin email</label><input id="admin-email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)}/><label htmlFor="admin-password">Password</label><input id="admin-password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)}/><button className="admin-link" disabled={busy}>{busy ? "Signing in…" : "Sign in securely ↗"}</button></form> :
    <>
      <div className="admin-toolbar"><span>Signed in as {email}</span><button onClick={() => { setToken(""); setArtworks([]); setOrders([]); setNotice("Signed out."); }}>Sign out</button><button onClick={() => refresh().then(() => setNotice("Data refreshed.")).catch((e) => setNotice(e.message))}>Refresh data ↻</button></div>
      <div className="admin-stats"><div className="admin-stat"><span>ARTWORKS</span><strong>{artworks.length}</strong></div><div className="admin-stat"><span>ORDERS</span><strong>{orders.length}</strong></div><div className="admin-stat"><span>PRINT VARIANTS</span><strong>{artworks.reduce((sum,a)=>sum+a.variants.length,0)}</strong></div></div>
      <div className="admin-columns"><form className="admin-panel" onSubmit={createArtwork}><h2>Add artwork</h2><label>Title<input name="title" required maxLength={180}/></label><label>URL slug<input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="my-new-piece"/></label><label>Description<textarea name="description" rows={3}/></label><label>Image URL<input name="image_url" type="url" placeholder="https://…"/></label><label className="admin-check"><input type="checkbox" name="published"/> Publish in shop</label><button className="admin-link">Create artwork</button></form>
      <form className="admin-panel" onSubmit={createVariant}><h2>Add print variant</h2><label>Artwork<select name="artwork_id" required defaultValue=""><option value="" disabled>Select artwork</option>{artworks.map(a=><option key={a.id} value={a.id}>{a.title}</option>)}</select></label><label>SKU<input name="sku" required maxLength={80}/></label><label>Print size / variant label<input name="label" required placeholder="12 × 16 in print"/></label><div className="admin-form-row"><label>Price (USD)<input name="price" type="number" min="0" step="0.01" required/></label><label>Starting stock<input name="inventory" type="number" min="0" step="1" required/></label></div><button className="admin-link">Create variant</button></form></div>
      <div className="admin-panel"><h2>Artwork & inventory</h2>{artworks.length===0?<p>No artwork yet. Add your first piece above.</p>:artworks.map(a=><div className="admin-art-row" key={a.id}><div><strong>{a.title}</strong><p>/{a.slug} · {a.published?"Published":"Draft"}</p>{a.variants.map(v=><div className="admin-variant-row" key={v.id}><span>{v.label} · {money(v.price_cents)} · {v.sku}</span><label>Stock <input aria-label={"Stock for "+v.sku} type="number" min="0" defaultValue={v.inventory_quantity} onBlur={(e)=>{if(Number(e.target.value)!==v.inventory_quantity) void changeInventory(v,e.target.value);}}/></label></div>)}</div></div>)}</div>
      <div className="admin-panel"><h2>Orders & fulfillment</h2>{orders.length===0?<p>No orders yet. Checkout orders will appear here once created.</p>:<div className="admin-orders">{orders.map(o=><div className="admin-order" key={o.id}><div><strong>#{o.id} · {o.email}</strong><p>{new Date(o.created_at).toLocaleDateString()} · {o.items.reduce((sum,i)=>sum+i.quantity,0)} item(s)</p></div><strong>{money(o.total_cents)}</strong><select aria-label={"Status for order "+o.id} value={o.status} onChange={(e)=>void changeStatus(o,e.target.value)}><option value="pending">Pending</option><option value="paid" disabled={o.status === "pending"}>Paid (verified payment)</option><option value="processing">Processing</option><option value="shipped">Shipped</option><option value="cancelled">Cancelled</option><option value="refunded">Refunded</option></select></div>)}</div>}</div>
    </>}
    {notice && <p className="admin-notice" role="status">{notice}</p>}
  </section>;
}
