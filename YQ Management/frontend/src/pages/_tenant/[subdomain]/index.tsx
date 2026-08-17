import { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps = async (context) => {
  // Convert query object to query string
  const { subdomain, ...restQuery } = context.query;
  const queryString = new URLSearchParams(restQuery as Record<string, string>).toString();
  const destination = queryString ? `/booking?${queryString}` : '/booking';

  return {
    redirect: {
      destination,
      permanent: false,
    },
  };
};

export default function TenantIndex() {
  return null;
}
