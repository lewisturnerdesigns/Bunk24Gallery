"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
type FeaturedArtwork = { id: number; slug: string; title: string; description: string; image_url: string; site_featured: boolean; site_featured_order: number; variants: { price_cents: number; label: string }[] };

const pieces = [
  { n: "01", title: "Blue Hour", kind: "Original study · Abstract", price: "$85", img: "photo-1541961017774-22349e4a1262" },
  { n: "02", title: "Wildflower / 24", kind: "Fine art print · Edition of 50", price: "$42", img: "photo-1579783902614-a3fb3927b6a5" },
  { n: "03", title: "A Quiet Noise", kind: "Fine art print · Open edition", price: "$38", img: "photo-1577083552431-6e5fd01aa342" },
];
export default function Home() {
  const [featuredArtworks, setFeaturedArtworks] = useState<FeaturedArtwork[]>([]);
  useEffect(() => { fetch(api + "/api/artworks").then((response) => response.ok ? response.json() : []).then((data: FeaturedArtwork[]) => setFeaturedArtworks(data.filter((item) => item.site_featured).sort((a, b) => a.site_featured_order - b.site_featured_order))).catch(() => setFeaturedArtworks([])); }, []);
  return <main>
    <div className="announcement">ART FOR THE WALLS YOU LIVE WITH <b>—</b> PRINTS & ORIGINAL WORK</div>
    <header className="site-header"><Link className="wordmark" href="/">BUNK<span>24</span><i>®</i></Link><nav><Link href="/shop">Shop prints</Link><a href="#about">The artist</a><a href="#contact">Contact</a></nav><Link className="header-cta" href="/shop">Explore the work ↗</Link></header>
    <section className="hero"><div><p className="eyebrow">— INDEPENDENT ART STUDIO · ATLANTA, GA</p><h1>Make room<br/>for <em>feeling.</em></h1><p className="intro">Art with a pulse. Original work and thoughtfully made prints by TURNER — built from color, memory, and a little beautiful chaos.</p><div className="actions"><Link className="button" href="/shop">Shop the collection <span>↗</span></Link><a className="text-link" href="#featured">See selected work ↓</a></div><p className="note">✳ &nbsp; MADE WITH INTENTION<br/><strong>　　 Collected, not mass-produced.</strong></p></div><div className="hero-art"><div className="hero-image"/><div className="stamp">B24<small>STUDIO<br/>EDITION</small></div><p className="caption">FIG. 001 — COLOR STUDY <span>TURNER / 2026</span></p></div><div className="index">01 <b>—</b> 04</div></section>
    <div className="ticker">ART THAT FEELS LIKE SOMETHING　✳　MADE TO LIVE WITH　✳　COLLECT WHAT MOVES YOU　✳　ART THAT FEELS LIKE SOMETHING　✳</div>
    <section className="featured section" id="featured"><div className="section-heading"><div><p className="eyebrow">THE WORK / 001—003</p><h2>A few things<br/><em>worth living with.</em></h2></div><Link className="text-link" href="/shop">View all work ↗</Link></div><div className="art-grid">{(featuredArtworks.length ? featuredArtworks.slice(0,3).map((a,i)=>({n:String(i+1).padStart(2,"0"),title:a.title,kind:a.description || "Featured artwork",price:a.variants[0] ? new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(a.variants[0].price_cents/100) : "View work",img:a.image_url})) : pieces).map(p=><Link href="/shop" className="work-card" key={p.n+p.title}><div className="work-image" style={{backgroundImage:p.img.startsWith("http") ? "url("+p.img+")" : "url(https://images.unsplash.com/"+p.img+"?auto=format&fit=crop&w=1000&q=85)"}}><span>{p.n}</span><b>↗</b></div><div className="work-meta"><div><h3>{p.title}</h3><p>{p.kind}</p></div><span>{p.price}</span></div></Link>)}</div></section>
    <section className="manifesto" id="about"><div className="big-mark">B<span>24</span></div><div><p className="eyebrow">A NOTE FROM THE STUDIO</p><h2>Not just something<br/>to look at. Something<br/><em>to feel.</em></h2></div><div className="manifesto-copy"><p>TURNER makes work for people who want their spaces to say something. Pieces with texture, movement, and a point of view — made to be lived with, not just scrolled past.</p><Link className="text-link" href="/shop">Find your piece ↗</Link></div></section>
    <section className="newsletter" id="contact"><div><p className="eyebrow">NOTES FROM BUNK24</p><h2>Good art.<br/><em>Occasional emails.</em></h2></div><div><p>New work, print releases, and a little behind-the-scenes from the studio. No noise.</p><a className="button light" href="mailto:studio@bunk24.com">Say hello ↗</a></div></section>
    <footer className="footer"><Link className="wordmark" href="/">BUNK<span>24</span><i>®</i></Link><p>© 2026 BUNK24 STUDIO · ART BY TURNER</p><div><Link href="/shop">SHOP</Link><a href="mailto:studio@bunk24.com">CONTACT</a><Link href="/admin">ADMIN</Link></div></footer>
  </main>;
}