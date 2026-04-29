'use client';

type Column = {
  category: string;
  productName: string;
};

export default function DcTable({
  columns,
  rows,
  isAgent,
}: {
  columns: Column[];
  rows: any[];
  isAgent: boolean;
}) {

  // 🔹 CATEGORY SPANS (same as Flutter)
  const buildCategorySpans = () => {
    const spans: { category: string; count: number }[] = [];

    let current = '';
    let count = 0;

    columns.forEach((col) => {
      if (col.category !== current) {
        if (current) spans.push({ category: current, count });
        current = col.category;
        count = 1;
      } else {
        count++;
      }
    });

    if (current) spans.push({ category: current, count });

    return spans;
  };

  const categorySpans = buildCategorySpans();

  // 🔹 PRODUCT ROW (remove duplicates like Flutter)
  let lastProduct = '';
  const productRow = columns.map((col) => {
    const text = col.productName === lastProduct ? '' : col.productName;
    lastProduct = col.productName;
    return text;
  });

  return (
    <div style={{ overflowX: 'auto', marginTop: 10 }}>
      <table style={{ borderCollapse: 'collapse', fontSize: 11 }}>

        <thead>

          {/* 🔹 ROW 1: CATEGORY */}
          <tr>
            {!isAgent && <th style={th}>AGENT CODE</th>}
            {!isAgent && <th style={th}>AGENT NAME</th>}

            {categorySpans.map((c, i) => (
              <th key={i} colSpan={c.count} style={th}>
                {c.category}
              </th>
            ))}

            <th style={th}>TOTAL</th>
            <th style={th}>CRATES</th>
            <th style={th}>BUCKETS</th>
            <th style={th}>₹ TOTAL</th>
          </tr>

          {/* 🔹 ROW 2: PRODUCT */}
          <tr>
            {!isAgent && <th style={th}></th>}
            {!isAgent && <th style={th}></th>}

            {productRow.map((p, i) => (
              <th key={i} style={th}>{p}</th>
            ))}

            <th style={th}></th>
            <th style={th}></th>
            <th style={th}></th>
            <th style={th}></th>
          </tr>

        </thead>

        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {!isAgent && <td style={td}>{row.AGENT_CODE}</td>}
              {!isAgent && <td style={td}>{row.AGENT_NAME}</td>}

              {columns.map((col, j) => {
                // 🔥 FIX: ONLY productName (NO size)
                const key = `${col.productName}`;
                return <td key={j} style={td}>{row[key] ?? 0}</td>;
              })}

              <td style={td}>{row.TOTAL}</td>
              <td style={td}>{row.CRATES}</td>
              <td style={td}>{row.BUCKETS}</td>
              <td style={td}>₹{row.PRICE}</td>
            </tr>
          ))}
        </tbody>

      </table>
    </div>
  );
}

// 🔹 styles
const th = {
  border: '1px solid black',
  padding: '4px',
  minWidth: '70px',
  textAlign: 'center' as const,
};

const td = {
  border: '1px solid black',
  padding: '4px',
  textAlign: 'center' as const,
};