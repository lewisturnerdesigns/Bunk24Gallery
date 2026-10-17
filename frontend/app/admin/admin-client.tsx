"use client";

import { useState, type FormEvent } from "react";

type Artist = { id: number; name: string; slug: string; bio: string };
type Variant = { id: number; sku: string; label: string; price_cents: number; inventory_quantity: number; active: boolean };
type Artwork = { id: number; slug: string; title: string; description: string; image_url: string; artist_id: number | null; artist_featured: boolean; artist_featured_order: number; site_featured: boolean; site_featured_order: number; published: boolean; variants: Variant[] };
type Order = { id: number; email: string; status: string; total_cents: number; currency: string; created_at: string; items: { variant_id: number; quantity: number; unit_price_cents: number }[] };
const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default function AdminClient() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [artists, setArtists] = useState<Artist[]>([]);
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
    const responses = await Promise.all([fetch(api + "/admin/artists", { headers }), fetch(api + "/admin/artworks", { headers }), fetch(api + "/admin/orders", { headers })]);
    if (responses.some((response) => !response.ok)) throw new Error("Your admin session may have expired. Sign in again.");
    setArtists(await responses[0].json()); setArtworks(await responses[1].json()); setOrders(await responses[2].json());
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
  async function createArtist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement);
    try {
      await request("/admin/artists", { method: "POST", body: JSON.stringify({ name: form.get("artist_name"), slug: slugify(String(form.get("artist_name"))), bio: form.get("artist_bio") || "" }) });
      formElement.reset(); await refresh(); setNotice("Artist added.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not create artist."); }
  }
  async function createArtwork(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement); setNotice("");
    try {
      const artistValue = String(form.get("artist_id") || "");
      const artwork = await request("/admin/artworks", { method: "POST", body: JSON.stringify({
        title: form.get("title"), slug: form.get("slug"), description: form.get("description") || "", image_url: form.get("image_url") || "",
        artist_id: artistValue ? Number(artistValue) : null, artist_featured: form.get("artist_featured") === "on",
        artist_featured_order: Number(form.get("artist_featured_order") || 0), site_featured: form.get("site_featured") === "on",
        site_featured_order: Number(form.get("site_featured_order") || 0), published: form.get("published") === "on"
      }) }) as Artwork;
      const image = form.get("image_file");
      if (image instanceof File && image.size > 0) {
        const body = new FormData(); body.append("image", image);
        const response = await fetch(api + "/admin/artworks/" + artwork.id + "/image", { method: "POST", headers: { Authorization: "Bearer " + token }, body });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.detail || "Artwork saved, but image upload failed.");
      }
      formElement.reset(); await refresh(); setNotice("Artwork saved" + (image instanceof File && image.size ? " with image." : "."));
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not create artwork."); }
  }
  async function createVariant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement);
    try {
      await request("/admin/artworks/" + form.get("artwork_id") + "/variants", { method: "POST", body: JSON.stringify({ sku: form.get("sku"), label: form.get("label"), price_cents: Math.round(Number(form.get("price")) * 100), inventory_quantity: Number(form.get("inventory")), active: true }) });
      formElement.reset(); await refresh(); setNotice("Print size and price saved.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not create print variant."); }
  }
  async function patchArtwork(artwork: Artwork, patch: Partial<Artwork>, message: string) {
    try { await request("/admin/artworks/" + artwork.id, { method: "PATCH", body: JSON.stringify(patch) }); await refresh(); setNotice(message); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Could not update artwork."); }
  }
  async function patchVariant(variant: Variant, patch: Partial<Variant>, message: string) {
    try { await request("/admin/variants/" + variant.id, { method: "PATCH", body: JSON.stringify(patch) }); await refresh(); setNotice(message); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Could not update print option."); }
  }
  async function changeStatus(order: Order, status: string) {
    try { await request("/admin/orders/" + order.id + "/status", { method: "PATCH", body: JSON.stringify({ status }) }); await refresh(); setNotice("Order status updated."); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Could not update order."); }
  }

  return <section className="admin-page">
    <div className="admin-top"><div><p className="eyebrow">BUNK24 / CONTROL ROOM</p><h1>Good work, organized.</h1><p>Manage artists, artwork, featured collections, print pricing, and orders.</p></div><span className="shop-tag">STUDIO ADMIN</span></div>
    {!token ? <form className="admin-panel admin-login" onSubmit={login}><h2>Studio sign-in</h2><p>Sign in with the admin credentials configured on the API server.</p><label htmlFor="admin-email">Admin email</label><input id="admin-email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)}/><label htmlFor="admin-password">Password</label><input id="admin-password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)}/><button className="admin-link" disabled={busy}>{busy ? "Signing in…" : "Sign in securely ↗"}</button></form> :
    <>
      <div className="admin-toolbar"><span>Signed in as {email}</span><button onClick={() => { setToken(""); setArtists([]); setArtworks([]); setOrders([]); setNotice("Signed out."); }}>Sign out</button><button onClick={() => refresh().then(() => setNotice("Data refreshed.")).catch((e) => setNotice(e.message))}>Refresh data ↻</button></div>
      <div className="admin-stats"><div className="admin-stat"><span>ARTISTS</span><strong>{artists.length}</strong></div><div className="admin-stat"><span>ARTWORKS</span><strong>{artworks.length}</strong></div><div className="admin-stat"><span>ORDERS</span><strong>{orders.length}</strong></div></div>
      <div className="admin-columns">
        <form className="admin-panel" onSubmit={createArtist}><h2>Add artist</h2><p>Create an artist profile first, then assign artwork to them.</p><label>Artist name<input name="artist_name" required maxLength={180} placeholder="Artist name"/></label><label>Short bio<textarea name="artist_bio" rows={3}/></label><button className="admin-link">Create artist</button></form>
        <form className="admin-panel" onSubmit={createArtwork}><h2>Upload artwork</h2><label>Artwork title<input name="title" required maxLength={180}/></label><label>URL slug<input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="my-new-piece"/></label><label>Artist<select name="artist_id" defaultValue=""><option value="">Unassigned / studio collection</option>{artists.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label><label>Description<textarea name="description" rows={2}/></label><label>Upload image (JPG, PNG, WebP, GIF · max 12 MB)<input name="image_file" type="file" accept="image/jpeg,image/png,image/webp,image/gif"/></label><label>Or use an existing image URL<input name="image_url" type="url" placeholder="https://…"/></label>
          <div className="admin-feature-box"><label className="admin-check"><input type="checkbox" name="artist_featured"/> Feature on artist page</label><label>Artist feature order (lower number first)<input name="artist_featured_order" type="number" min="0" defaultValue="0"/></label><label className="admin-check"><input type="checkbox" name="site_featured"/> Feature on BUNK24 homepage</label><label>Site feature order (lower number first)<input name="site_featured_order" type="number" min="0" defaultValue="0"/></label></div>
          <label className="admin-check"><input type="checkbox" name="published"/> Publish in shop</label><button className="admin-link">Save artwork</button></form>
        <form className="admin-panel" onSubmit={createVariant}><h2>Add print size & price</h2><label>Artwork<select name="artwork_id" required defaultValue=""><option value="" disabled>Select artwork</option>{artworks.map(a=><option key={a.id} value={a.id}>{a.title}</option>)}</select></label><label>SKU<input name="sku" required maxLength={80} placeholder="B24-001-810"/></label><label>Print size / label<input name="label" required placeholder="8 × 10 in print"/></label><div className="admin-form-row"><label>Price (USD)<input name="price" type="number" min="0" step="0.01" required/></label><label>Starting stock<input name="inventory" type="number" min="0" step="1" required/></label></div><button className="admin-link">Save print option</button></form>
      </div>
      <div className="admin-panel"><h2>Artwork, features & print options</h2>{artworks.length===0?<p>No artwork yet. Add an artist and upload your first piece.</p>:artworks.map(a=><div className="admin-art-row" key={a.id}>
        <div className="admin-art-heading">{a.image_url && <img className="admin-thumb" src={a.image_url.startsWith("/") ? api + a.image_url : a.image_url} alt=""/>}<div><strong>{a.title}</strong><p>/{a.slug} · {a.published?"Published":"Draft"} · {artists.find(x=>x.id===a.artist_id)?.name || "Unassigned"}</p></div></div>
        <div className="admin-art-controls"><label>Artist<select aria-label={"Artist for "+a.title} value={a.artist_id ?? ""} onChange={e=>void patchArtwork(a,{artist_id:e.target.value ? Number(e.target.value) : null},"Artist assignment updated.")}><option value="">Unassigned</option>{artists.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label className="admin-check"><input type="checkbox" checked={a.artist_featured} onChange={e=>void patchArtwork(a,{artist_featured:e.target.checked},"Artist feature setting updated.")}/> Artist featured</label><label>Artist order<input aria-label={"Artist order for "+a.title} type="number" min="0" value={a.artist_featured_order} onChange={e=>setArtworks(items=>items.map(x=>x.id===a.id?{...x,artist_featured_order:Number(e.target.value)}:x))} onBlur={e=>{if(Number(e.target.value)!==a.artist_featured_order)void patchArtwork(a,{artist_featured_order:Number(e.target.value)},"Artist order saved.");}}/></label><label className="admin-check"><input type="checkbox" checked={a.site_featured} onChange={e=>void patchArtwork(a,{site_featured:e.target.checked},"Homepage feature setting updated.")}/> Site featured</label><label>Site order<input aria-label={"Site order for "+a.title} type="number" min="0" value={a.site_featured_order} onChange={e=>setArtworks(items=>items.map(x=>x.id===a.id?{...x,site_featured_order:Number(e.target.value)}:x))} onBlur={e=>{if(Number(e.target.value)!==a.site_featured_order)void patchArtwork(a,{site_featured_order:Number(e.target.value)},"Site order saved.");}}/></label><label className="admin-check"><input type="checkbox" checked={a.published} onChange={e=>void patchArtwork(a,{published:e.target.checked},"Publish setting updated.")}/> Published</label></div>
        {a.variants.map(v=><div className="admin-variant-row admin-variant-edit" key={v.id}><strong>{v.sku}</strong><label>Size / label<input aria-label={"Label for "+v.sku} defaultValue={v.label} onBlur={e=>{if(e.target.value!==v.label)void patchVariant(v,{label:e.target.value},"Print size updated.");}}/></label><label>Price (USD)<input aria-label={"Price for "+v.sku} type="number" min="0" step="0.01" defaultValue={(v.price_cents/100).toFixed(2)} onBlur={e=>{const cents=Math.round(Number(e.target.value)*100);if(Number.isFinite(cents)&&cents>=0&&cents!==v.price_cents)void patchVariant(v,{price_cents:cents},"Print price updated.");}}/></label><label>Stock<input aria-label={"Stock for "+v.sku} type="number" min="0" defaultValue={v.inventory_quantity} onBlur={e=>{if(Number(e.target.value)!==v.inventory_quantity)void patchVariant(v,{inventory_quantity:Number(e.target.value)},"Inventory updated.");}}/></label></div>)}
      </div>)}</div>
      <div className="admin-panel"><h2>Orders & fulfillment</h2>{orders.length===0?<p>No orders yet. Checkout orders will appear here once created.</p>:<div className="admin-orders">{orders.map(o=><div className="admin-order" key={o.id}><div><strong>#{o.id} · {o.email}</strong><p>{new Date(o.created_at).toLocaleDateString()} · {o.items.reduce((sum,i)=>sum+i.quantity,0)} item(s)</p></div><strong>{money(o.total_cents)}</strong><select aria-label={"Status for order "+o.id} value={o.status} onChange={(e)=>void changeStatus(o,e.target.value)}><option value="pending" disabled={o.status !== "pending"}>Pending</option><option value="paid" disabled>Paid (verified payment)</option><option value="processing">Processing</option><option value="shipped">Shipped</option><option value="cancelled" disabled={o.status !== "pending"}>Cancelled</option><option value="refunded" disabled>Refunded (not configured)</option></select></div>)}</div>}</div>
    </>}
    {notice && <p className="admin-notice" role="status">{notice}</p>}
  </section>;
}
