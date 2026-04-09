'use client';

import { useEffect, useState } from 'react';
import {
  deleteIndentApi,
  fetchIndentsApi,
  IndentRecord,
  IndentStatus,
  updateIndentStatusApi
} from '@/lib/api';

const statusOptions: IndentStatus[] = ['pending', 'approved', 'rejected'];

interface IndentManagerProps {
  filterStatus?: IndentStatus;
  viewOnly?: boolean;
  refreshKey?: number;
}

export default function IndentManager({ filterStatus, viewOnly = false, refreshKey = 0 }: IndentManagerProps) {
  const [indents, setIndents] = useState<IndentRecord[]>([]);
  const [loading, setLoading] = useState(true);

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
      await deleteIndentApi(_id);
      await refresh();
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const handleStatusUpdate = async (_id: string, nextStatus: IndentStatus) => {
    try {
      await updateIndentStatusApi(_id, nextStatus);
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

  return (
    <div className="card indent-card">
      {viewOnly && (
        <div className="view-only-banner">
          Agent role can only view indents in this section.
        </div>
      )}

      <section className="list-section">
        <h2>Current indents</h2>

        {loading ? (
          <p>Loading indents…</p>
        ) : visibleIndents.length === 0 ? (
          <p>No indents found{filterStatus ? ` for ${filterStatus}` : ''}.</p>
        ) : (
          <ul className="indent-list">
            {visibleIndents.map((indent) => (
              <li key={indent._id} className="indent-card-small">
                <div>
                  <h3>{indent.indentNumber}</h3>
                  <p>{indent.remarks || 'No remarks available'}</p>

                  <span
                    className={`pill status-${indent.status?.toLowerCase()}`}
                  >
                    {indent.status}
                  </span>

                  {/* Optional: show item count */}
                  <p style={{ fontSize: '12px', opacity: 0.7 }}>
                    Items: {indent.items?.length || 0}
                  </p>
                </div>

                {!viewOnly && (
                  <div className="indent-actions">
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
    </div>
  );
}