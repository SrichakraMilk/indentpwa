'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

interface LayoutProps {
  title: string;
  children: React.ReactNode;
}

export default function Layout({ title, children }: LayoutProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((part) => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  return (
    <main className="page-shell">
      <header className="topbar">
        <div className="topbar-brand flex items-center">
  
  {/* 30% Logo */}
  <div className="w-[20%] flex justify-center">
    <img
      src="/icons/icon-192.png"
      alt="Srichakra Logo"
      className="w-[20px] h-[20px] object-contain"
      style={{width:"50%"}}
    />
  </div>

  {/* 70% Text */}
  <div className="w-[80%]">
    <p className="brand-label" style={{color:"#038dd2"}}>Indent Management</p>
    <h1>{title}</h1>
  </div>

</div>

        <div className="topbar-controls">
          <div className="search-wrapper">
            <label htmlFor="dashboard-search" className="sr-only">
              Search
            </label>
            <input
              id="dashboard-search"
              className="search-input"
              type="search"
              placeholder="Search indents, agents, or status"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
            />
          </div>

          <div className="user-dropdown">
            <button
              type="button"
              className="profile-button"
              onClick={() => setMenuOpen((current) => !current)}
              aria-expanded={menuOpen}
            >
              <span className="user-avatar" style={{background:"#038dd2"}}>{initials}</span>
              <span className="user-name" style={{color:"#038dd2"}}>{user?.name ?? 'Account'} </span>
            </button>

            {menuOpen ? (
              <div className="dropdown-panel">
                <Link href="/profile" className="dropdown-item" onClick={() => setMenuOpen(false)}>
                  Profile
                </Link>
                <button type="button" className="dropdown-item" onClick={logout}>
                  Logout
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <nav className="subnav-links">
        <Link href="/dashboard" className={pathname === '/dashboard' ? 'active' : ''}>
          Dashboard
        </Link>
        <Link href="/indents" className={pathname?.startsWith('/indents') ? 'active' : ''}>
          Indents
        </Link>
      </nav>

      <section className="content-area">{children}</section>
    </main>
  );
}
