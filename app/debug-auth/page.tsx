'use client';
import { useAuth } from '@/components/AuthProvider';

export default function DebugAuth() {
  const { agent, user } = useAuth();
  return (
    <div style={{ padding: '20px' }}>
      <h1>Debug Auth</h1>
      <pre>{JSON.stringify({ agent, user }, null, 2)}</pre>
    </div>
  );
}
