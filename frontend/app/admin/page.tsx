import AdminClient from "./admin-client";

export const metadata = { title: "Studio Admin | BUNK24", description: "Artwork, inventory, and order workspace for BUNK24." };

export default function AdminPage() {
  return <main className="admin-route"><AdminClient /></main>;
}
