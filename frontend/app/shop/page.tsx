import Link from "next/link";

const catalog = [
  { id: "b24-001", title: "Blue Hour", kind: "Original study", price: "$85", status: "Original work", image: "photo-1541961017774-22349e4a1262" },
  { id: "b24-002", title: "Wildflower / 24", kind: "Fine art print", price: "$42", status: "Edition of 50", image: "photo-1579783902614-a3fb3927b6a5" },
  { id: "b24-003", title: "A Quiet Noise", kind: "Fine art print", price: "$38", status: "Open edition", image: "photo-1577083552431-6e5fd01aa342" },
  { id: "b24-004", title: "Soft Collision", kind: "Fine art print", price: "$45", status: "Limited edition", image: "photo-1578301978693-85fa9c0320b9" },
  { id: "b24-005", title: "After the Rain", kind: "Fine art print", price: "$38", status: "Open edition", image: "photo-1577083288073-40892c0860a4" },
  { id: "b24-006", title: "Color Has Memory", kind: "Fine art print", price: "$52", status: "Limited edition", image: "photo-1549490349-8643362247b5" },
];
export default function ShopPage() {
  return <main><header className="site-header"><Link className="wordmark" href="/">BUNK<span>24</span><i>®</i></Link><nav><Link href="/shop">Shop prints</Link><Link href="/#about">The artist</Link><Link href="/#contact">Contact</Link></nav><Link className="header-cta" href="/">Back to home ↗</Link></header>
    <section className="shop-page"><div className="shop-intro"><div><p className="eyebrow">THE BUNK24 COLLECTION / 2026</p><h1>Art for your<br/><em>everyday.</em></h1></div><p>A rotating collection of original work and art prints by TURNER. Pick something that feels like you.</p></div>
      <div className="shop-grid">{catalog.map(item=><article className="work-card shop-card" key={item.id}><div className="work-image" style={{backgroundImage:"url(https://images.unsplash.com/"+item.image+"?auto=format&fit=crop&w=900&q=85)"}}><span>{item.id.toUpperCase()}</span><b>↗</b></div><div className="shop-tag">{item.status}</div><div className="work-meta"><div><h3>{item.title}</h3><p>{item.kind}</p></div><span>{item.price}</span></div></article>)}</div>
      <p className="eyebrow" style={{marginTop:50}}>MORE WORK IS ALWAYS IN PROGRESS · QUESTIONS? <a href="mailto:studio@bunk24.com">GET IN TOUCH ↗</a></p>
    </section><footer className="footer"><Link className="wordmark" href="/">BUNK<span>24</span><i>®</i></Link><p>© 2026 BUNK24 STUDIO · ART BY TURNER</p><div><Link href="/">HOME</Link><a href="mailto:studio@bunk24.com">CONTACT</a></div></footer></main>;
}