"use client";

import { useState, type DragEvent, type FormEvent } from "react";

type Artist = { id: number; name: string; slug: string; bio: string };
type Variant = { id: number; sku: string; label: string; price_cents: number; inventory_quantity: number; active: boolean };
type Artwork = { id: number; slug: string; title: string; description: string; image_url: string; artist_id: number | null; artist_featured: boolean; artist_featured_order: number; site_featured: boolean; site_featured_order: number; published: boolean; variants: Variant[] };
type Order = { id: number; email: string; status: string; total_cents: number; currency: string; created_at: string; items: { variant_id: number; quantity: number; unit_price_cents: number }[] };
type Section = "overview" | "artists" | "artwork" | "featured" | "prints" | "orders";
type FeatureList = "site" | "artist";
const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const navigation: { id: Section; icon: string; label: string; hint: string }[] = [
  { id: "overview", icon: "◫", label: "Overview", hint: "Studio at a glance" },
  { id: "artists", icon: "♙", label: "Artists", hint: "People and profiles" },
  { id: "artwork", icon: "▧", label: "Artwork", hint: "Upload and organize" },
  { id: "featured", icon: "✳", label: "Featured", hint: "Curated collections" },
  { id: "prints", icon: "▤", label: "Prints & pricing", hint: "Sizes, prices, stock" },
  { id: "orders", icon: "↗", label: "Orders", hint: "Sales and fulfillment" },
];

