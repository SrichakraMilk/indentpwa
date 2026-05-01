'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ClipboardList, Receipt, User } from 'lucide-react';

export default function Footer() {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <div className="bottom-nav">

      <Link href="/dashboard" className={isActive('/dashboard') ? 'active' : ''}>
        <span style={{ display: 'flex', justifyContent: 'center' }}><Home size={24} strokeWidth={1.5} /></span>
        <p>Home</p>
      </Link>

      <Link href="/indent" className={isActive('/indent') ? 'active' : ''}>
        <span style={{ display: 'flex', justifyContent: 'center' }}><ClipboardList size={24} strokeWidth={1.5} /></span>
        <p>Indents</p>
      </Link>

      <Link href="/invoice" className={isActive('/invoice') ? 'active' : ''}>
        <span style={{ display: 'flex', justifyContent: 'center' }}><Receipt size={24} strokeWidth={1.5} /></span>
        <p>Invoice</p>
      </Link>

      <Link href="/profile" className={isActive('/profile') ? 'active' : ''}>
        <span style={{ display: 'flex', justifyContent: 'center' }}><User size={24} strokeWidth={1.5} /></span>
        <p>Profile</p>
      </Link>

    </div>
  );
}
