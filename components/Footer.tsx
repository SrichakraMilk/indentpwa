'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <div className="bottom-nav">

      <Link href="/dashboard" className={isActive('/dashboard') ? 'active' : ''}>
        <span>🏠</span>
        <p>Home</p>
      </Link>

      <Link href="/indent" className={isActive('/indent') ? 'active' : ''}>
        <span>📅</span>
        <p>Indents</p>
      </Link>

      <Link href="/invoice" className={isActive('/invoice') ? 'active' : ''}>
        <span>📄</span>
        <p>Invoice</p>
      </Link>

      <Link href="/profile" className={isActive('/profile') ? 'active' : ''}>
        <span>👤</span>
        <p>Profile</p>
      </Link>

    </div>
  );
}