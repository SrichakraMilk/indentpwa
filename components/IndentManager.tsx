'use client';

import { useEffect, useState } from 'react';
import {
  deleteIndentApi,
  fetchIndentsApi,
  IndentRecord,
  IndentStatus,
  updateIndentStatusApi
} from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

const statusOptions: IndentStatus[] = ['pending', 'approved', 'rejected', 'fulfilled'];
const statusLabelMap: Record<IndentStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  fulfilled: 'Fulfilled'
};

interface IndentManagerProps {
  filterStatus?: IndentStatus;
  viewOnly?: boolean;
  refreshKey?: number;
}

export default function IndentManager({ filterStatus, viewOnly = false, refreshKey = 0 }: IndentManagerProps) {
  const { token, agent } = useAuth();
  const [indents, setIndents] = useState<IndentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndent, setSelectedIndent] = useState<IndentRecord | null>(null);

  const userRoleCode = (agent?.role as { code?: string })?.code?.toUpperCase();

  const fetchIndentsFromAPI = async () => {
    try {
      const indentsArray = await fetchIndentsApi();
      setIndents(indentsArray);
    } catch (error) {
      console.error('Error fetching indents:', error);
      setIndents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIndentsFromAPI();
  }, [refreshKey]);

  const refresh = async () => {
    await fetchIndentsFromAPI();
  };

  const handleDelete = async (_id: string) => {
    try {
      await deleteIndentApi(_id, token);
      await refresh();
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const handleStatusUpdate = async (_id: string, nextStatus: string) => {
    try {
      const response = await fetch(`/api/indents?id=${encodeURIComponent(_id)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus })
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Update failed');
      }
      await refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Update error');
    }
  };

  const visibleIndents = Array.isArray(indents)
    ? filterStatus
      ? indents.filter(
          (indent) => (indent.status || '').toLowerCase() === filterStatus.toLowerCase()
        )
      : indents
    : [];

  const listHeading = filterStatus 
    ? `${statusLabelMap[filterStatus] || (filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1))} Indents` 
    : 'All Indents';

  return (
    <div className="card indent-card">
      <section className="list-section">
        <h2>{listHeading}</h2>

        {loading ? (
          <p>Loading indents…</p>
        ) : visibleIndents.length === 0 ? (
          <p>No indents found{filterStatus ? ` for ${filterStatus}` : ''}.</p>
        ) : (
          <ul className="indent-list">
            {visibleIndents.map((indent) => {
              const isTurn = (indent.status || '').toLowerCase() === 'pending' && indent.currentStep === userRoleCode;
              return (
                <li
                  key={indent._id}
                  className="indent-card-small indent-card-clickable"
                  onClick={() => setSelectedIndent(indent)}
                >
                  <div style={{ flex: 1 }}>
                    <span className={`pill status-${(indent.status || '').toLowerCase()}`}>
                      {indent.status || 'Pending'}
                    </span>
                    <h3>{indent.indentNumber}</h3>
                    {(indent.status || '').toLowerCase() === 'pending' && indent.currentStep && (
                      <p style={{ fontSize: '13px', fontWeight: 600, color: '#0e7490', marginTop: '4px' }}>
                        Step: {indent.currentStep}
                      </p>
                    )}
                    <p style={{ fontSize: '12px', opacity: 0.7 }}>
                      Items: {indent.items?.length || 0}
                    </p>
                  </div>

                  <div className="indent-actions" onClick={(e) => e.stopPropagation()}>
                    {isTurn && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          className="pill status-approved" 
                          style={{ border: 'none', cursor: 'pointer', fontSize: '12px' }}
                          onClick={() => handleStatusUpdate(indent._id, 'Approved')}
                        >
                          Approve
                        </button>
                        <button 
                          className="pill status-rejected" 
                          style={{ border: 'none', cursor: 'pointer', fontSize: '12px' }}
                          onClick={() => handleStatusUpdate(indent._id, 'Rejected')}
                        >
                          Reject
                        </button>
                      </div>
                    )}

                    {!viewOnly && !isTurn && (
                      <button
                        type="button"
                        className="ghost-button"
                        style={{ padding: '4px 8px', fontSize: '12px', color: '#dc2626' }}
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this?')) {
                            handleDelete(indent._id);
                          }
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {selectedIndent ? (
        <div className="indent-details-overlay" onClick={() => setSelectedIndent(null)}>
          <div className="indent-details-card" onClick={(e) => e.stopPropagation()}>
            <div className="indent-details-header">
              <h3>{selectedIndent.indentNumber}</h3>
              <button
                type="button"
                className="indent-details-close"
                onClick={() => setSelectedIndent(null)}
                aria-label="Close indent details"
              >
                ×
              </button>
            </div>
            <p className="indent-details-remarks">{selectedIndent.remarks || 'No remarks available'}</p>
            <p>
              Status:{' '}
              <span className={`pill status-${selectedIndent.status?.toLowerCase()}`}>
                {selectedIndent.status}
              </span>
            </p>
            <h4>Items</h4>
            {selectedIndent.items?.length ? (
              <ul className="indent-details-items">
                {selectedIndent.items.map((item, idx) => {
                  const qty = item.quantity ?? item.qty;
                  return (
                    <li key={`${selectedIndent._id}-${idx}`}>
                      <span>
                        {item.productName || item.productId || 'Unknown product'}
                        {item.size ? ` · ${item.size}` : ''}
                      </span>
                      <span>{qty}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p>No items available.</p>
            )}

            {selectedIndent.approvalLog && selectedIndent.approvalLog.length > 0 && (
              <div className="approval-log-section" style={{ marginTop: '20px' }}>
                <h4>Approval History</h4>
                <div className="approval-log-list" style={{ fontSize: '12px' }}>
                  {selectedIndent.approvalLog.map((log, idx) => (
                    <div key={idx} style={{ padding: '8px 0', borderBottom: '1px solid #eee' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                        <span>{log.role}</span>
                        <span className={`pill status-${log.status.toLowerCase()}`} style={{ fontSize: '10px' }}>
                          {log.status}
                        </span>
                      </div>
                      {log.remarks && <p style={{ margin: '4px 0', color: '#666' }}>{log.remarks}</p>}
                      <p style={{ margin: 0, opacity: 0.6, fontSize: '10px' }}>
                        {new Date(log.updatedAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
