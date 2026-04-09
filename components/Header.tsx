'use client';


import router from "next/dist/shared/lib/router/router";
import { useAuth } from '@/components/AuthProvider';


export default function Header({ title }: { title: string }) {
  const { logout } = useAuth();

  // 🔥 FIXED LOGOUT
  const handleLogout = () => {
    logout(); // ✅ clears context + storage
    router.replace('/login'); // ✅ prevents back navigation
  };
    

return(
<div className="dashboard-header">
          <div className="top-icons">
            <span>🔍</span>
            <button className="icon-btn" onClick={() => router.refresh()} title="Refresh">
              🔄
            </button>
          </div>

          <img src="/icons/icon-192.png" className="logo" />

          <div className="top-icons">
            <button onClick={handleLogout} className="icon-btn" title="Logout">
              ⏻
            </button>
            <button className="icon-btn" title="Menu">
              ☰
            </button>
          </div>
        </div>
)

}