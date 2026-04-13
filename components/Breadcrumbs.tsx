'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Breadcrumbs() {
  const pathname = usePathname();
  
  // Don't show on login or root
  if (!pathname || pathname === '/' || pathname === '/login') return null;

  const pathSegments = pathname.split('/').filter((v) => v.length > 0);

  return (
    <nav aria-label="Breadcrumb" className="breadcrumb-nav">
      <ul className="breadcrumb-list">
        <li>
          <Link href="/dashboard">Home</Link>
        </li>
        {pathSegments.map((segment, index) => {
          const href = `/${pathSegments.slice(0, index + 1).join('/')}`;
          const isLast = index === pathSegments.length - 1;
          const label = segment.charAt(0).toUpperCase() + segment.slice(1);

          // If Home is already the first segment (e.g. /dashboard), skip repeating it
          if (segment.toLowerCase() === 'dashboard' && index === 0) return null;

          return (
            <li key={href}>
              <span className="breadcrumb-separator">/</span>
              {isLast ? (
                <span className="breadcrumb-current">{label}</span>
              ) : (
                <Link href={href}>{label}</Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
