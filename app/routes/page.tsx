'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import ProtectedPage from '@/components/ProtectedPage';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useAuth } from '@/components/AuthProvider';
import { fetchRoutesApi, fetchIndentsApi, linkedEntityId, type SalesRouteRow } from '@/lib/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function RoutesPage() {
  const { token, agent, initializing } = useAuth();
  const [rows, setRows] = useState<SalesRouteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const filterOptions = useMemo(() => {
    const plantId = agent ? linkedEntityId(agent.plant) : undefined;
    const branchId = agent ? linkedEntityId(agent.branch) : undefined;
    return { plantId, branchId };
  }, [agent]);

  const filterSummary = useMemo(() => {
    const parts: string[] = [];
    if (filterOptions.plantId) parts.push(`plant ${filterOptions.plantId}`);
    if (filterOptions.branchId) parts.push(`branch ${filterOptions.branchId}`);
    return parts.length ? `Filtered by ${parts.join(', ')}.` : 'Showing all active routes.';
  }, [filterOptions]);

  const load = useCallback(async () => {
    if (!token) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const hasFilter = Boolean(filterOptions.plantId || filterOptions.branchId);
      const data = await fetchRoutesApi(hasFilter ? filterOptions : undefined, token);
      setRows(data);
    } catch (e) {
      setRows([]);
      setError(e instanceof Error ? e.message : 'Could not load routes.');
    } finally {
      setLoading(false);
    }
  }, [token, filterOptions]);

  useEffect(() => {
    if (initializing) return;
    void load();
  }, [initializing, load]);

  const handleDownloadApprovedIndents = async () => {
    if (!token || !agent?.route?.id) return;
    setDownloading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const indents = await fetchIndentsApi(
        { status: 'Approved', date: today, route: agent.route.id },
        token
      );

      if (indents.length === 0) {
        alert('No approved indents found for this route today.');
        return;
      }

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header
      doc.setFontSize(18);
      doc.text('Approved Indents Report', pageWidth / 2, 15, { align: 'center' });
      doc.setFontSize(10);
      doc.text(`Route: ${agent.route.name} (${agent.route.code})`, 14, 25);
      doc.text(`Executive: ${agent.fname} ${agent.lname}`, 14, 30);
      doc.text(`Date: ${today}`, 14, 35);

      // Consolidated Summary
      doc.setFontSize(14);
      doc.text('Consolidated Route Summary', 14, 45);

      const itemsSummary: Record<string, { name: string; qty: number; unit: string }> = {};
      const agentDetails: Record<string, { name: string; indents: string[] }> = {};

      indents.forEach(indent => {
        const agentName = `${indent.agent?.fname ?? ''} ${indent.agent?.lname ?? ''}`.trim() || 'Unknown Agent';
        if (!agentDetails[agentName]) agentDetails[agentName] = { name: agentName, indents: [] };
        agentDetails[agentName].indents.push(indent.indentNumber);

        indent.items.forEach(item => {
          const key = `${item.productName}_${item.unitName}_${item.size ?? ''}`;
          if (!itemsSummary[key]) {
            itemsSummary[key] = {
              name: item.productName || 'Unknown Product',
              qty: 0,
              unit: item.unitName || ''
            };
          }
          itemsSummary[key].qty += (item.quantity || 0);
        });
      });

      const summaryData = Object.values(itemsSummary).map(item => [
        item.name,
        item.qty.toString(),
        item.unit
      ]);

      autoTable(doc, {
        startY: 50,
        head: [['Product', 'Total Quantity', 'Unit']],
        body: summaryData,
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235] }
      });

      // Agent Breakdown
      const finalY = (doc as any).lastAutoTable.finalY + 15;
      doc.setFontSize(14);
      doc.text('Agent Breakdown', 14, finalY);

      const agentData = Object.values(agentDetails).map(a => [
        a.name,
        a.indents.join(', ')
      ]);

      autoTable(doc, {
        startY: finalY + 5,
        head: [['Agent Name', 'Approved Indents']],
        body: agentData,
        theme: 'grid',
        headStyles: { fillColor: [107, 114, 128] }
      });

      doc.save(`Approved_Indents_${agent.route.code}_${today}.pdf`);
    } catch (e) {
      console.error(e);
      alert('Failed to generate report.');
    } finally {
      setDownloading(false);
    }
  };

  const isSalesExecutive = agent?.role?.name?.toLowerCase().includes('sales executive') || agent?.role?.code === 'SE';

  return (
    <ProtectedPage>
      <div className="dashboard-container">
        <Header />
        <main className="page-shell">
          <p className="module-back-nav">
            <Link href="/dashboard">← Dashboard</Link>
          </p>
          <div className="flex justify-between items-center">
            <h1 className="page-title">Routes</h1>
            {isSalesExecutive && (
              <button 
                onClick={handleDownloadApprovedIndents}
                disabled={downloading}
                className="btn btn--primary flex items-center gap-2"
                style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold' }}
              >
                {downloading ? '⌛ Generating...' : '📥 Download Route Indents'}
              </button>
            )}
          </div>
          <p className="module-description">{filterSummary}</p>

          {error ? (
            <div className="routes-banner routes-banner--error" role="alert">
              {error}
            </div>
          ) : null}

          {loading ? (
            <p className="routes-muted">Loading routes…</p>
          ) : rows.length === 0 ? (
            <p className="routes-muted">No routes to display.</p>
          ) : (
            <div className="routes-table-wrap">
              <table className="routes-table">
                <thead>
                  <tr>
                    <th scope="col">Code</th>
                    <th scope="col">Name</th>
                    <th scope="col">Plant</th>
                    <th scope="col">Branch</th>
                    <th scope="col">Executive</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td className="routes-table-mono">{r.code}</td>
                      <td>
                        <span className="routes-name">{r.name}</span>
                        {r.description ? (
                          <span className="routes-desc">{r.description}</span>
                        ) : null}
                      </td>
                      <td>{r.plantLabel ?? '—'}</td>
                      <td>{r.branchLabel ?? '—'}</td>
                      <td>{r.executiveLabel ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && rows.length > 0 ? (
            <p className="routes-footnote">
              {rows.length} route{rows.length === 1 ? '' : 's'}
            </p>
          ) : null}
        </main>
        <Footer />
      </div>
    </ProtectedPage>
  );
}
