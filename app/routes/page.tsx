'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
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
    const routeId = agent?.route?.id || (agent?.route as any)?._id;
    if (!token || !routeId) {
      console.warn('Download blocked: Missing token or route ID:', { token: !!token, routeId });
      alert('Your route information is missing. Please try logging out and in again.');
      return;
    }
    setDownloading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      console.log('Fetching indents for download:', { routeId, today, status: 'Approved' });
      const indents = await fetchIndentsApi(
        { status: 'Approved', date: today, route: routeId },
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
      doc.text(`Route: ${agent?.route?.name || 'N/A'} (${agent?.route?.code || 'N/A'})`, 14, 25);
      doc.text(`Executive: ${agent?.fname || ''} ${agent?.lname || ''}`, 14, 30);
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

      // Detailed Indents per Agent
      let currentY = (doc as any).lastAutoTable.finalY + 15;
      doc.setFontSize(14);
      doc.text('Detailed Indents per Agent', 14, currentY);
      currentY += 10;

      indents.forEach((indent, index) => {
        const agentName = `${indent.agent?.fname ?? ''} ${indent.agent?.lname ?? ''}`.trim() || 'Unknown Agent';
        
        // Check if we need a new page before drawing the header
        if (currentY > 260) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`${index + 1}. Agent: ${agentName} (Indent: ${indent.indentNumber})`, 14, currentY);
        doc.setFont('helvetica', 'normal');
        
        const itemRows = indent.items.map(item => [
          item.productName || '—',
          (item.quantity || 0).toString(),
          item.unitName || '—'
        ]);

        autoTable(doc, {
          startY: currentY + 5,
          head: [['Product', 'Qty', 'Unit']],
          body: itemRows,
          theme: 'grid',
          headStyles: { fillColor: [75, 85, 99] },
          margin: { left: 20 },
          styles: { fontSize: 9 }
        });

        currentY = (doc as any).lastAutoTable.finalY + 15;
      });

      doc.save(`Approved_Indents_${agent?.route?.code || 'Route'}_${today}.pdf`);
    } catch (e) {
      console.error(e);
      alert('Failed to generate report.');
    } finally {
      setDownloading(false);
    }
  };

  const [expandedRouteId, setExpandedRouteId] = useState<string | null>(null);
  const [routeIndents, setRouteIndents] = useState<Record<string, IndentRecord[]>>({});
  const [loadingIndents, setLoadingIndents] = useState<Set<string>>(new Set());

  const toggleRoute = async (routeId: string) => {
    if (expandedRouteId === routeId) {
      setExpandedRouteId(null);
      return;
    }

    setExpandedRouteId(routeId);

    if (!routeIndents[routeId]) {
      setLoadingIndents(prev => new Set(prev).add(routeId));
      try {
        const indents = await fetchIndentsApi({ route: routeId }, token);
        setRouteIndents(prev => ({ ...prev, [routeId]: indents }));
      } catch (err) {
        console.error('Failed to fetch indents for route:', routeId, err);
      } finally {
        setLoadingIndents(prev => {
          const next = new Set(prev);
          next.delete(routeId);
          return next;
        });
      }
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
          <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
            <div>
              <h1 className="page-title">Routes</h1>
              <p className="module-description" style={{ marginTop: '4px' }}>{filterSummary}</p>
            </div>
            {isSalesExecutive && (
              <button 
                onClick={handleDownloadApprovedIndents}
                disabled={downloading}
                className="btn btn--primary flex items-center gap-2"
                style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold' }}
              >
                {downloading ? '⌛ Generating...' : '📥 Download Approved Report'}
              </button>
            )}
          </div>

          {error ? (
            <div className="routes-banner routes-banner--error" role="alert" style={{ marginBottom: '1rem' }}>
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="welcome-card" style={{ padding: '40px', textAlign: 'center' }}>
               <p className="routes-muted">Loading routes list...</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="welcome-card" style={{ padding: '40px', textAlign: 'center' }}>
               <p className="routes-muted">No routes found for your jurisdiction.</p>
            </div>
          ) : (
            <div className="routes-table-wrap">
              <table className="routes-table">
                <thead>
                  <tr>
                    <th scope="col">Code</th>
                    <th scope="col">Name</th>
                    <th scope="col">Branch</th>
                    <th scope="col">Executive</th>
                    <th scope="col" style={{ textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const isExpanded = expandedRouteId === r.id;
                    const indents = routeIndents[r.id] || [];
                    const isLoading = loadingIndents.has(r.id);

                    return (
                      <Fragment key={r.id}>
                        <tr>
                          <td className="routes-table-mono">{r.code}</td>
                          <td>
                            <span className="routes-name">{r.name}</span>
                            {r.description ? (
                              <span className="routes-desc">{r.description}</span>
                            ) : null}
                          </td>
                          <td>{r.branchLabel ?? '—'}</td>
                          <td>{r.executiveLabel ?? '—'}</td>
                          <td style={{ textAlign: 'center' }}>
                            <button 
                              onClick={() => toggleRoute(r.id)}
                              className={`pill ${isExpanded ? 'status-rejected' : 'status-pending'}`}
                              style={{ border: 'none', cursor: 'pointer', minWidth: '100px' }}
                            >
                              {isExpanded ? 'Close' : 'View Indents'}
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="expanded-row-bg">
                            <td colSpan={5} style={{ padding: '16px', backgroundColor: '#f8fafc' }}>
                              <div style={{ borderLeft: '4px solid #0ea5e9', paddingLeft: '16px' }}>
                                <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: '#334155' }}>
                                  Indents for Route: {r.name}
                                </h4>
                                
                                {isLoading ? (
                                  <p style={{ fontSize: '13px', color: '#64748b' }}>Loading indents...</p>
                                ) : indents.length === 0 ? (
                                  <p style={{ fontSize: '13px', color: '#64748b' }}>No indents found for this route.</p>
                                ) : (
                                  <div className="indent-list" style={{ gap: '8px' }}>
                                    {indents.map((idx) => (
                                      <div key={idx._id} className="indent-card-small" style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                          <p style={{ fontWeight: 'bold', margin: '0 0 2px', fontSize: '13px' }}>
                                            {idx.indentNumber}
                                          </p>
                                          <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>
                                            {new Date(idx.createdAt!).toLocaleDateString()} · {idx.agent?.fname} {idx.agent?.lname}
                                          </p>
                                        </div>
                                        <span className={`pill status-${(idx.status || '').toLowerCase()}`} style={{ fontSize: '10px' }}>
                                          {idx.status}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
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
