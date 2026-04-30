'use client';

import { useEffect, useState } from 'react';
import { useAuth } from './AuthProvider';

const getFullName = (obj: any) => {
  if (!obj) return '';
  return `${obj?.fname || ''} ${obj?.lname || ''}`.trim();
};

export default function DcFullScreen() {
  const { agent } = useAuth();

  const [allDCs, setAllDCs] = useState<any[]>([]);
  const [filteredDC, setFilteredDC] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [priceMap, setPriceMap] = useState<any>({});
  const [routes, setRoutes] = useState<any[]>([]);

  const roleCode = (agent?.role as any)?.code?.toUpperCase() || '';
  const isAgent = roleCode === 'AGENT';

  useEffect(() => {
    fetchAllDCs();
  }, []);

  useEffect(() => {
  fetchRoutes();
}, []);

  useEffect(() => {
  const agentId = filteredDC?.agent?._id;

  if (agentId) {
    fetchPrices(agentId);
  }
}, [filteredDC]);

  useEffect(() => {
    filterByDate();
  }, [selectedDate, allDCs]);

  // 🔥 FETCH DATA
  const fetchAllDCs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/indents');
      const data = await res.json();
      setAllDCs(data?.indents || []);
    } catch (e) {
      console.error(e);
      setAllDCs([]);
    } finally {
      setLoading(false);
    }
  };
  const fetchRoutes = async () => {
  try {
    const res = await fetch('/api/routes');
    const data = await res.json();

    setRoutes(data?.routes || []);
  } catch (e) {
    console.error("ROUTES FETCH ERROR", e);
  }
};

  const fetchPrices = async (agentId: string) => {
  try {
    const res = await fetch(`/api/agent-price-chart?agent=${agentId}`);
    const data = await res.json();

    // 🔥 convert to map for fast lookup
    const map: any = {};

    const list = data?.charts || [];

list.forEach((p: any) => {
  const productId = p.product?._id;
  const price = p.price || 0;

  if (productId) {
    map[productId] = price;
  }
});

    setPriceMap(map);
  } catch (e) {
    console.error("PRICE FETCH ERROR", e);
  }
};

  // 🔥 FILTER BY dcDate
  const filterByDate = () => {
  if (!allDCs.length) return;

  const selected = selectedDate.toLocaleDateString('en-CA');

  // ✅ Step 1: filter by dcDate
  const sameDateDCs = allDCs.filter((dc: any) => {
    const raw = dc?.deliveryChallan?.dcDate;
    if (!raw) return false;

    const dcDate = new Date(raw).toLocaleDateString('en-CA');
    return dcDate === selected;
  });

  if (!sameDateDCs.length) {
    setFilteredDC(null);
    return;
  }

  // ✅ Step 2: group by agent
  const agentMap: any = {};

  sameDateDCs.forEach((entry: any) => {
    const agentId = entry?.agent?._id || entry?.agent?.userid;

    if (!agentMap[agentId]) {
      agentMap[agentId] = {
        ...entry,
        deliveryChallan: {
          ...entry.deliveryChallan,
          items: [],
        },
      };
    }

    // 🔥 merge items
    entry.deliveryChallan?.items?.forEach((item: any) => {
      const existing = agentMap[agentId].deliveryChallan.items.find(
        (i: any) => i.product?._id === item.product?._id
      );

      if (existing) {
        existing.quantity += item.quantity;
      } else {
        agentMap[agentId].deliveryChallan.items.push({ ...item });
      }
    });
  });

  // ✅ Step 3: since screen is per agent → pick that agent
  const consolidated = Object.values(agentMap)[0];

  setFilteredDC(consolidated || null);
};

  const dc = filteredDC?.deliveryChallan;

  const routeId = filteredDC?.route?._id;

const matchedRoute = routes.find((r: any) => r._id === routeId);

const branch = matchedRoute?.branch;

const seName = getFullName(branch?.executive);
const bmName = getFullName(branch?.branchManager);
const amName = getFullName(branch?.areaManager);

  const totalCrates = dc?.items?.reduce((sum: number, item: any) => {
  const unit = (item.unit?.name || item.unit || '').toLowerCase();

  if (unit.includes('crate')) {
    return sum + (item.quantity || 0);
  }
  return sum;
}, 0) || 0;

const totalBuckets = dc?.items?.reduce((sum: number, item: any) => {
  const unit = (item.unit?.name || item.unit || '').toLowerCase();

  if (unit.includes('bucket')) {
    return sum + (item.quantity || 0);
  }
  return sum;
}, 0) || 0;

const totalPrice = dc?.items?.reduce((sum: number, item: any) => {
  const productId = item.product?._id;

  const price = priceMap[productId] || 0;

  return sum + (price * (item.quantity || 0));
}, 0) || 0;
console.log("PRICE MAP:", priceMap);
console.log("ITEMS:", dc?.items);
console.log("TOTAL PRICE:", totalPrice);

const categoryMap: any = {};

dc?.items?.forEach((item: any) => {
  const cat = item.category?.name || 'Others';

  if (!categoryMap[cat]) {
    categoryMap[cat] = [];
  }

  categoryMap[cat].push(item);
});

