'use client';

import ProtectedPage from '@/components/ProtectedPage';
import Layout from '@/components/Layout';
import IndentManager from '@/components/IndentManager';

export default function IndentsPage() {
  return (
    <ProtectedPage>
      <Layout title="Indent Management">
        <IndentManager />
      </Layout>
    </ProtectedPage>
  );
}
