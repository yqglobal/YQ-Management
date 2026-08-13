import { GetServerSideProps } from 'next';

export default function SettingsIndex() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: '/dashboard/settings/profile',
      permanent: false,
    },
  };
};
