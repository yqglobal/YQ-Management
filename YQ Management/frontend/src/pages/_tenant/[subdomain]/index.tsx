import { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: '/booking',
      permanent: false,
    },
  };
};

export default function TenantIndex() {
  return null;
}
