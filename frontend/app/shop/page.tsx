import Link from "next/link";
import ShopClient from "./shop-client";

export const metadata = {
  title: "Shop the collection",
  description: "Browse and collect fine art prints and original work by TURNER at BUNK24.",
};

export default function ShopPage() {
  return <main>
    <header className="site-header">
      <Link className="wordmark" href="/">BUNK<span>24</span><i>®</i></Link>
      <nav><Link href="/shop">Shop prints</Link><Link href="/#about">The artist</Link><Link href="/#contact">Contact</Link></nav>
      <Link className="header-cta" href="/">Back to home ↗</Link>
    </header>
    <section className="shop-page"><ShopClient /></section>
    <footer className="footer"><Link className="wordmark" href="/">BUNK<span>24</span><i>®</i></Link><p>© 2026 BUNK24 STUDIO · ART BY TURNER</p><div><Link href="/">HOME</Link><a href="mailto:studio@bunk24.com">CONTACT</a></div></footer>
  </main>;
}
