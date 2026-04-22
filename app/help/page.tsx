'use client';

import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import ProtectedPage from '@/components/ProtectedPage';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface Person {
  fname?: string;
  lname?: string;
  mobile?: string;
  userid?: string;
}

function fullName(p?: Person | null): string {
  return `${p?.fname ?? ''} ${p?.lname ?? ''}`.trim() || '—';
}

function ContactCard({
  role,
  icon,
  person,
  note,
}: {
  role: string;
  icon: string;
  person?: Person | null;
  note?: string;
}) {
  const name = fullName(person);
  const mobile = person?.mobile?.trim();

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '22px' }}>{icon}</span>
        <div>
          <p style={{ margin: 0, fontSize: '11px', color: '#6b7280', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{role}</p>
          <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#111827' }}>{name}</p>
        </div>
      </div>

      {note && (
        <p style={{ margin: 0, fontSize: '11px', color: '#9ca3af' }}>{note}</p>
      )}

      {mobile ? (
        <a
          href={`tel:${mobile}`}
          style={{
            marginTop: '4px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: '#1e3a8a',
            color: '#fff',
            borderRadius: '8px',
            padding: '8px 14px',
            fontSize: '13px',
            fontWeight: 600,
            textDecoration: 'none',
            width: 'fit-content',
          }}
        >
          📞 {mobile}
        </a>
      ) : (
        <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#9ca3af' }}>No contact number on file</p>
      )}
    </div>
  );
}

export default function HelpPage() {
  const { agent } = useAuth();

  const executive = agent?.branch?.executive ?? agent?.executive;
  const branchMgr = agent?.branch?.branchManager ?? agent?.branchManager;
  const areaMgr = agent?.branch?.areaManager ?? agent?.areaManager;
  const branchName = agent?.branch?.name;
  const routeName = agent?.route?.name;

  return (
    <ProtectedPage>
      <div className="dashboard-container">
        <Header />
        <main className="page-shell">
          <p className="module-back-nav">
            <Link href="/dashboard">← Dashboard</Link>
          </p>

          <h1 className="page-title">Help & Support</h1>

          {/* Context pill */}
          {(branchName || routeName) && (
            <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '20px' }}>
              {branchName && <span>Branch: <strong>{branchName}</strong></span>}
              {branchName && routeName && <span style={{ margin: '0 8px' }}>·</span>}
              {routeName && <span>Route: <strong>{routeName}</strong></span>}
            </p>
          )}

          {/* Approval chain */}
          <section style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#374151', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Your Approval Chain
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <ContactCard
                role="Sales Executive"
                icon="👤"
                person={executive}
                note="First approver for your indents"
              />
              <ContactCard
                role="Branch Manager"
                icon="🏢"
                person={branchMgr}
                note="Second approver"
              />
              <ContactCard
                role="Area Manager"
                icon="🗺️"
                person={areaMgr}
                note="Final approver"
              />
            </div>
          </section>

          {/* General help */}
          <section>
            <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#374151', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Quick Help
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { q: 'How do I create an indent?', a: 'Go to Indent → tap the + button → fill in the products and quantities → submit.' },
                { q: 'Why is my indent pending?', a: 'Indents go through approval: Sales Executive → Branch Manager → Area Manager. Contact your approving authority above if its delayed.' },
                { q: 'What if a product is missing from the list?', a: 'Contact your Sales Executive to request the product to be added to the catalog.' },
                { q: 'How do I check my credit limit?', a: 'Your current credit limit is shown on your Dashboard home screen.' },
              ].map(({ q, a }) => (
                <div key={q} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '12px 14px' }}>
                  <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '13px', color: '#111827' }}>{q}</p>
                  <p style={{ margin: 0, fontSize: '12px', color: '#6b7280', lineHeight: 1.5 }}>{a}</p>
                </div>
              ))}
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </ProtectedPage>
  );
}