const categories = Object.keys(categoryMap);

  return (
    <div className="print-container">

      {/* DATE PICKER */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
        <span style={{ marginRight: 10 }}>
          {selectedDate.toDateString()}
        </span>

        <input
          type="date"
          onChange={(e) => setSelectedDate(new Date(e.target.value))}
        />
      </div>

      {/* LOADING */}
      {loading && <p>Loading...</p>}

      {/* NO DATA */}
      {!loading && !filteredDC && (
        <p style={{ textAlign: 'center', marginTop: 20 }}>
          No Delivery Challans for selected date
        </p>
      )}

      {/* DATA */}
      {!loading && filteredDC && dc && (
        <>
          {/* HEADER */}
          <div className="dc-header">
            <h3>Sri Chakra Milk Products LLP</h3>
            <p>Delivery Challan</p>

            <div className="dc-row">
              <div className="dc-left">
                <p><b>Date:</b> {new Date(dc.dcDate).toDateString()}</p>
                <p><b>Route:</b> {filteredDC?.route?.name || '-'}</p>
                <p><b>Branch:</b> {branch?.name || '-'}</p>
              </div>

              {isAgent && (
                <div className="dc-right">
                  <p><b>Agent:</b> {filteredDC?.agent?.fname || '-'}</p>
                  <p><b>Code:</b> {filteredDC?.agent?.agentCode || filteredDC?.agent?.userid || '-'}</p>
                </div>
              )}
            </div>

            <div className="dc-center">
  {seName && <p><b>SE:</b> {seName}</p>}
  {bmName && <p><b>BM:</b> {bmName}</p>}
  {amName && <p><b>AM:</b> {amName}</p>}
</div>
          </div>

          {/* 🔥 FLUTTER STYLE TABLE */}
          <div className="dc-table-scroll">

  {/* ✅ AGENT VIEW → TRANSPOSED TABLE */}
  {isAgent ? (
    <table className="dc-table" style={{ width: 'auto', margin: '0 auto' }}>
       <colgroup>
    <col style={{ width: '120px' }} />
    <col style={{ width: '200px' }} />
    <col style={{ width: '80px' }} />
  </colgroup>
      <thead>
  <tr>
    <th>CATEGORY</th>
    <th>PRODUCT</th>
    <th>QTY</th>
  </tr>
</thead>
  <tbody>

    {categories.map((cat: string) => {
      const items = categoryMap[cat];

      return items.map((item: any, index: number) => (
        <tr key={`${cat}-${index}`}>
          
          {/* CATEGORY (only first row) */}
          {index === 0 ? (
            <td rowSpan={items.length}>
              {cat}
            </td>
          ) : null}

          {/* PRODUCT */}
          <td>{item.product?.name}</td>

          {/* QUANTITY */}
          <td>{item.quantity}</td>

        </tr>
      ));
    })}

    {/* 🔹 TOTAL */}
    <tr>
      <td colSpan={2}><b>TOTAL</b></td>
      <td>
        {dc.items.reduce((sum: number, i: any) => sum + (i.quantity || 0), 0)}
      </td>
    </tr>

    {/* 🔹 CRATES */}
    <tr>
      <td colSpan={2}><b>CRATES</b></td>
      <td>{totalCrates}</td>
    </tr>

    {/* 🔹 BUCKETS */}
    <tr>
      <td colSpan={2}><b>BUCKETS</b></td>
      <td>{totalBuckets}</td>
    </tr>

    {/* 🔹 PRICE */}
    <tr>
      <td colSpan={2}><b>₹ TOTAL</b></td>
      <td>₹{totalPrice.toFixed(0)}</td>
    </tr>

  </tbody>
</table>) : (

    /* ✅ NON-AGENT → KEEP YOUR ORIGINAL TABLE */
    <table className="dc-table">

      <thead>
        <tr>
          {!isAgent && <th>AGENT CODE</th>}
          {!isAgent && <th>AGENT NAME</th>}

          {categories.map((cat: string, i: number) => (
            <th key={i} colSpan={categoryMap[cat].length}>
              {cat}
            </th>
          ))}

          <th>TOTAL</th>
          <th>CRATES</th>
          <th>BUCKETS</th>
          <th>₹ TOTAL</th>
        </tr>

        <tr>
          {!isAgent && <th></th>}
          {!isAgent && <th></th>}

          {categories.flatMap((cat: string) =>
            categoryMap[cat].map((item: any, i: number) => (
              <th key={`${cat}-${i}`}>
                {item.product?.name}
              </th>
            ))
          )}

          <th></th><th></th><th></th><th></th>
        </tr>
      </thead>

      <tbody>
        <tr>
          {!isAgent && <td>{filteredDC.agent?.agentCode}</td>}
          {!isAgent && <td>{filteredDC.agent?.fname}</td>}

          {categories.flatMap((cat: string) =>
            categoryMap[cat].map((item: any, i: number) => (
              <td key={`${cat}-${i}`}>
                {item.quantity}
              </td>
            ))
          )}

          <td>
            {dc.items.reduce((sum: number, i: any) => sum + (i.quantity || 0), 0)}
          </td>

          <td>{totalCrates}</td>
          <td>{totalBuckets}</td>
          <td>₹{totalPrice.toFixed(0)}</td>
        </tr>
      </tbody>

    </table>
  )}
</div>

          {/* PRINT */}
          {!isAgent && (
  <div style={{ textAlign: 'center', marginTop: 20 }}>
    <button onClick={() => window.print()} className="no-print">
      PRINT DC
    </button>
  </div>
)}
        </>
      )}

    </div>
  );
}