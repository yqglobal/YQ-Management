import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function DashboardIndex() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/service-desk');
  }, [router]);

  return null;
}
