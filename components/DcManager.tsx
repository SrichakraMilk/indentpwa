'use client';

import { useEffect, useState } from 'react';
import { fetchDcApi, DcRecord } from '@/lib/api';

interface DcManagerProps {
  status?: string;
  refreshKey?: number;
}

export default function DcManager({ status, refreshKey }: DcManagerProps) {
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
            
            <div className="dc-meta" style={{ marginBottom: '15px', padding: '10px', background: '#f9fafb', borderRadius: '8px' }}>
                <p style={{ margin: '2px 0' }}><strong>Agent:</strong> {selectedDc.agent.fname} {selectedDc.agent.lname} ({selectedDc.agent.userid})</p>
                <p style={{ margin: '2px 0' }}><strong>Route:</strong> {selectedDc.route.name}</p>
                <p style={{ margin: '2px 0' }}><strong>Indent:</strong> {selectedDc.indent.indentNumber}</p>
                <p style={{ margin: '2px 0' }}><strong>Date:</strong> {new Date(selectedDc.dcDate).toLocaleDateString()}</p>
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

            {selectedDc.remarks && (
              <div style={{ marginTop: '15px' }}>
                <h4>Remarks</h4>
                <p style={{ fontSize: '12px', color: '#4b5563' }}>{selectedDc.remarks}</p>
              </div>
            )}

            <div className="indent-actions" style={{ marginTop: '20px', borderTop: '1px solid #e5e7eb', paddingTop: '15px' }}>
               <button className="confirm-btn" style={{ width: '100%', background: '#2563eb' }} onClick={() => window.print()}>
                  🖨️ Print Challan
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
