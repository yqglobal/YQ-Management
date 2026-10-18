import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../components/AuthContext';

export default function DashboardIndex() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (user?.role === 'STAFF') {
      router.replace('/dashboard/my-desk');
    } else {
      router.replace('/dashboard/service-desk');
    }
  }, [router, user]);

  return null;
}
