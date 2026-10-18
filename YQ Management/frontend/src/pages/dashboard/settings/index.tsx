import { useEffect } from 'react';
import { useRouter } from 'next/router';
import SettingsLayout from '../../../components/SettingsLayout';

export default function SettingsIndex() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/settings/personal');
  }, [router]);

  return (
    <>
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    </>
  );
}

SettingsIndex.getLayout = function getLayout(page: React.ReactElement) {
  return <SettingsLayout pageTitle="Settings" pageSubtitle="Redirecting...">{page}</SettingsLayout>;
};
