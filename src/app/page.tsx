import Link from "next/link";

export default function Home() {
  return (
    <main style={{ padding: 40, fontFamily: "sans-serif" }}>
      <h1>Memory Arena</h1>
      <p>Game state logic + scene stub. Real landing page lives elsewhere.</p>
      <Link href="/play">Enter the game →</Link>
    </main>
  );
}
