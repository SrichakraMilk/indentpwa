'use client';



import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';




export default function Header() {
  const { logout, agent } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  const role = agent?.role && typeof agent.role === 'object' 
    ? (agent.role as { name?: string; code?: string }) 
    : undefined;
  const roleName = (role?.name ?? role?.code ?? '').trim();
  const isAgent = roleName === 'Agent' || roleName === 'AGT';

  return (
    <div className="dashboard-header">
      <div className="header-left">
        <Image src="/icons/icon-192.png" className="logo" alt="App logo" width={70} height={70} />
      </div>
      <div className="header-actions">
        <button className="icon-btn" onClick={() => router.refresh()} title="Refresh">
          🔄
        </button>
        <button className="icon-btn menu-toggle-btn" onClick={() => setMenuOpen((open) => !open)} title="Menu" aria-label="Menu">
          ☰
        </button>
      </div>
      <nav ref={menuRef} className={`header-menu${menuOpen ? ' open' : ''}`}>
        <button
          className="icon-btn menu-close-btn"
          onClick={() => setMenuOpen(false)}
          aria-label="Close menu"
        >
          ×
        </button>
        <Link href="/dashboard" className="menu-item">Dashboard</Link>
        
        {!isAgent && (
          <>
            <Link href="/routes" className="menu-item">Routes</Link>
            <Link href="/agents" className="menu-item">Agents</Link>
          </>
        )}

        <Link href="/indents" className="menu-item">Indents</Link>
        <Link href="/payments" className="menu-item">Payments</Link>
        <Link href="/invoice" className="menu-item">Invoice</Link>
        <Link href="/catalog" className="menu-item">Catalog</Link>

        {isAgent && (
          <>
            <Link href="/orders" className="menu-item">Orders</Link>
            <Link href="/help" className="menu-item">Help</Link>
          </>
        )}

        <button type="button" onClick={handleLogout} className="menu-item menu-logout-btn">
          Logout
        </button>
      </nav>
    </div>
  );
// ...existing code...

}