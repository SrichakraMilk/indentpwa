'use client';

import { useEffect, useState } from 'react';
import { useAuth } from './AuthProvider';

export default function DcFullScreen() {
  const { agent } = useAuth();

  const [allDCs, setAllDCs] = useState<any[]>([]);
  const [filteredDC, setFilteredDC] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  const roleCode = (agent?.role as any)?.code?.toUpperCase() || '';
  const isAgent = roleCode === 'AGT';

  useEffect(() => {
    fetchAllDCs();
  }, []);

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

  // 🔥 FILTER BY dcDate
  const filterByDate = () => {
    if (!allDCs.length) return;

    const selected = selectedDate.toLocaleDateString('en-CA');

    const matched = allDCs.find((dc: any) => {
      const raw = dc?.deliveryChallan?.dcDate;
      if (!raw) return false;

      const dcDate = new Date(raw).toLocaleDateString('en-CA');
      return dcDate === selected;
    });

    setFilteredDC(matched || null);
  };

  const dc = filteredDC?.deliveryChallan;

  return (
    <div>

      {/* DATE PICKER */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
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
                <p><b>Branch:</b> {filteredDC?.branch?.name || '-'}</p>
              </div>

              {isAgent && (
                <div className="dc-right">
                  <p><b>Agent:</b> {filteredDC?.agent?.fname || '-'}</p>
                  <p><b>Code:</b> {filteredDC?.agent?.agentCode || filteredDC?.agent?.userid || '-'}</p>
                </div>
              )}
            </div>

            <div className="dc-center">
              {filteredDC?.areaManager && (
                <p>
                  <b>AM:</b> {filteredDC.areaManager.fname} {filteredDC.areaManager.lname}
                </p>
              )}
            </div>
          </div>

          {/* 🔥 FLUTTER STYLE TABLE */}
          <div className="dc-table-scroll">
            <table className="dc-table">

              {/* CATEGORY ROW */}
              <thead>
                <tr>
                  {!isAgent && <th>AGENT CODE</th>}
                  {!isAgent && <th>AGENT NAME</th>}

                  {dc.items.map((item: any, i: number) => (
                    <th key={i}>
                      {item.category?.name || 'Milk'}
                    </th>
                  ))}

                  <th>TOTAL</th>
                  <th>CRATES</th>
                  <th>BUCKETS</th>
                  <th>₹ TOTAL</th>
                </tr>

                {/* PRODUCT ROW */}
                <tr>
                  {!isAgent && <th></th>}
                  {!isAgent && <th></th>}

                  {dc.items.map((item: any, i: number) => (
                    <th key={i}>
                      {item.product?.name}
                    </th>
                  ))}

                  <th></th><th></th><th></th><th></th>
                </tr>
              </thead>

              {/* DATA */}
              <tbody>
                <tr>
                  {!isAgent && <td>{filteredDC.agent?.agentCode}</td>}
                  {!isAgent && <td>{filteredDC.agent?.fname}</td>}

                  {dc.items.map((item: any, i: number) => (
                    <td key={i}>{item.quantity}</td>
                  ))}

                  <td>
                    {dc.items.reduce((sum: number, i: any) => sum + (i.quantity || 0), 0)}
                  </td>

                  <td>0</td>
                  <td>0</td>
                  <td>₹0</td>
                </tr>
              </tbody>

            </table>
          </div>

          {/* PRINT */}
          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <button onClick={() => window.print()}>
              PRINT DC
            </button>
          </div>
        </>
      )}

    </div>
  );
}