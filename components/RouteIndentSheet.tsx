'use client';

import { useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { IndentRecord } from '@/lib/api';

interface Props {
  routeName: string;
  routeCode: string;
  date: string;
  indents: IndentRecord[];
  onClose: () => void;
}

type ColDef = {
  key: string;
  label: string;
  group: 'milk' | 'curd';
};

const thBase: React.CSSProperties = {
  border: '1px solid #94a3b8',
  padding: '5px 6px',
  textAlign: 'center',
  fontWeight: 700,
  whiteSpace: 'nowrap',
  fontSize: '10px',
};

const tdBase: React.CSSProperties = {
  border: '1px solid #cbd5e1',
  padding: '4px 6px',
  textAlign: 'center',
  fontSize: '11px',
};

function agentCode(agent: any): string {
  return agent?.agentCode || agent?.userid || '—';
}
function agentName(agent: any): string {
  return `${agent?.fname || ''} ${agent?.lname || ''}`.trim() || '—';
}

export default function RouteIndentSheet({ routeName, routeCode, date, indents, onClose }: Props) {
  // Build unique product columns (one per productName+size combo)
  const cols = useMemo<ColDef[]>(() => {
    const map = new Map<string, ColDef>();
    for (const indent of indents) {
      for (const item of indent.items) {
        const catName = (item.categoryName || '').toLowerCase();
        const group: 'milk' | 'curd' = catName.includes('curd') ? 'curd' : 'milk';
        const prod = (item.productName || item.productId || '').trim();
        const size = (item.size || '').trim();
        const key = `${group}|${prod}|${size}`;
        if (!map.has(key)) {
          map.set(key, {
            key,
            label: size ? `${prod}\n${size}` : prod || '—',
            group,
          });
        }
      }
    }
    // Sort: milk first, then curd; within each group alphabetically
    return Array.from(map.values()).sort((a, b) => {
      if (a.group !== b.group) return a.group === 'milk' ? -1 : 1;
      return a.label.localeCompare(b.label);
    });
  }, [indents]);

  const milkCols = cols.filter(c => c.group === 'milk');
  const curdCols = cols.filter(c => c.group === 'curd');

  // Build per-agent rows
  const rows = useMemo(() => {
    const map = new Map<string, {
      code: string;
      name: string;
      cells: Record<string, number>;
      crates: number;
      buckets: number;
      cans: number;
    }>();

    for (const indent of indents) {
      const code = agentCode(indent.agent);
      const name = agentName(indent.agent);
      if (!map.has(code)) {
        map.set(code, { code, name, cells: {}, crates: 0, buckets: 0, cans: 0 });
      }
      const row = map.get(code)!;
      for (const item of indent.items) {
        const catName = (item.categoryName || '').toLowerCase();
        const group: 'milk' | 'curd' = catName.includes('curd') ? 'curd' : 'milk';
        const prod = (item.productName || item.productId || '').trim();
        const size = (item.size || '').trim();
        const key = `${group}|${prod}|${size}`;
        const qty = item.quantity ?? item.qty ?? 0;
        row.cells[key] = (row.cells[key] || 0) + qty;

        const unit = (item.unitName || '').toLowerCase();
        if (unit.includes('crate') || unit.includes('crt')) row.crates += qty;
        else if (unit.includes('bucket') || unit.includes('bkt') || unit.includes('nucket') || unit.includes('nkt')) row.buckets += qty;
        else if (unit.includes('can')) row.cans += qty;
      }
    }
    return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code));
  }, [indents]);

  // Column totals
  const totals = useMemo(() => {
    const cells: Record<string, number> = {};
    let crates = 0, buckets = 0, cans = 0;
    for (const row of rows) {
      for (const [k, v] of Object.entries(row.cells)) cells[k] = (cells[k] || 0) + v;
      crates += row.crates;
      buckets += row.buckets;
      cans += row.cans;
    }
    return { cells, crates, buckets, cans };
  }, [rows]);

  const fmt = (n: number) => (n === 0 ? '' : n % 1 === 0 ? String(n) : n.toFixed(1));

  // ── PDF download ─────────────────────────────────────────
  const downloadPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pw = doc.internal.pageSize.getWidth();

    // Title block
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Srichakra Milk Products LLP', pw / 2, 14, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Indent  |  Route: ${routeName} (${routeCode})  |  Date: ${date}`, pw / 2, 21, { align: 'center' });

    // Build head rows for autoTable
    // Row 1: group spans
    // Row 2: product sub-columns
    const fixedLeft = ['Agent Code', 'Agent Name'];
    const fixedRight = ['Total Crates', 'Total Buckets', 'Total Cans'];

    const milkLabels = milkCols.map(c => c.label.replace('\n', ' '));
    const curdLabels = curdCols.map(c => c.label.replace('\n', ' '));

    // autoTable head array (each inner array = one header row)
    const head: string[][] = [
      [
        ...fixedLeft,
        ...(milkCols.length ? [`Milk Products (${milkLabels.join(', ')})`] : []),
        ...Array(Math.max(0, milkCols.length - 1)).fill(''),
        ...(curdCols.length ? [`Curd (${curdLabels.join(', ')})`] : []),
        ...Array(Math.max(0, curdCols.length - 1)).fill(''),
        ...fixedRight,
      ],
      [
        ...fixedLeft,
        ...milkLabels,
        ...curdLabels,
        ...fixedRight,
      ],
    ];

    // Body rows
    const body: (string | number)[][] = rows.map(row => [
      row.code,
      row.name,
      ...cols.map(c => fmt(row.cells[c.key] || 0)),
      fmt(row.crates),
      fmt(row.buckets),
      fmt(row.cans),
    ]);

    // Totals row
    body.push([
      'TOTAL', '',
      ...cols.map(c => fmt(totals.cells[c.key] || 0)),
      fmt(totals.crates),
      fmt(totals.buckets),
      fmt(totals.cans),
    ]);

    autoTable(doc, {
      startY: 27,
      head,
      body,
      styles: { fontSize: 7, cellPadding: 2, halign: 'center' },
      headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold', fontSize: 7 },
      columnStyles: {
        0: { cellWidth: 18 },
        1: { cellWidth: 30, halign: 'left' },
      },
      // Highlight totals row
      didParseCell(data) {
        if (data.section === 'body' && data.row.index === body.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [241, 245, 249];
        }
        // Colour milk columns
        const colIdx = data.column.index;
        if (colIdx >= 2 && colIdx < 2 + milkCols.length) {
          if (data.section === 'head') data.cell.styles.fillColor = [219, 234, 254];
        }
        // Colour curd columns
        if (colIdx >= 2 + milkCols.length && colIdx < 2 + milkCols.length + curdCols.length) {
          if (data.section === 'head') data.cell.styles.fillColor = [220, 252, 231];
        }
      },
    });

    doc.save(`Indent_${routeCode}_${date.replace(/\s/g, '_')}.pdf`);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 5000,
      background: 'rgba(0,0,0,0.65)',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        background: '#fff', margin: '16px', borderRadius: '12px',
        overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
      }}>

        {/* ── Top bar ── */}
        <div className="no-print" style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '10px 18px', borderBottom: '1px solid #e2e8f0',
          background: '#1e3a8a', flexShrink: 0,
        }}>
          <div>
            <p style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#fff', letterSpacing: '0.3px' }}>
              Srichakra Milk Products LLP
            </p>
            <p style={{ margin: '1px 0 0', fontSize: '12px', color: '#bfdbfe' }}>
              Indent · {routeName} ({routeCode}) · {date}
            </p>
          </div>
        <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={downloadPDF}
              style={{ padding: '6px 14px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}
            >
              📄 Download PDF
            </button>
            <button
              onClick={() => window.print()}
              style={{ padding: '6px 14px', background: '#fff', color: '#1e3a8a', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}
            >
              🖨️ Print
            </button>
            <button
              onClick={onClose}
              style={{ padding: '6px 14px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}
            >
              ✕ Close
            </button>
          </div>
        </div>

        {/* ── Print header (hidden on screen) ── */}
        <div className="print-only" style={{ display: 'none', padding: '12px 20px', borderBottom: '2px solid #000' }}>
          <h2 style={{ margin: 0, textAlign: 'center', fontSize: '16px' }}>Srichakra Milk Products LLP</h2>
          <p style={{ margin: '4px 0 0', textAlign: 'center', fontSize: '12px' }}>
            Indent &nbsp;|&nbsp; Route: {routeName} ({routeCode}) &nbsp;|&nbsp; Date: {date}
          </p>
        </div>

        {/* ── Scrollable table area ── */}
        <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
          {indents.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#6b7280', marginTop: '40px' }}>No indents found for this route.</p>
          ) : (
            <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'auto', fontSize: '11px' }}>
              <thead>
                {/* Group header row */}
                <tr>
                  <th rowSpan={2} style={{ ...thBase, background: '#e2e8f0', minWidth: '56px' }}>Agent Code</th>
                  <th rowSpan={2} style={{ ...thBase, background: '#e2e8f0', minWidth: '100px', textAlign: 'left' }}>Agent Name</th>
                  {milkCols.length > 0 && (
                    <th colSpan={milkCols.length} style={{ ...thBase, background: '#dbeafe', color: '#1e40af' }}>
                      Milk Products
                    </th>
                  )}
                  {curdCols.length > 0 && (
                    <th colSpan={curdCols.length} style={{ ...thBase, background: '#dcfce7', color: '#166534' }}>
                      Curd
                    </th>
                  )}
                  <th rowSpan={2} style={{ ...thBase, background: '#fef9c3', color: '#713f12', minWidth: '56px' }}>Total Crates</th>
                  <th rowSpan={2} style={{ ...thBase, background: '#fef9c3', color: '#713f12', minWidth: '56px' }}>Total Buckets</th>
                  <th rowSpan={2} style={{ ...thBase, background: '#fef9c3', color: '#713f12', minWidth: '56px' }}>Total Cans</th>
                </tr>
                {/* Sub-column headers */}
                <tr>
                  {milkCols.map(c => (
                    <th key={c.key} style={{ ...thBase, background: '#eff6ff', minWidth: '50px' }}>
                      {c.label.split('\n').map((l, i) => <span key={i} style={{ display: 'block' }}>{l}</span>)}
                    </th>
                  ))}
                  {curdCols.map(c => (
                    <th key={c.key} style={{ ...thBase, background: '#f0fdf4', minWidth: '50px' }}>
                      {c.label.split('\n').map((l, i) => <span key={i} style={{ display: 'block' }}>{l}</span>)}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {rows.map((row, idx) => (
                  <tr key={row.code} style={{ background: idx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                    <td style={{ ...tdBase, fontWeight: 600 }}>{row.code}</td>
                    <td style={{ ...tdBase, textAlign: 'left', fontWeight: 600 }}>{row.name}</td>
                    {cols.map(c => (
                      <td key={c.key} style={tdBase}>{fmt(row.cells[c.key] || 0)}</td>
                    ))}
                    <td style={{ ...tdBase, fontWeight: 700, background: '#fefce8' }}>{fmt(row.crates)}</td>
                    <td style={{ ...tdBase, fontWeight: 700, background: '#fefce8' }}>{fmt(row.buckets)}</td>
                    <td style={{ ...tdBase, fontWeight: 700, background: '#fefce8' }}>{fmt(row.cans)}</td>
                  </tr>
                ))}

                {/* Totals row */}
                <tr style={{ background: '#f1f5f9', fontWeight: 800 }}>
                  <td style={{ ...tdBase, fontWeight: 800, textAlign: 'center' }} colSpan={2}>TOTAL</td>
                  {cols.map(c => (
                    <td key={c.key} style={{ ...tdBase, fontWeight: 800 }}>{fmt(totals.cells[c.key] || 0)}</td>
                  ))}
                  <td style={{ ...tdBase, fontWeight: 800, background: '#fef9c3' }}>{fmt(totals.crates)}</td>
                  <td style={{ ...tdBase, fontWeight: 800, background: '#fef9c3' }}>{fmt(totals.buckets)}</td>
                  <td style={{ ...tdBase, fontWeight: 800, background: '#fef9c3' }}>{fmt(totals.cans)}</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body > * { visibility: hidden; }
          #route-indent-sheet, #route-indent-sheet * { visibility: visible; }
          #route-indent-sheet { position: absolute; left: 0; top: 0; width: 100%; margin: 0; border-radius: 0; box-shadow: none; }
        }
      `}</style>
    </div>
  );
}
