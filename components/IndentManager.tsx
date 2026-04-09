'use client';

import { useEffect, useState } from 'react';

type IndentStatus = 'pending' | 'approved' | 'rejected';

interface Indent {
  _id: string;
  indentNumber: string;
  status: string;
  remarks?: string;
  items: any[];
}

const statusOptions: IndentStatus[] = ['pending', 'approved', 'rejected'];

interface IndentManagerProps {
  filterStatus?: IndentStatus;
  viewOnly?: boolean;
}

const API_URL = 'https://production.srichakramilk.com/api/indents';

export default function IndentManager({ filterStatus, viewOnly = false }: IndentManagerProps) {
  const [indents, setIndents] = useState<Indent[]>([]);
  const [loading, setLoading] = useState(true);

  // 🔹 Fetch Indents
  const fetchIndentsFromAPI = async () => {
    try {
      const res = await fetch(API_URL);
      const data = await res.json();

      console.log('API Response:', data);

      let indentsArray: Indent[] = [];

      if (Array.isArray(data)) {
        indentsArray = data;
      } else if (Array.isArray(data.indents)) {
        indentsArray = data.indents;
      } else if (Array.isArray(data.data)) {
        indentsArray = data.data;
      } else if (data.indent) {
        indentsArray = [data.indent];
      }

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
  }, []);

  const refresh = async () => {
    await fetchIndentsFromAPI();
  };

  // 🔹 Delete
  const handleDelete = async (_id: string) => {
    try {
      await fetch(`${API_URL}/${_id}`, {
        method: 'DELETE',
      });
      await refresh();
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  // 🔹 Update Status
  const handleStatusUpdate = async (_id: string, nextStatus: IndentStatus) => {
    try {
      await fetch(`${API_URL}/${_id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1), // convert to "Pending"
        }),
      });
      await refresh();
    } catch (error) {
      console.error('Update error:', error);
    }
  };

  // 🔹 Filter (handle capitalized API status)
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