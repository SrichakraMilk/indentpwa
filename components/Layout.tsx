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
        <div className="topbar-brand">
          <div className="brand-mark">I</div>
          <div>
            <p className="brand-label">Indent PWA</p>
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
              <span className="user-avatar">{initials}</span>
              <span className="user-name">{user?.name ?? 'Account'}</span>
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
