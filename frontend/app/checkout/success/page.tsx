import Link from "next/link";

export const metadata = {
  title: "Checkout received",
  description: "Your BUNK24 checkout has returned successfully.",
};

export default function CheckoutSuccessPage() {
  return <main className="checkout-result">
    <header className="site-header"><Link className="wordmark" href="/">BUNK<span>24</span><i>®</i></Link><nav><Link href="/shop">Shop prints</Link><Link href="/">Home</Link></nav></header>
    <section className="checkout-result-card"><p className="eyebrow">BUNK24 / ORDER UPDATE</p><div className="success-mark">✓</div><h1>Thank you for<br/><em>collecting art.</em></h1><p>Your checkout has returned to BUNK24. Payment confirmation is handled securely by Stripe, and order status updates after the verified payment notification reaches our server.</p><p>If you have a question about an order, email <a href="mailto:studio@bunk24.com">studio@bunk24.com</a>.</p><Link className="button" href="/shop">Back to the collection <span>↗</span></Link></section>
    <footer className="footer"><Link className="wordmark" href="/">BUNK<span>24</span><i>®</i></Link><p>ART BY TURNER · BUNK24 STUDIO</p></footer>
  </main>;
}
