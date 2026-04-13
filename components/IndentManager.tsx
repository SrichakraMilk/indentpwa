'use client';

import { useEffect, useState } from 'react';
import {
  deleteIndentApi,
  fetchIndentsApi,
  IndentRecord,
  IndentStatus,
  updateIndentStatusApi,
  linkedEntityId
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
  const [remarks, setRemarks] = useState('');

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

  const handleStatusUpdate = async (_id: string, nextStatus: string, actionRemarks?: string) => {
    try {
      const response = await fetch(`/api/indents?id=${encodeURIComponent(_id)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus, remarks: actionRemarks })
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

  // Normalize turn-based logic
  const isBM = userRoleCode === 'BM' || userRoleCode === 'ABM' || userRoleCode?.includes('BRANCH MANAGER');
  const isAM = userRoleCode === 'AM' || userRoleCode?.includes('AREA MANAGER');
  const isGM = userRoleCode === 'GM' || userRoleCode?.includes('GM') || userRoleCode?.includes('GENERAL MANAGER');
  
  const myActualRoles = [userRoleCode || ''];
  if (isBM) { myActualRoles.push('BM', 'ABM'); }
  if (isAM) { myActualRoles.push('AM'); }
  if (isGM) { myActualRoles.push('GM'); }

  const visibleIndents = Array.isArray(indents)
    ? indents.filter((indent) => {
        const s = (indent.status || '').toLowerCase();
        const currentStep = (indent.currentStep || 'SE').toUpperCase();
        
        const IApproved = indent.approvalLog?.some(log => 
          myActualRoles.includes((log.role || '').toUpperCase()) && log.status === 'Approved'
        );
        const IRejected = indent.approvalLog?.some(log => 
          myActualRoles.includes((log.role || '').toUpperCase()) && log.status === 'Rejected'
        );

        if (filterStatus === 'pending') {
          // If the global status is not pending, it's not pending for anyone
          if (s !== 'pending') return false;
          
          // It's pending globally. Is it MY turn to approve?
          const isMyTurn = myActualRoles.includes(currentStep);
          
          // OR, is it MY indent (I am the agent)?
          const currentUserId = String(agent?._id || agent?.id || agent?.userId || '');
          const indentAgentId = String(linkedEntityId(indent.agent) || '');
          const indentCreatorId = String(linkedEntityId(indent.createdBy) || '');
          
          const isMyIndent = (currentUserId !== '') && (currentUserId === indentAgentId || currentUserId === indentCreatorId);

          // If I am an Agent/AGT, I should see all my pending indents
          const isAgent = userRoleCode === 'AGENT' || userRoleCode === 'AGT';
          if (isAgent && isMyIndent) return true;

          return isMyTurn || isMyIndent;
        }

        if (filterStatus === 'approved') {
          // It's globally approved OR I specifically approved it and it's still in workflow
          if (s === 'approved') return true;
          if (s === 'pending' && IApproved) return true;
          return false;
        }

        if (filterStatus === 'rejected') {
          // It's globally rejected OR I specifically rejected it
          if (s === 'rejected') return true;
          if (s === 'pending' && IRejected) return true;
          return false;
        }

        if (filterStatus === 'fulfilled') {
          return s === 'fulfilled';
        }

        return s === (filterStatus || 'pending').toLowerCase();
      })
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
              const currentIndentStep = (indent.currentStep || 'SE').toUpperCase();
              const isTurn = (indent.status || '').toLowerCase() === 'pending' && myActualRoles.includes(currentIndentStep);
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
                      <div className="status-label-container" style={{ display: 'flex', gap: '8px' }}>
                         <span className="pill status-pending" style={{ fontSize: '10px' }}>Your Turn</span>
                      </div>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <p style={{ margin: 0 }}>
                Status:{' '}
                <span className={`pill status-${selectedIndent.status?.toLowerCase()}`}>
                  {selectedIndent.status}
                </span>
              </p>
              
              {/* Approval Actions in Details Modal */}
              {((selectedIndent.status || '').toLowerCase() === 'pending' && 
                myActualRoles.includes((selectedIndent.currentStep || '').toUpperCase() || 'SE')) && (
                <div style={{ marginTop: '10px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 600 }}>
                    Add Comment (Optional)
                  </label>
                  <textarea
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid #ddd',
                      fontSize: '14px',
                      marginBottom: '12px',
                      minHeight: '60px',
                      fontFamily: 'inherit'
                    }}
                    placeholder="Enter approval/rejection reason..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                  />
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button 
                      className="pill status-approved" 
                      style={{ border: 'none', cursor: 'pointer', padding: '10px 20px', fontWeight: 600, borderRadius: '8px' }}
                      onClick={() => {
                          handleStatusUpdate(selectedIndent._id, 'Approved', remarks);
                          setRemarks('');
                          setSelectedIndent(null);
                      }}
                    >
                      Approve Indent
                    </button>
                    <button 
                      className="pill status-rejected" 
                      style={{ border: 'none', cursor: 'pointer', padding: '10px 20px', fontWeight: 600, borderRadius: '8px' }}
                      onClick={() => {
                          handleStatusUpdate(selectedIndent._id, 'Rejected', remarks);
                          setRemarks('');
                          setSelectedIndent(null);
                      }}
                    >
                      Reject Indent
                    </button>
                  </div>
                </div>
              )}
            </div>

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
