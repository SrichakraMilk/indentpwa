'use client';

import { useEffect, useState } from 'react';
import { fetchDcApi, DcRecord, updateDcStatusApi } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

interface DcManagerProps {
  status?: string;
  refreshKey?: number;
}

export default function DcManager({ status, refreshKey }: DcManagerProps) {
  const { agent } = useAuth();
  const [dcs, setDcs] = useState<DcRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDc, setSelectedDc] = useState<DcRecord | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await fetchDcApi({ status });
        setDcs(data);
      } catch (error) {
        console.error('Failed to load DCs', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [status, refreshKey]);

  return (
    <div className="card indent-card">
      <section className="list-section">
        <h2>{status ? `${status} Delivery Challans` : 'All Delivery Challans'}</h2>

        {loading ? (
          <p>Loading challans…</p>
        ) : dcs.length === 0 ? (
          <p>No delivery challans found.</p>
        ) : (
          <ul className="indent-list">
            {dcs.map((dc) => (
              <li
                key={dc._id}
                className="indent-card-small indent-card-clickable"
                onClick={() => setSelectedDc(dc)}
              >
                <div style={{ flex: 1 }}>
                  <span className={`pill status-${dc.status.toLowerCase()}`}>
                    {dc.status}
                  </span>
                  <h3>{dc.dcNumber}</h3>
                  <p style={{ fontSize: '13px', color: '#666' }}>
                    Agent: {dc.agent.fname} {dc.agent.lname}
                  </p>
                  <p style={{ fontSize: '12px', opacity: 0.7 }}>
                    Route: {dc.route.name} | Items: {dc.items?.length || 0}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {selectedDc && (
        <div className="indent-details-overlay" onClick={() => setSelectedDc(null)}>
          <div className="indent-details-card" onClick={(e) => e.stopPropagation()}>
            <div className="indent-details-header">
              <h3>{selectedDc.dcNumber}</h3>
              <button
                type="button"
                className="indent-details-close"
                onClick={() => setSelectedDc(null)}
              >
                ×
              </button>
            </div>
            
            <div className="dc-details-content print-container">
              {/* PRINT ONLY STYLES */}
              <style jsx>{`
                @media print {
                  .indent-details-header, .indent-actions, .confirm-btn, .indent-details-close { display: none !important; }
                  .indent-details-overlay { position: absolute !important; display: block !important; padding: 0 !important; background: white !important; }
                  .indent-details-card { width: 100% !important; max-width: 100% !important; box-shadow: none !important; border: none !important; margin: 0 !important; }
                  .print-header { display: flex !important; align-items: center !important; border-bottom: 2px solid #000 !important; padding-bottom: 10px !important; margin-bottom: 20px !important; }
                  .signature-row { display: flex !important; justify-content: space-between !important; margin-top: 50px !important; padding-top: 10px !important; }
                }
                .print-header { display: none; margin-bottom: 20px; }
                .signature-row { display: none; }
                .sig-box { border-top: 1px solid #000; width: 45%; text-align: center; padding-top: 5px; font-weight: 600; font-size: 11px; }
              `}</style>
              
              <div className="print-header">
                <div style={{ width: '80px' }}>
                  <img src="/assets/logo.png" alt="Srichakra" style={{ maxHeight: '40px', width: 'auto' }} />
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <h3 style={{ margin: 0, color: '#2563eb' }}>Srichakra Milk Products LLP</h3>
                  <h4 style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '14px' }}>Delivery Challan</h4>
                </div>
                <div style={{ width: '80px' }}></div>
              </div>

              <div className="dc-meta" style={{ marginBottom: '15px', padding: '10px', background: '#f9fafb', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <p style={{ margin: '2px 0' }}><strong>DC No:</strong> {selectedDc.dcNumber}</p>
                    <p style={{ margin: '2px 0' }}><strong>Date:</strong> {new Date(selectedDc.dcDate).toLocaleDateString()}</p>
                  </div>
                  <p style={{ margin: '2px 0' }}><strong>Agent:</strong> {selectedDc.agent.fname} {selectedDc.agent.lname} ({selectedDc.agent.userid})</p>
                  <p style={{ margin: '2px 0' }}><strong>Route:</strong> {selectedDc.route.name}</p>
                  <p style={{ margin: '2px 0' }}><strong>Indent:</strong> {selectedDc.indent.indentNumber}</p>
              </div>

              <h4>Items</h4>
              <ul className="indent-details-items">
                {selectedDc.items.map((item, idx) => (
                  <li key={idx}>
                    <span>
                      {item.product.name}
                      {item.size ? ` · ${item.size}` : ''}
                    </span>
                    <span>{item.quantity}</span>
                  </li>
                ))}
              </ul>

              {(() => {
                const totalQty = selectedDc.items?.reduce((sum, i) => sum + (i.quantity || 0), 0) || 0;
                const totalCrates = selectedDc.items?.reduce((sum, item) => {
                  const unit = (item.unit?.name || item.unit || '').toLowerCase();
                  return unit.includes('crate') ? sum + (item.quantity || 0) : sum;
                }, 0) || 0;
                const totalBuckets = selectedDc.items?.reduce((sum, item) => {
                  const unit = (item.unit?.name || item.unit || '').toLowerCase();
                  return unit.includes('bucket') ? sum + (item.quantity || 0) : sum;
                }, 0) || 0;

                return (
                  <div style={{ 
                    marginTop: '15px', 
                    padding: '12px', 
                    background: '#f8fafc', 
                    border: '1px solid #e2e8f0', 
                    borderRadius: '8px',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                    fontSize: '13px',
                    color: '#334155'
                  }}>
                    <div>Total Qty: <strong style={{ color: '#0f172a' }}>{totalQty}</strong></div>
                    <div style={{ textAlign: 'right' }}>Crates: <strong style={{ color: '#0f172a' }}>{totalCrates}</strong></div>
                    <div>Buckets: <strong style={{ color: '#0f172a' }}>{totalBuckets}</strong></div>
                  </div>
                );
              })()}

              {selectedDc.remarks && (
                <div style={{ marginTop: '15px' }}>
                  <h4>Remarks</h4>
                  <p style={{ fontSize: '12px', color: '#4b5563' }}>{selectedDc.remarks}</p>
                </div>
              )}

              <div className="signature-row">
                <div className="sig-box">Accounts Executive Signature</div>
                <div className="sig-box">Accounts Incharge Signature</div>
              </div>
            </div>

            <div className="indent-actions d-print-none" style={{ marginTop: '20px', borderTop: '1px solid #e5e7eb', paddingTop: '15px', display: 'flex', gap: '10px' }}>
               {(() => {
                 const roleCode = (agent?.role as any)?.code?.toUpperCase() || "";
                 const isDS = roleCode === 'DS';
                 const isSec = roleCode === 'SEC' || roleCode === 'SECURITY';

                 return (
                   <>
                    {isDS && selectedDc.status === 'Draft' && (
                      <button 
                        className="confirm-btn" 
                        style={{ flex: 1, background: '#f59e0b' }} 
                        onClick={async () => {
                          try {
                              await updateDcStatusApi(selectedDc._id, 'In Progress', (agent as any).userId || (agent as any).id);
                              alert('Dispatch started');
                              setSelectedDc(null);
                          } catch (err) {
                              alert('Failed to start dispatch');
                          }
                        }}
                      >
                        🏃 Dispatch In-progress
                      </button>
                    )}

                    {isDS && selectedDc.status === 'In Progress' && (
                      <button 
                        className="confirm-btn" 
                        style={{ flex: 1, background: '#10b981' }} 
                        onClick={async () => {
                          try {
                              await updateDcStatusApi(selectedDc._id, 'Security Check', (agent as any).userId || (agent as any).id);
                              alert('Dispatch completed - moved to Security');
                              setSelectedDc(null);
                          } catch (err) {
                              alert('Failed to complete dispatch');
                          }
                        }}
                      >
                        ✅ Dispatch Completed
                      </button>
                    )}

                    {isSec && selectedDc.status === 'Security Check' && (
                      <button 
                        className="confirm-btn" 
                        style={{ flex: 1, background: '#8b5cf6' }} 
                        onClick={async () => {
                          try {
                              await updateDcStatusApi(selectedDc._id, 'Approved', (agent as any).userId || (agent as any).id);
                              alert('Security Cleared - Indent Fulfilled');
                              setSelectedDc(null);
                          } catch (err) {
                              alert('Failed to clear security');
                          }
                        }}
                      >
                        ✅ Security Checked
                      </button>
                    )}
                   </>
                 );
               })()}

               {(() => {
                 const roleCode = (agent?.role as any)?.code?.toUpperCase() || "";
                 const isRestricted = ['DS', 'SEC', 'SECURITY', 'SUP', 'AGENT', 'AGT'].includes(roleCode);
                 if (isRestricted) return null;
                 
                 return (
                   <button className="confirm-btn" style={{ flex: 1, background: '#2563eb' }} onClick={() => window.print()}>
                      🖨️ Print DC
                   </button>
                 );
               })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
