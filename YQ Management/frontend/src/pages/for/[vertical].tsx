import { GetStaticProps, GetStaticPaths } from 'next';
import Head from 'next/head';
import MarketingLayout from '@/components/MarketingLayout';
import Link from 'next/link';

interface VerticalData {
  id: string;
  title: string;
  description: string;
  features: string[];
  benefits: string[];
  heroImage: string;
}

const verticals: Record<string, VerticalData> = {
  clinics: {
    id: 'clinics',
    title: 'Patient Flow Management for Clinics & Hospitals',
    description: 'Reduce wait times, improve patient privacy, and streamline appointments with Qmova.',
    features: [
      'HIPAA-compliant WhatsApp updates',
      'Contactless QR code check-in',
      'Automated appointment reminders',
      'Doctor-specific queues'
    ],
    benefits: ['Reduce walk-outs by 40%', 'Improve patient satisfaction scores', 'Free up reception staff'],
    heroImage: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=2000'
  },
  salons: {
    id: 'salons',
    title: 'Queue & Booking System for Salons & Barbershops',
    description: 'Keep your chairs full and your clients happy. Let them wait at the coffee shop, not in your waiting area.',
    features: [
      'WhatsApp wait time estimates',
      'Integrated booking and walk-ins',
      'Stylist performance tracking',
      'No-show prevention'
    ],
    benefits: ['Increase daily revenue', 'Build client loyalty', 'Eliminate crowded waiting areas'],
    heroImage: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=2000'
  },
  banks: {
    id: 'banks',
    title: 'Enterprise Queue Management for Banks & Branches',
    description: 'Secure, compliant, and scalable customer flow management for financial institutions.',
    features: [
      'Multi-teller routing',
      'VIP customer prioritization',
      'Branch performance analytics',
      'Enterprise security & SSO'
    ],
    benefits: ['Optimize teller utilization', 'Reduce branch congestion', 'Enhance premium customer experience'],
    heroImage: 'https://images.unsplash.com/photo-1501167737229-873b757e84cc?auto=format&fit=crop&q=80&w=2000'
  },
  'repair-shops': {
    id: 'repair-shops',
    title: 'Job Tracking & Customer Updates for Repair Shops',
    description: 'Automate customer communication. Send WhatsApp updates when their car or device is ready.',
    features: [
      'Status-based WhatsApp alerts',
      'Drop-off & pick-up queues',
      'Service bay management',
      'Customer notes & history'
    ],
    benefits: ['Stop "is it ready yet?" calls', 'Faster turnaround times', 'Better customer reviews'],
    heroImage: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=2000'
  }
};

export default function VerticalPage({ data }: { data: VerticalData }) {
  if (!data) return null;

  return (
    <MarketingLayout>
      <Head>
        <title>{data.title} | Qmova</title>
        <meta name="description" content={data.description} />
      </Head>

      <main className="bg-white">
        {/* Hero Section */}
        <div className="relative bg-slate-900 text-white overflow-hidden">
          <div className="absolute inset-0">
            <img src={data.heroImage} alt={data.title} className="w-full h-full object-cover opacity-20" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-900 to-transparent" />
          </div>
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6">
              {data.title}
            </h1>
            <p className="text-xl md:text-2xl text-slate-300 max-w-3xl mb-10">
              {data.description}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/register" className="px-8 py-4 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-lg transition-colors text-center">
                Start 14-Day Free Trial
              </Link>
              <Link href="/contact" className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-lg backdrop-blur-sm transition-colors text-center">
                Book a Demo
              </Link>
            </div>
          </div>
        </div>

        {/* Features & Benefits */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid md:grid-cols-2 gap-16">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-8">Why Qmova for {data.id.replace('-', ' ')}?</h2>
              <div className="space-y-6">
                {data.benefits.map((benefit, i) => (
                  <div key={i} className="flex items-start">
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-600">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                    <p className="ml-4 text-lg text-slate-700">{benefit}</p>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200">
              <h3 className="text-2xl font-bold text-slate-900 mb-6">Key Features</h3>
              <ul className="space-y-4">
                {data.features.map((feature, i) => (
                  <li key={i} className="flex items-center text-slate-600">
                    <span className="w-2 h-2 rounded-full bg-brand-500 mr-3"></span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </main>
    </MarketingLayout>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const paths = Object.keys(verticals).map((vertical) => ({
    params: { vertical },
  }));

  return { paths, fallback: false };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const vertical = params?.vertical as string;
  const data = verticals[vertical];

  if (!data) {
    return { notFound: true };
  }

  return {
    props: { data },
  };
};
