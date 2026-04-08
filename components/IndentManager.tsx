'use client';

import { useEffect, useState } from 'react';
import {
  createIndent,
  deleteIndent,
  fetchIndents,
  Indent,
  IndentStatus,
  updateIndent
} from '@/lib/api';

const statusOptions: IndentStatus[] = ['pending', 'approved', 'rejected'];

export default function IndentManager() {
  const [indents, setIndents] = useState<Indent[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<IndentStatus>('pending');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadIndents() {
      const items = await fetchIndents();
      setIndents(items);
      setLoading(false);
    }

    loadIndents();
  }, []);

  const refresh = async () => {
    const items = await fetchIndents();
    setIndents(items);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    await createIndent({ title, description, status });
    setTitle('');
    setDescription('');
    setStatus('pending');
    await refresh();
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await deleteIndent(id);
    await refresh();
  };

  const handleStatusUpdate = async (id: string, nextStatus: IndentStatus) => {
    await updateIndent(id, { status: nextStatus });
    await refresh();
  };

  return (
    <div className="card indent-card">
      <section className="form-section">
        <h2>Create a new indent</h2>
        <form onSubmit={handleSubmit} className="form-grid">
          <label>
            Title
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              placeholder="Indent title"
            />
          </label>

          <label>
            Description
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              required
              placeholder="Indent details"
            />
          </label>

          <label>
            Status
            <select value={status} onChange={(event) => setStatus(event.target.value as IndentStatus)}>
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Create indent'}
          </button>
        </form>
      </section>

      <section className="list-section">
        <h2>Current indents</h2>
        {loading ? (
          <p>Loading indents…</p>
        ) : indents.length === 0 ? (
          <p>No indents yet. Create one to get started.</p>
        ) : (
          <ul className="indent-list">
            {indents.map((indent) => (
              <li key={indent.id} className="indent-card-small">
                <div>
                  <h3>{indent.title}</h3>
                  <p>{indent.description}</p>
                  <span className={`pill status-${indent.status}`}>{indent.status}</span>
                </div>

                <div className="indent-actions">
                  <select
                    value={indent.status}
                    onChange={(event) => handleStatusUpdate(indent.id, event.target.value as IndentStatus)}
                  >
                    {statusOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <button type="button" className="ghost-button" onClick={() => handleDelete(indent.id)}>
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
