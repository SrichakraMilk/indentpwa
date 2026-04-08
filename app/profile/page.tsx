'use client';

import ProtectedPage from '@/components/ProtectedPage';
import Layout from '@/components/Layout';

export default function ProfilePage() {
  return (
    <ProtectedPage>
      <Layout title="Profile">
        <section className="card">
          <h2>Profile</h2>
          <p>This is your profile overview. Update your details and manage your account here.</p>
        </section>
      </Layout>
    </ProtectedPage>
  );
}
