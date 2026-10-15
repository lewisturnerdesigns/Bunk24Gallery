import Link from "next/link";
import AdminClient from "./admin-client";

export const metadata = { title: "Studio Admin", description: "Artwork, inventory, and order workspace for BUNK24." };

export default function AdminPage() {
  return <main>
    <header className="site-header"><Link className="wordmark" href="/">BUNK<span>24</span><i>®</i></Link><nav><Link href="/">View gallery ↗</Link></nav><span className="eyebrow">STUDIO WORKSPACE</span></header>
    <AdminClient />
    <footer className="footer"><Link className="wordmark" href="/">BUNK<span>24</span><i>®</i></Link><p>PRIVATE STUDIO WORKSPACE · BUNK24</p><Link href="/">BACK TO GALLERY ↗</Link></footer>
  </main>;
}
