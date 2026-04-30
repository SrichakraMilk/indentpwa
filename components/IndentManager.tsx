'use client';

import { useEffect, useState } from 'react';
import NewIndentModal, { IndentEditData } from './NewIndentModal';
import {
  deleteIndentApi,
  fetchIndentsApi,
  IndentRecord,
  IndentStatus,
  fetchDcApi,
  updateDcStatusApi,
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editData, setEditData] = useState<IndentEditData | undefined>(undefined);
  const [selectedIndent, setSelectedIndent] = useState<IndentRecord | null>(null);
  const [showDcDetails, setShowDcDetails] = useState(false);
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
  const isGM = userRoleCode === 'GM' || userRoleCode?.includes('GENERAL MANAGER');
  const isAE = userRoleCode === 'AE' || userRoleCode?.includes('ACCOUNTS EXECUTIVE');
  const isAI = userRoleCode === 'AI' || userRoleCode?.includes('ACCOUNTS INCHARGE');
  const isDS = userRoleCode === 'DS' || userRoleCode?.includes('DISPATCH SUPERVISOR');

  const myActualRoles = [userRoleCode || ''];
  if (isBM) { myActualRoles.push('BM', 'ABM'); }
  if (isAM) { myActualRoles.push('AM'); }
  if (isGM) { myActualRoles.push('GM'); }
  if (isAE) { myActualRoles.push('AE'); }
  if (isAI) { myActualRoles.push('AI'); }

  const visibleIndents = Array.isArray(indents)
    ? indents.filter((indent) => {
      const s = (indent.status || '').toLowerCase();
      const currentStep = (indent.currentStep || 'SE').toUpperCase();

      const myIds = [agent?._id, agent?.id, agent?.userId].filter(Boolean).map(id => String(id));
      const targetAgentId = linkedEntityId(indent.agent);
      const targetCreatorId = linkedEntityId(indent.createdBy);

      const isMyIndent = myIds.some(myId =>
        myId === String(targetAgentId || '') ||
        myId === String(targetCreatorId || '') ||
        myId === String(linkedEntityId(indent.executive) || '') ||
        myId === String(linkedEntityId(indent.branchManager) || '') ||
        myId === String(linkedEntityId(indent.areaManager) || '') ||
        myId === String(linkedEntityId(indent.branch?.executive) || '') ||
        myId === String(linkedEntityId(indent.branch?.branchManager) || '') ||
        myId === String(linkedEntityId(indent.branch?.areaManager) || '')
      );

      const userBranchId = String(linkedEntityId(agent?.branch) || '');
      const indentBranchId = String(linkedEntityId(indent.branch) || '');
      const isMyBranch = !!userBranchId && userBranchId === indentBranchId;

      const userPlantId = String(linkedEntityId(agent?.plant) || '');
      const indentPlantId = String(linkedEntityId(indent.plant) || '');
      const isMyPlant = !!userPlantId && userPlantId === indentPlantId;

      // Is it currently this user's turn acting as a supervisor?
      const isMyTurnForRole = myActualRoles.includes(currentStep);
      const myJurisdiction = (isAM && isMyPlant) || isMyBranch || isMyIndent;
      const isMyTurnActive = (s === 'pending') && isMyTurnForRole && myJurisdiction;

      // Corporate oversight: GM+, AE, AI usually see everything or use API filtering
      const isCorporate = isGM || isAE || isAI || userRoleCode === 'ADMIN';

      const isAgent = userRoleCode === 'AGENT' || userRoleCode === 'AGT';

      // Final ownership check:
      // 1. Corporate / Admin see everything the API returns.
      // 2. Supervisors (AM, BM, SE) also see whatever the API returns (as it's already filtered to their jurisdiction).
      // 3. Agents only see it if they are the owner/creator.
      const isSupervisor = isAM || isBM || userRoleCode === 'SE' || userRoleCode === 'SALES EXECUTIVE';

      const canView = isCorporate || isSupervisor || isMyIndent;
      if (!canView) return false;

      // --- Cycle Awareness Logic ---
      // Find the index of the most recent submission/resubmission to distinguish between cycles.
      const approvalLog = indent.approvalLog || [];
      const lastSubmissionIndex = approvalLog.reduce((idx, log, i) => {
        const status = (log.status || '').toLowerCase();
        return (status === 'submitted' || status === 'resubmitted') ? i : idx;
      }, -1);

      // Only evaluate actions taken in the current cycle (after the latest submission)
      const currentCycleLogs = approvalLog.slice(lastSubmissionIndex + 1);

      const IApproved = currentCycleLogs.some(log =>
        myActualRoles.includes((log.role || '').toUpperCase()) && log.status === 'Approved'
      );
      const IRejected = currentCycleLogs.some(log =>
        myActualRoles.includes((log.role || '').toUpperCase()) && log.status === 'Rejected'
      );
      // -----------------------------

      if (filterStatus === 'pending') {
        if (s !== 'pending') return false;

        const isAgent = userRoleCode === 'AGENT' || userRoleCode === 'AGT';
        if (isAgent) return isMyIndent;

        // Supervisors/corporate see pending indents in their jurisdiction
        // BUT only if they haven't already taken action (Approved/Rejected) in this cycle.
        if (IApproved || IRejected) return false;

        return true;
      }

      if (filterStatus === 'approved') {
        if (s === 'approved') return true;
        const isAgent = userRoleCode === 'AGENT' || userRoleCode === 'AGT';
        if (isAgent) return isMyIndent && s === 'approved';
        if (s === 'pending' && IApproved) return true;
        return false;
      }

      if (filterStatus === 'rejected') {
        if (s === 'rejected') return true;
        if (s === 'pending' && IRejected) return true;
        return false;
      }

      if (filterStatus === 'fulfilled') {
        return s === 'fulfilled';
      }

      return s === (filterStatus || 'pending').toLowerCase();
    })
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
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
              const formattedDate = indent.createdAt ? new Date(indent.createdAt).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              }) : '';

              return (
                <li
                  key={indent._id}
                  className="indent-card-small indent-card-clickable"
                  onClick={() => setSelectedIndent(indent)}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span className={`pill status-${(indent.status || '').toLowerCase()}`}>
                        {indent.status || 'Pending'}
                      </span>
                      <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 500 }}>
                        {formattedDate}
                      </span>
                    </div>

                    {/* Primary: Route + Agent */}

                    {indent.agent && (
                      <h3 style={{ margin: '5px 4px', padding: '5px 0', fontSize: '15px', fontWeight: 600, color: '#374151' }}>
                        👤 {[
                          (indent.agent as any)?.fname,
                          (indent.agent as any)?.lname
                        ].filter(Boolean).join(' ') || '—'}
                        {((indent.agent as any)?.agentCode || (indent.agent as any)?.userid)
                          ? <span style={{ fontWeight: 400, color: '#6b7280', fontSize: '12px' }}> · {(indent.agent as any).agentCode || (indent.agent as any).userid}</span>
                          : null}
                      </h3>
                    )}
                    <p style={{ marginTop: '6px', marginBottom: '2px', fontSize: '13px', fontWeight: 400, color: '#111827' }}>
                      {(indent.route as any)?.name || (indent.route as any)?.code || 'Unknown Route'}
                    </p>

                    {/* Secondary: Indent number */}
                    <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#9ca3af', fontWeight: 500 }}>
                      {indent.indentNumber}
                    </p>

                    {(indent.status || '').toLowerCase() === 'pending' && indent.currentStep && (
                      <p style={{ fontSize: '12px', fontWeight: 600, color: '#0e7490', marginTop: '4px' }}>
                        {(() => {
                          const step = (indent.currentStep || '').toUpperCase();
                          if (step === 'SE') return 'Pending SE approval';
                          if (step === 'ABM' || step === 'BM') return 'Pending Branch Manager approval';
                          if (step === 'AM') return 'Pending Area Manager approval';
                          if (step === 'GM') return 'Pending GM Sales approval';
                          if (step === 'AE') return 'Pending Accounts Executive approval';
                          if (step === 'AI') return 'Pending Accounts Incharge approval';
                          return `Step: ${indent.currentStep}`;
                        })()}
                      </p>
                    )}
                    <p style={{ fontSize: '12px', opacity: 0.6, margin: 0 }}>
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
          <div
            className="indent-details-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxHeight: '90vh',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div className="indent-details-header" style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 10, paddingBottom: '10px' }}>
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

            {/* Meta info: Route, Agent */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px', padding: '10px 12px', background: '#f8fafc', borderRadius: '10px', fontSize: '13px' }}>
              {selectedIndent.route && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280', fontWeight: 500 }}>Route</span>
                  <span style={{ fontWeight: 600, color: '#1e40af' }}>
                    {selectedIndent.route?.name || '—'}
                    {selectedIndent.route?.code ? ` (${selectedIndent.route.code})` : ''}
                  </span>
                </div>
              )}
              {selectedIndent.agent && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280', fontWeight: 500 }}>Agent</span>
                  <span style={{ fontWeight: 600 }}>
                    {[selectedIndent.agent?.fname, selectedIndent.agent?.lname].filter(Boolean).join(' ') || '—'}
                    {selectedIndent.agent?.agentCode ? (
                      <span style={{ marginLeft: '6px', fontSize: '11px', color: '#6b7280', fontWeight: 400 }}>
                        ({selectedIndent.agent.agentCode})
                      </span>
                    ) : selectedIndent.agent?.userid ? (
                      <span style={{ marginLeft: '6px', fontSize: '11px', color: '#6b7280', fontWeight: 400 }}>
                        ({selectedIndent.agent.userid})
                      </span>
                    ) : null}
                  </span>
                </div>
              )}
            </div>

            <p className="indent-details-remarks">{selectedIndent.remarks || 'No remarks available'}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <p style={{ margin: 0 }}>
                Status:{' '}
                <span className={`pill status-${selectedIndent.status?.toLowerCase()}`}>
                  {selectedIndent.status}
                </span>
                {(selectedIndent.status || '').toLowerCase() === 'pending' && selectedIndent.currentStep && (
                  <span style={{ marginLeft: '10px', fontSize: '13px', fontWeight: 600, color: '#0e7490' }}>
                    ({(() => {
                      const step = (selectedIndent.currentStep || '').toUpperCase();
                      if (step === 'SE') return 'Pending SE approval';
                      if (step === 'ABM' || step === 'BM') return 'Pending Branch Manager approval';
                      if (step === 'AM') return 'Pending Area Manager approval';
                      if (step === 'GM') return 'Pending GM Sales approval';
                      if (step === 'AE') return 'Pending Accounts Executive approval';
                      if (step === 'AI') return 'Pending Accounts Incharge approval';
                      return step;
                    })()})
                  </span>
                )}
              </p>
            </div>

            {selectedIndent.deliveryChallan && (
              <div
                className="dc-link-card"
                style={{
                  marginBottom: '20px',
                  padding: '12px',
                  backgroundColor: '#f0f9ff',
                  borderRadius: '10px',
                  border: '1px solid #bae6fd',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <p style={{ margin: 0, fontSize: '12px', color: '#0369a1', fontWeight: 600 }}>DELIVERY CHALLAN</p>
                  <p style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>{selectedIndent.deliveryChallan.dcNumber || 'Generated'}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowDcDetails(true); }}
                  style={{ padding: '6px 12px', backgroundColor: '#0ea5e9', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600 }}
                >
                  View Link
                </button>
              </div>
            )}

            <h4>Items</h4>
            {selectedIndent.items?.length ? (
              <div style={{ overflowX: 'auto', marginTop: '10px' }}>
                <table className="indent-modal-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead>
                    <tr className="indent-modal-table-header-row" style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                      <th style={{ padding: '8px' }}>Category</th>
                      <th style={{ padding: '8px' }}>Product</th>
                      <th style={{ padding: '8px' }}>Size</th>
                      <th style={{ padding: '8px' }}>Unit</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>Qty</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>Price</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedIndent.items.map((item, idx) => {
                      const qty = item.quantity ?? item.qty ?? 0;
                      const price = item.price ?? 0;
                      const qtyPerUnit = item.qtyPerUnit ?? 1;
                      const amount = item.amount ?? (qty * qtyPerUnit * price);
                      return (
                        <tr key={`${selectedIndent._id}-${idx}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px' }}>{item.categoryName || '-'}</td>
                          <td style={{ padding: '8px', fontWeight: 500 }}>{item.productName || item.productId || 'Unknown'}</td>
                          <td style={{ padding: '8px' }}>{item.size || '-'}</td>
                          <td style={{ padding: '8px' }}>{item.unitName || '-'}</td>
                          <td style={{ padding: '8px', textAlign: 'right' }}>{qty}</td>
                          <td style={{ padding: '8px', textAlign: 'right' }}>
                            {price > 0 ? (
                              qtyPerUnit > 1 ? (
                                <div style={{ fontSize: '0.85em', color: '#64748b', lineHeight: '1.2' }}>
                                  ₹{price.toFixed(2)} × {qtyPerUnit}
                                  <br /><span style={{ color: '#0f172a' }}>= ₹{(price * qtyPerUnit).toFixed(2)}</span>
                                </div>
                              ) : `₹${price.toFixed(2)}`
                            ) : '-'}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600, color: '#15803d' }}>
                            {amount > 0 ? `₹${amount.toFixed(2)}` : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
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
            {/* Action Buttons */}
            <div className="indent-actions" style={{ marginTop: '20px', borderTop: '1px solid #e5e7eb', paddingTop: '15px' }}>
              {(() => {
                const s = (selectedIndent.status || '').toLowerCase();
                const currentStep = (selectedIndent.currentStep || '').toUpperCase();
                const isTurn = s === 'pending' && myActualRoles.includes(currentStep);
                const isRejected = s === 'rejected';

                // Ownership check for Resubmit
                const myIds = [agent?._id, agent?.id, agent?.userId].filter(Boolean).map(id => String(id));
                const targetAgentId = linkedEntityId(selectedIndent.agent);
                const targetCreatorId = linkedEntityId(selectedIndent.createdBy);
                const isMyIndent = myIds.some(myId => myId === String(targetAgentId || '') || myId === String(targetCreatorId || ''));
                const isAgentUser = myActualRoles.some(r => r === 'AGENT' || r === 'AGT' || r.includes('SALES AGENT'));

                if (isTurn) {
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <textarea
                        style={{
                          width: '100%',
                          padding: '10px',
                          borderRadius: '8px',
                          border: '1px solid #ddd',
                          fontSize: '14px',
                          minHeight: '60px'
                        }}
                        placeholder="Add a comment (optional)..."
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                      />
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          className="pill status-approved"
                          onClick={() => {
                            handleStatusUpdate(selectedIndent._id, 'Approved', remarks);
                            setRemarks('');
                            setSelectedIndent(null);
                          }}
                          style={{ flex: 1, padding: '10px', cursor: 'pointer' }}
                        >
                          Approve
                        </button>
                        <button
                          className="pill status-rejected"
                          onClick={() => {
                            handleStatusUpdate(selectedIndent._id, 'Rejected', remarks);
                            setRemarks('');
                            setSelectedIndent(null);
                          }}
                          style={{ flex: 1, padding: '10px', cursor: 'pointer' }}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  );
                }

                if (isRejected && (isAgentUser || isMyIndent)) {
                  return (
                    <button
                      className="pill status-pending"
                      style={{ width: '100%', padding: '12px', background: '#0e7490', color: '#fff', cursor: 'pointer', fontWeight: 700 }}
                      onClick={() => {
                        setEditData({
                          id: selectedIndent._id,
                          items: selectedIndent.items,
                          remarks: selectedIndent.remarks
                        });
                        setSelectedIndent(null);
                        setIsModalOpen(true);
                      }}
                    >
                      Edit & Resubmit Indent
                    </button>
                  );
                }

                return null;
              })()}
            </div>
          </div>
        </div>
      ) : null}

      <NewIndentModal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditData(undefined);
        }}
        onCreated={refresh}
        initialData={editData}
      />
      {/* DC Details Sub-Modal */}
      {showDcDetails && selectedIndent?.deliveryChallan && (
        <div className="indent-details-overlay" style={{ zIndex: 3000 }} onClick={() => setShowDcDetails(false)}>
          <div className="indent-details-card" onClick={(e) => e.stopPropagation()} style={{ background: '#fff', maxWidth: '350px' }}>
            <div className="indent-details-header">
              <h3>DC: {selectedIndent.deliveryChallan.dcNumber}</h3>
              <button type="button" className="indent-details-close" onClick={() => setShowDcDetails(false)}>×</button>
            </div>

            <div className="print-content">
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

              <div style={{ marginBottom: '15px', padding: '10px', background: '#f8fafc', borderRadius: '8px', fontSize: '13px' }}>
                <p style={{ margin: '4px 0' }}><strong>Status:</strong> {selectedIndent.deliveryChallan.status}</p>
                <p style={{ margin: '4px 0' }}><strong>Date:</strong> {new Date(selectedIndent.deliveryChallan.dcDate).toLocaleDateString()}</p>
              </div>

              <h4>Items In DC</h4>
              <ul className="indent-details-items" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {selectedIndent.deliveryChallan.items?.map((item: any, idx: number) => (
                  <li key={idx}>
                    <span>
                      {item.product?.name || 'Product'}
                      {item.size ? ` · ${item.size}` : ''}
                      {item.unit?.name ? ` · ${item.unit.name}` : ''}
                    </span>
                    <span>{item.quantity}</span>
                  </li>
                ))}
              </ul>

              <div className="signature-row">
                <div className="sig-box">Accounts Executive Signature</div>
                <div className="sig-box">Accounts Incharge Signature</div>
              </div>
            </div>

            <div className="indent-actions d-print-none" style={{ marginTop: '20px', borderTop: '1px solid #e5e7eb', paddingTop: '15px', display: 'flex', gap: '10px' }}>
              {isDS && selectedIndent.deliveryChallan.status === 'Draft' && (
                <button
                  className="confirm-btn"
                  style={{ flex: 1, backgroundColor: '#f59e0b' }}
                  onClick={async () => {
                    try {
                      await updateDcStatusApi(selectedIndent.deliveryChallan._id, 'In Progress', (agent as any).userId || (agent as any).id);
                      alert('Dispatch started');
                      setShowDcDetails(false);
                    } catch (err) {
                      alert('Failed to start dispatch');
                    }
                  }}
                >
                  🏃 Dispatch In-progress
                </button>
              )}

              {isDS && selectedIndent.deliveryChallan.status === 'In Progress' && (
                <button
                  className="confirm-btn"
                  style={{ flex: 1, backgroundColor: '#10b981' }}
                  onClick={async () => {
                    try {
                      await updateDcStatusApi(selectedIndent.deliveryChallan._id, 'Security Check', (agent as any).userId || (agent as any).id);
                      alert('Dispatch completed - moved to Security');
                      setShowDcDetails(false);
                    } catch (err) {
                      alert('Failed to complete dispatch');
                    }
                  }}
                >
                  ✅ Dispatch Completed
                </button>
              )}

              {(() => {
                const roleCode = (agent?.role as any)?.code?.toUpperCase() || "";
                const isSec = roleCode === 'SEC' || roleCode === 'SECURITY';
                if (isSec && selectedIndent.deliveryChallan.status === 'Security Check') {
                  return (
                    <button
                      className="confirm-btn"
                      style={{ flex: 1, backgroundColor: '#8b5cf6' }}
                      onClick={async () => {
                        try {
                          await updateDcStatusApi(selectedIndent.deliveryChallan._id, 'Approved', (agent as any).userId || (agent as any).id);
                          alert('Security Cleared - Indent Fulfilled');
                          setShowDcDetails(false);
                        } catch (err) {
                          alert('Failed to clear security');
                        }
                      }}
                    >
                      ✅ Security Checked
                    </button>
                  );
                }
                return null;
              })()}

              {(() => {
                const roleCode = (agent?.role as any)?.code?.toUpperCase() || "";
                const isRestricted = ['DS', 'SEC', 'SECURITY', 'SUP', 'AGENT', 'AGT'].includes(roleCode);
                if (isRestricted) return null;

                return (
                  <button
                    className="confirm-btn"
                    style={{ flex: 1, backgroundColor: '#2563eb' }}
                    onClick={() => window.print()}
                  >
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
