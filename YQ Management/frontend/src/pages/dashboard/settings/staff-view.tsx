import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function StaffViewRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/settings/team?tab=staff-view');
  }, [router]);

  return null;
}
