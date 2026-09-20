import Link from "next/link";

export function ProductHeader({ title }: { title?: string }) {
  return <header className="topbar product-header">
    <Link href="/" className="brand" aria-label="Mashwara home">MASHWARA <span className="brand-urdu urdu" lang="ur" dir="rtl">مشورہ</span></Link>
    {title && <span className="topbar-context">{title}</span>}
    <nav aria-label="Main navigation" className="product-navigation">
      <Link className="liquid-button" href="/visits">Your visits</Link>
      <Link className="liquid-button button" href="/visit/new?new=1">New visit</Link>
      <Link className="liquid-button" href="/pharmacist">Pharmacist console</Link>
    </nav>
  </header>;
}
