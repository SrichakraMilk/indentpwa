'use client';

import { useEffect, useState } from 'react';
import NewIndentModal, { IndentEditData } from './NewIndentModal';
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
        
        const IApproved = indent.approvalLog?.some(log => 
          myActualRoles.includes((log.role || '').toUpperCase()) && log.status === 'Approved'
        );
        const IRejected = indent.approvalLog?.some(log => 
          myActualRoles.includes((log.role || '').toUpperCase()) && log.status === 'Rejected'
        );

        if (filterStatus === 'pending') {
          if (s !== 'pending') return false;
          
          const isMyTurn = myActualRoles.includes(currentStep);
          
          const myIds = [agent?._id, agent?.id, agent?.userId].filter(Boolean).map(id => String(id));
          const targetAgentId = linkedEntityId(indent.agent);
          const targetCreatorId = linkedEntityId(indent.createdBy);
          
          const isMyIndent = myIds.some(myId => myId === String(targetAgentId || '') || myId === String(targetCreatorId || ''));

          const isAgent = userRoleCode === 'AGENT' || userRoleCode === 'AGT';
          if (isAgent && isMyIndent) return true;

          return isMyTurn || isMyIndent;
        }

        if (filterStatus === 'approved') {
          if (s === 'approved') return true;
          
          const isAgent = userRoleCode === 'AGENT' || userRoleCode === 'AGT';
          if (isAgent) return false;

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
                  <span>{item.product?.name || 'Product'} {item.size ? `(${item.size})` : ''}</span>
                  <span>{item.quantity}</span>
                </li>
              ))}
            </ul>

            <div className="signature-row">
              <div className="sig-box">Accounts Executive Signature</div>
              <div className="sig-box">Accounts Incharge Signature</div>
            </div>
            </div>

            <div className="indent-actions" style={{ marginTop: '20px', borderTop: '1px solid #e5e7eb', paddingTop: '15px' }}>
              <button 
                className="confirm-btn" 
                style={{ width: '100%', backgroundColor: '#0ea5e9' }}
                onClick={() => window.print()}
              >
                🖨️ Print Challan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
