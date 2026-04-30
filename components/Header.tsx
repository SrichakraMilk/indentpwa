'use client';



import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';




export default function Header() {
  const { logout, agent } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

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
       {/* LEFT: Refresh */}
       <button 
        className="icon-btn"
        onClick={() => router.refresh()}
      >
        🔄
      </button>
      
      {/* CENTER: Logo + Text */}
      <div className="header-center">
        <Image 
          src="/icons/Ssmp-Logo.png" 
          alt="App logo" 
          width={170} 
          height={40}
          className="no-print"  
        />
        
      </div>

      {/* RIGHT: Menu */}
      <button 
        className="icon-btn menu-toggle-btn"
        onClick={() => setMenuOpen((open) => !open)}
      >
        ☰
      </button>

      
      <nav ref={menuRef} className={`header-menu ${menuOpen ? 'open' : ''}`}>
      
      <button
        className="icon-btn menu-close-btn"
        onClick={() => setMenuOpen(false)}
      >
        ×
      </button>
        <Link href="/dashboard" className={`menu-item ${pathname === '/dashboard' ? 'active' : ''}`}>Dashboard</Link>
        
        {!isAgent && (
          <>
            <Link href="/routes" className={`menu-item ${pathname === '/routes' ? 'active' : ''}`}>Routes</Link>
            <Link href="/agents" className={`menu-item ${pathname === '/agents' ? 'active' : ''}`}>Agents</Link>
          </>
        )}

        <Link href="/indent" className={`menu-item ${pathname === '/indent' ? 'active' : ''}`}>Indents</Link>
        <Link href="/payments" className={`menu-item ${pathname === '/payments' ? 'active' : ''}`}>Payments</Link>
        <Link href="/invoice" className={`menu-item ${pathname === '/invoice' ? 'active' : ''}`}>Invoice</Link>
        
        <Link href="/delivery-challan" className={`menu-item ${pathname === '/delivery-challan' ? 'active' : ''}`}>Delivery Challans</Link>

        {isAgent && (
          <>
            <Link href="/orders" className={`menu-item ${pathname === '/orders' ? 'active' : ''}`}>Orders</Link>
            <Link href="/help" className={`menu-item ${pathname === '/help' ? 'active' : ''}`}>Help</Link>
            <Link href="/catalog" className={`menu-item ${pathname === '/catalog' ? 'active' : ''}`}>Catalog</Link>

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