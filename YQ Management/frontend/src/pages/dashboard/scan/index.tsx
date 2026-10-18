import { useRouter } from 'next/router';
import AdminLayout from '../../../components/AdminLayout';
import { ScannerInterface } from '../../../components/ScannerInterface';
import { ScanLine } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ScanPage() {
  const router = useRouter();

  return (
    <AdminLayout 
      pageTitle="Scan & Verify" 
      pageSubtitle="Scan customer QR codes to check-in or verify access"
    >
      <div className="flex-1 w-full p-4 md:p-6 lg:p-8 flex items-center justify-center">
        <div className="w-full max-w-5xl h-full min-h-[600px] flex">
          <ScannerInterface 
            mode="page"
            onScanSuccess={(data) => {
              if (data?.valid) {
                if (data.tokenId) {
                  router.push(`/dashboard/service-desk?visitId=${data.tokenId}`);
                } else {
                  router.push('/dashboard/service-desk');
                }
              }
            }} 
          />
        </div>
      </div>
    </AdminLayout>
  );
}
