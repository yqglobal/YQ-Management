import React from 'react';
import MarketingLayout from '../../components/MarketingLayout';

export default function ContactPage() {
  return (
    <MarketingLayout title="Qmova | Contact">
      <div className="pt-32 pb-20 px-6 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-8">Contact</h1>
          <div className="prose prose-invert max-w-none">
            <p className="text-xl text-zinc-400">
              This page is a placeholder for the Contact content. 
              The layout and compliance infrastructure is set up and ready for the final copy.
            </p>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}