export default function AdminClient() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [artists, setArtists] = useState<Artist[]>([]);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [section, setSection] = useState<Section>("overview");
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dropId, setDropId] = useState<number | null>(null);
  const [featureList, setFeatureList] = useState<FeatureList>("site");
  const [artistFilter, setArtistFilter] = useState<string>("all");
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

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
  function startDrag(event: DragEvent<HTMLElement>, id: number) {
    setDraggingId(id); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", String(id));
  }
  async function reorderFeatured(event: DragEvent<HTMLElement>, targetId: number) {
    event.preventDefault();
    const sourceId = draggingId ?? Number(event.dataTransfer.getData("text/plain"));
    setDropId(null);
    if (!sourceId || sourceId === targetId) { setDraggingId(null); return; }
    const list = artworks.filter((art) => featureList === "site" ? art.site_featured : art.artist_featured && (artistFilter === "all" || String(art.artist_id ?? "") === artistFilter))
      .sort((a, b) => (featureList === "site" ? a.site_featured_order - b.site_featured_order : a.artist_featured_order - b.artist_featured_order) || a.id - b.id);
    const from = list.findIndex((art) => art.id === sourceId);
    const to = list.findIndex((art) => art.id === targetId);
    if (from < 0 || to < 0) { setDraggingId(null); return; }
    const reordered = [...list]; const moved = reordered.splice(from, 1)[0]; reordered.splice(to, 0, moved);
    setBusy(true); setNotice("");
    try {
      for (let i = 0; i < reordered.length; i++) {
        const field = featureList === "site" ? "site_featured_order" : "artist_featured_order";
        await request("/admin/artworks/" + reordered[i].id, { method: "PATCH", body: JSON.stringify({ [field]: (i + 1) * 10 }) });
      }
      await refresh(); setNotice((featureList === "site" ? "Homepage" : "Artist") + " featured order saved.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not save featured order."); }
    finally { setBusy(false); setDraggingId(null); }
  }

  const sortedSiteFeatures = artworks.filter((art) => art.site_featured).sort((a, b) => a.site_featured_order - b.site_featured_order || a.id - b.id);
  const sortedArtistFeatures = artworks.filter((art) => art.artist_featured && (artistFilter === "all" || String(art.artist_id ?? "") === artistFilter)).sort((a, b) => a.artist_featured_order - b.artist_featured_order || a.id - b.id);
  const featureItems = featureList === "site" ? sortedSiteFeatures : sortedArtistFeatures;
  const title = navigation.find((item) => item.id === section)?.label || "Overview";
  const imageSrc = (art: Artwork) => art.image_url ? (art.image_url.startsWith("/") ? api + art.image_url : art.image_url) : "";

  return <section className="admin-page">
    <div className="admin-top"><div><p className="eyebrow">BUNK24 / CONTROL ROOM</p><h1>Studio workspace.</h1><p>A calmer place to run the gallery, artists, prints, and orders.</p></div><span className="shop-tag">STUDIO ADMIN</span></div>
    {!token ? <form className="admin-panel admin-login" onSubmit={login}><h2>Studio sign-in</h2><p>Sign in with the admin credentials configured on the API server.</p><label htmlFor="admin-email">Admin email</label><input id="admin-email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)}/><label htmlFor="admin-password">Password</label><input id="admin-password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)}/><button className="admin-link" disabled={busy}>{busy ? "Signing in…" : "Sign in securely ↗"}</button></form> :
      <div className={"admin-workspace" + (sidebarExpanded ? " admin-sidebar-expanded" : "")}>
        <aside className="admin-sidebar" aria-label="Admin navigation" onMouseEnter={() => setSidebarExpanded(true)} onMouseLeave={() => setSidebarExpanded(false)}>
          <div className="admin-sidebar-brand"><span className="admin-brand-mark">B</span><span className="admin-sidebar-wordmark">BUNK24 <small>STUDIO ADMIN</small></span></div>
          <nav className="admin-side-nav">{navigation.map((item) => <button type="button" key={item.id} className={"admin-nav-item" + (section === item.id ? " active" : "")} onClick={() => setSection(item.id)} title={item.label}><span className="admin-nav-icon">{item.icon}</span><span className="admin-nav-copy"><strong>{item.label}</strong><small>{item.hint}</small></span></button>)}</nav>
          <div className="admin-sidebar-bottom"><span className="admin-avatar">{email.slice(0, 1).toUpperCase() || "A"}</span><span className="admin-sidebar-wordmark"><strong>{email}</strong><small>Administrator</small></span><button type="button" className="admin-signout-icon" title="Sign out" aria-label="Sign out" onClick={() => { setToken(""); setArtists([]); setArtworks([]); setOrders([]); setNotice("Signed out."); }}>↪</button></div>
        </aside>
        <div className="admin-workspace-main">
          <div className="admin-workspace-header"><div><p className="eyebrow">STUDIO / {section.toUpperCase()}</p><h2>{title}</h2></div><div className="admin-header-actions"><span className="admin-live-dot">Connected</span><button type="button" onClick={() => refresh().then(() => setNotice("Data refreshed.")).catch((e) => setNotice(e.message))}>Refresh ↻</button><a href="/" className="admin-view-gallery">View gallery ↗</a></div></div>
          {section === "overview" && <>
            <div className="admin-welcome"><div><p className="eyebrow">YOUR CREATIVE BUSINESS</p><h3>Make room for the work.</h3><p>Manage the people, pieces, and details that bring BUNK24 to life.</p></div><span className="admin-welcome-symbol">✳</span></div>
            <div className="admin-stats"><div className="admin-stat"><span>ARTISTS</span><strong>{artists.length}</strong><small>In your gallery</small></div><div className="admin-stat"><span>ARTWORKS</span><strong>{artworks.length}</strong><small>{artworks.filter((a) => a.published).length} published</small></div><div className="admin-stat"><span>FEATURED</span><strong>{artworks.filter((a) => a.site_featured).length}</strong><small>Homepage selections</small></div><div className="admin-stat"><span>ORDERS</span><strong>{orders.length}</strong><small>{orders.filter((o) => o.status === "pending" || o.status === "processing").length} need attention</small></div></div>
            <div className="admin-overview-grid"><div className="admin-panel"><div className="admin-section-heading"><div><p className="eyebrow">QUICK ACCESS</p><h3>Go to a workspace</h3></div></div>{navigation.filter((item) => item.id !== "overview").map((item) => <button type="button" className="admin-quick-link" key={item.id} onClick={() => setSection(item.id)}><span className="admin-nav-icon">{item.icon}</span><span><strong>{item.label}</strong><small>{item.hint}</small></span><b>↗</b></button>)}</div><div className="admin-panel"><p className="eyebrow">RECENT ORDERS</p><h3>Sales & fulfillment</h3>{orders.length ? orders.slice(0, 5).map((o) => <div className="admin-overview-order" key={o.id}><div><strong>Order #{o.id}</strong><small>{o.email}</small></div><span>{money(o.total_cents)}</span></div>) : <p>No orders yet. New checkout orders will appear here.</p>}<button type="button" className="admin-text-button" onClick={() => setSection("orders")}>Open order manager ↗</button></div></div>
          </>}
          {section === "artists" && <div className="admin-section-content"><div className="admin-section-intro"><p>Add and maintain artist profiles, then assign work from the Artwork section.</p><span>{artists.length} artists</span></div><form className="admin-panel admin-form-panel" onSubmit={createArtist}><div><p className="eyebrow">NEW PROFILE</p><h3>Add an artist</h3></div><label>Artist name<input name="artist_name" required maxLength={180} placeholder="Artist name"/></label><label>Short bio<textarea name="artist_bio" rows={3} placeholder="A few words about the artist"/></label><button className="admin-link">Create artist ↗</button></form><div className="admin-panel"><div className="admin-section-heading"><div><p className="eyebrow">GALLERY ROSTER</p><h3>Artists</h3></div></div>{artists.length === 0 ? <p>No artists yet. Create the first profile above.</p> : <div className="admin-artist-grid">{artists.map((artist) => <article className="admin-artist-card" key={artist.id}><span className="admin-artist-monogram">{artist.name.slice(0, 1).toUpperCase()}</span><div><h4>{artist.name}</h4><p>/{artist.slug}</p><small>{artworks.filter((a) => a.artist_id === artist.id).length} artwork(s)</small>{artist.bio && <p className="admin-artist-bio">{artist.bio}</p>}</div></article>)}</div>}</div></div>}
          {section === "artwork" && <div className="admin-section-content"><div className="admin-section-intro"><p>Upload an image, assign it to an artist, and control whether it is published.</p><span>{artworks.length} pieces</span></div><form className="admin-panel admin-artwork-create" onSubmit={createArtwork}><div className="admin-section-heading"><div><p className="eyebrow">ADD TO THE COLLECTION</p><h3>New artwork</h3></div></div><div className="admin-form-grid"><label>Artwork title<input name="title" required maxLength={180} placeholder="Title of the piece"/></label><label>URL slug<input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="my-new-piece"/></label><label>Artist<select name="artist_id" defaultValue=""><option value="">Unassigned / studio collection</option>{artists.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label><label>Description<textarea name="description" rows={3} placeholder="Tell the story behind the piece"/></label><label className="admin-file-field">Upload image (JPG, PNG, WebP, GIF · max 4 MB)<input name="image_file" type="file" accept="image/jpeg,image/png,image/webp,image/gif"/></label><label>Or use an existing image URL<input name="image_url" type="url" placeholder="https://…"/></label></div><div className="admin-feature-box"><label className="admin-check"><input type="checkbox" name="artist_featured"/> Feature on artist page</label><label>Artist feature order<input name="artist_featured_order" type="number" min="0" defaultValue="0"/></label><label className="admin-check"><input type="checkbox" name="site_featured"/> Feature on BUNK24 homepage</label><label>Homepage feature order<input name="site_featured_order" type="number" min="0" defaultValue="0"/></label></div><label className="admin-check"><input type="checkbox" name="published"/> Publish in shop</label><button className="admin-link">Save artwork ↗</button></form><div className="admin-panel"><div className="admin-section-heading"><div><p className="eyebrow">COLLECTION</p><h3>All artwork</h3></div></div>{artworks.length === 0 ? <p>No artwork yet. Add your first piece above.</p> : <div className="admin-artwork-list">{artworks.map((a) => <article className="admin-artwork-card" key={a.id}><div className="admin-artwork-card-heading">{imageSrc(a) ? <img className="admin-thumb" src={imageSrc(a)} alt=""/> : <div className="admin-thumb admin-thumb-empty">B24</div>}<div><h4>{a.title}</h4><p>/{a.slug} · {artists.find((x) => x.id === a.artist_id)?.name || "Unassigned"}</p><span className={"admin-status-pill" + (a.published ? " published" : "")}>{a.published ? "Published" : "Draft"}</span></div></div><div className="admin-art-controls"><label>Artist<select aria-label={"Artist for " + a.title} value={a.artist_id ?? ""} onChange={(e) => void patchArtwork(a, { artist_id: e.target.value ? Number(e.target.value) : null }, "Artist assignment updated.")}><option value="">Unassigned</option>{artists.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label className="admin-check"><input type="checkbox" checked={a.published} onChange={(e) => void patchArtwork(a, { published: e.target.checked }, "Publication setting updated.")}/> Published</label><label className="admin-check"><input type="checkbox" checked={a.artist_featured} onChange={(e) => void patchArtwork(a, { artist_featured: e.target.checked }, "Artist feature setting updated.")}/> Artist featured</label><label className="admin-check"><input type="checkbox" checked={a.site_featured} onChange={(e) => void patchArtwork(a, { site_featured: e.target.checked }, "Homepage feature setting updated.")}/> Homepage featured</label></div></article>)}</div>}</div></div>}
          {section === "featured" && <div className="admin-section-content"><div className="admin-section-intro"><p>Drag a card to change its position. Your order is saved to the database.</p><span>{featureItems.length} selected</span></div><div className="admin-panel admin-feature-manager"><div className="admin-feature-tabs"><button type="button" className={featureList === "site" ? "selected" : ""} onClick={() => { setFeatureList("site"); setDraggingId(null); }}>✳ Homepage features <span>{sortedSiteFeatures.length}</span></button><button type="button" className={featureList === "artist" ? "selected" : ""} onClick={() => { setFeatureList("artist"); setDraggingId(null); }}>♙ Artist features <span>{artworks.filter((a) => a.artist_featured).length}</span></button></div>{featureList === "artist" && <label className="admin-filter-label">Artist<select value={artistFilter} onChange={(e) => setArtistFilter(e.target.value)}><option value="all">All artists</option>{artists.map((artist) => <option key={artist.id} value={String(artist.id)}>{artist.name}</option>)}</select></label>}<div className="admin-drag-help"><span>⠿</span> Drag cards using the handle to reorder. Changes save automatically.</div>{featureItems.length === 0 ? <div className="admin-empty-state"><span>✳</span><h3>No featured pieces yet</h3><p>Open Artwork and mark pieces as featured to add them here.</p><button type="button" className="admin-link" onClick={() => setSection("artwork")}>Manage artwork ↗</button></div> : <div className="admin-feature-sort-list">{featureItems.map((art, index) => <article key={art.id} draggable onDragStart={(e) => startDrag(e, art.id)} onDragOver={(e) => { e.preventDefault(); setDropId(art.id); e.dataTransfer.dropEffect = "move"; }} onDragLeave={() => setDropId((current) => current === art.id ? null : current)} onDrop={(e) => void reorderFeatured(e, art.id)} onDragEnd={() => { setDraggingId(null); setDropId(null); }} className={"admin-feature-sort-card" + (draggingId === art.id ? " dragging" : "") + (dropId === art.id && draggingId !== art.id ? " drop-target" : "")}><span className="admin-drag-handle" title="Drag to reorder" aria-label="Drag to reorder">⠿</span><span className="admin-feature-position">{index + 1}</span>{imageSrc(art) ? <img className="admin-feature-image" src={imageSrc(art)} alt=""/> : <div className="admin-feature-image admin-thumb-empty">B24</div>}<div className="admin-feature-info"><h4>{art.title}</h4><p>{artists.find((a) => a.id === art.artist_id)?.name || "Studio collection"}</p><small>{art.published ? "Published" : "Draft"}</small></div><span className="admin-feature-order-label">ORDER {featureList === "site" ? art.site_featured_order : art.artist_featured_order}</span></article>)}</div>}<p className="admin-footnote">Tip: use the homepage tab to arrange the gallery landing page. The artist tab can be filtered to a specific artist before arranging their featured pieces.</p></div></div>}
          {section === "prints" && <div className="admin-section-content"><div className="admin-section-intro"><p>Manage print sizes, SKUs, prices, and available stock for each artwork.</p><span>{artworks.reduce((sum, art) => sum + art.variants.length, 0)} print options</span></div><form className="admin-panel admin-form-panel" onSubmit={createVariant}><div><p className="eyebrow">NEW PRINT OPTION</p><h3>Add a size & price</h3></div><label>Artwork<select name="artwork_id" required defaultValue=""><option value="" disabled>Select artwork</option>{artworks.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}</select></label><label>SKU<input name="sku" required maxLength={80} placeholder="B24-001-810"/></label><label>Print size / label<input name="label" required placeholder="8 × 10 in print"/></label><div className="admin-form-row"><label>Price (USD)<input name="price" type="number" min="0" step="0.01" required/></label><label>Starting stock<input name="inventory" type="number" min="0" step="1" required/></label></div><button className="admin-link">Save print option ↗</button></form><div className="admin-panel"><div className="admin-section-heading"><div><p className="eyebrow">CATALOG PRICING</p><h3>Print options by artwork</h3></div></div>{artworks.filter((a) => a.variants.length).length === 0 ? <p>No print options yet. Add a size and price above.</p> : artworks.filter((a) => a.variants.length).map((a) => <div className="admin-print-artwork" key={a.id}><div className="admin-print-artwork-title">{imageSrc(a) ? <img src={imageSrc(a)} alt=""/> : <div className="admin-thumb-empty">B24</div>}<div><strong>{a.title}</strong><small>{a.variants.length} print option(s)</small></div></div>{a.variants.map((v) => <div className="admin-variant-row admin-variant-edit" key={v.id}><strong>{v.sku}</strong><label>Size / label<input aria-label={"Label for " + v.sku} defaultValue={v.label} onBlur={(e) => { if (e.target.value !== v.label) void patchVariant(v, { label: e.target.value }, "Print size updated."); }}/></label><label>Price (USD)<input aria-label={"Price for " + v.sku} type="number" min="0" step="0.01" defaultValue={(v.price_cents / 100).toFixed(2)} onBlur={(e) => { const cents = Math.round(Number(e.target.value) * 100); if (Number.isFinite(cents) && cents >= 0 && cents !== v.price_cents) void patchVariant(v, { price_cents: cents }, "Print price updated."); }}/></label><label>Stock<input aria-label={"Stock for " + v.sku} type="number" min="0" defaultValue={v.inventory_quantity} onBlur={(e) => { if (Number(e.target.value) !== v.inventory_quantity) void patchVariant(v, { inventory_quantity: Number(e.target.value) }, "Inventory updated."); }}/></label></div>)}</div>)}</div></div>}
          {section === "orders" && <div className="admin-section-content"><div className="admin-section-intro"><p>Review purchases and keep fulfillment status up to date.</p><span>{orders.length} total orders</span></div><div className="admin-panel"><div className="admin-section-heading"><div><p className="eyebrow">SALES & FULFILLMENT</p><h3>Orders</h3></div></div>{orders.length === 0 ? <div className="admin-empty-state"><span>↗</span><h3>No orders yet</h3><p>Checkout orders will appear here once customers make a purchase.</p></div> : <div className="admin-orders">{orders.map((o) => <div className="admin-order" key={o.id}><div className="admin-order-details"><strong>#{o.id} · {o.email}</strong><p>{new Date(o.created_at).toLocaleDateString()} · {o.items.reduce((sum, i) => sum + i.quantity, 0)} item(s)</p></div><strong>{money(o.total_cents)}</strong><select aria-label={"Status for order " + o.id} value={o.status} onChange={(e) => void changeStatus(o, e.target.value)}><option value="pending" disabled={o.status !== "pending"}>Pending</option><option value="paid" disabled>Paid (verified payment)</option><option value="processing">Processing</option><option value="shipped">Shipped</option><option value="cancelled" disabled={o.status !== "pending"}>Cancelled</option><option value="refunded" disabled>Refunded (not configured)</option></select></div>)}</div>}</div></div>}
          <div className="admin-workspace-footer"><span>BUNK24 STUDIO WORKSPACE</span><span>Changes are saved to your gallery database.</span></div>
        </div>
      </div>}
    {notice && <p className="admin-notice" role="status">{notice}</p>}
  </section>;
}
