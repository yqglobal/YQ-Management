import { useRouter } from 'next/router';
import AdminLayout from '../../../components/AdminLayout';
import { ScannerInterface } from '../../../components/ScannerInterface';

export default function ScanPage() {
  const router = useRouter();

  return (
    <AdminLayout 
      pageTitle="Scan & Verify" 
      pageSubtitle="Scan customer QR codes to check-in or verify access"
    >
      <div className="h-[calc(100vh-140px)] w-full">
        <ScannerInterface 
          mode="page"
          onScanSuccess={(data) => {
            if (data?.valid) {
              // Usually the ScannerInterface handles advancing stages itself.
              // If it returns a success and says "Open Record", we go to service-desk.
              // It also passes the tokenId which is the visitId or queueToken ID.
              if (data.tokenId) {
                router.push(`/dashboard/service-desk?visitId=${data.tokenId}`);
              } else {
                router.push('/dashboard/service-desk');
              }
            }
          }} 
        />
      </div>
    </AdminLayout>
  );
}
