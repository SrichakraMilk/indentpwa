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
  const { token } = useAuth();
  const [indents, setIndents] = useState<IndentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndent, setSelectedIndent] = useState<IndentRecord | null>(null);

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

  const handleStatusUpdate = async (_id: string, nextStatus: IndentStatus) => {
    try {
      await updateIndentStatusApi(_id, nextStatus, token);
      await refresh();
    } catch (error) {
      console.error('Update error:', error);
    }
  };

  const visibleIndents = Array.isArray(indents)
    ? filterStatus
      ? indents.filter(
          (indent) => indent.status?.toLowerCase() === filterStatus
        )
      : indents
    : [];

  const cardTitlePrefix = filterStatus ? statusLabelMap[filterStatus] : 'Indent';
  const listHeading = filterStatus ? `${statusLabelMap[filterStatus]} Indents` : 'All Indents';

  return (
    <div className="card indent-card">
      {/* {viewOnly && (
        <div className="view-only-banner">
          Agent role can only view indents in this section.
        </div>
      )} */}

      <section className="list-section">
        <h2>{listHeading}</h2>

        {loading ? (
          <p>Loading indents…</p>
        ) : visibleIndents.length === 0 ? (
          <p>No indents found{filterStatus ? ` for ${filterStatus}` : ''}.</p>
        ) : (
          <ul className="indent-list">
            {visibleIndents.map((indent) => (
              <li
                key={indent._id}
                className="indent-card-small indent-card-clickable"
                onClick={() => setSelectedIndent(indent)}
              >
                <div>
                <span
                    className={`pill status-${indent.status?.toLowerCase()}`}
                  >
                    {indent.status}
                  </span>
                  <h3>{indent.indentNumber}</h3>
                  {/* <p>{indent.remarks || 'No remarks available'}</p> */}
                  {/* Optional: show item count */}
                  <p style={{ fontSize: '12px', opacity: 0.7 }}>
                    Items: {indent.items?.length || 0}
                  </p>
                </div>

                {!viewOnly && (
                  <div className="indent-actions" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={indent.status.toLowerCase()}
                      onChange={(e) =>
                        handleStatusUpdate(
                          indent._id,
                          e.target.value as IndentStatus
                        )
                      }
                    >
                      {statusOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => handleDelete(indent._id)}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </li>
            ))}
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
          </div>
        </div>
      ) : null}
    </div>
  );
}
