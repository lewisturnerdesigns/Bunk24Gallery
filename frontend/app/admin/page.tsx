import Link from "next/link";

export default function AdminPage() {
  return <main><header className="site-header"><Link className="wordmark" href="/">BUNK<span>24</span><i>®</i></Link><nav><Link href="/">View gallery ↗</Link></nav><span className="eyebrow">STUDIO WORKSPACE</span></header>
    <section className="admin-page"><div className="admin-top"><div><p className="eyebrow">BUNK24 / CONTROL ROOM</p><h1>Good work, organized.</h1><p>Your starting point for managing the TURNER collection.</p></div><span className="shop-tag">FOUNDATION VERSION</span></div>
      <div className="admin-stats"><div className="admin-stat"><span>ARTWORKS</span><strong>06</strong></div><div className="admin-stat"><span>ORDERS</span><strong>—</strong></div><div className="admin-stat"><span>FULFILLMENT</span><strong>—</strong></div></div>
      <div className="admin-panel"><h2>Artwork & print variants</h2><p>The database model supports artwork, multiple print sizes, SKU, inventory quantity, and price. Connect the protected API endpoints before using this as a live inventory console.</p><Link className="admin-link" href="/shop">Preview public collection ↗</Link></div>
      <div className="admin-panel"><h2>Orders & fulfillment</h2><p>Order and line-item schema is included in the backend foundation. Production order status should be updated only after verified payment webhooks and fulfillment actions.</p><a className="admin-link" href="http://localhost:8000/docs">Open API docs ↗</a></div>
      <div className="admin-panel"><h2>Before going live</h2><p>This is an admin landing page, not an authenticated admin console yet. Set a strong JWT secret, provision an admin account securely, and protect every write endpoint before adding real customer or order data.</p></div>
    </section></main>;
}