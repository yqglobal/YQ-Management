import { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps = async (context) => {
  const isFallback = context.req.url?.startsWith('/t/');
  
  // Convert query object to query string
  const { subdomain, ...restQuery } = context.query;
  const queryString = new URLSearchParams(restQuery as Record<string, string>).toString();
  
  const basePath = isFallback ? `/t/${subdomain}/booking` : '/booking';
  const destination = queryString ? `${basePath}?${queryString}` : basePath;

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
