import React, { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

export default function Kiosk() {
  const router = useRouter();
  const { tenantId } = router.query;
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleKeyPress = (num: string) => {
    if (phone.length < 15) setPhone(prev => prev + num);
  };

  const handleBackspace = () => {
    setPhone(prev => prev.slice(0, -1));
  };

  const handleSubmit = async () => {
    if (!phone) return;
    setIsSubmitting(true);
    try {
      const { getBackendUrl } = require('../../lib/api');
      const res = await fetch(`${getBackendUrl()}/queue/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, customerName: 'Walk-in', phone })
      });
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          setPhone('');
        }, 5000);
      }
    } catch (e) {
      console.error(e);
    }
    setIsSubmitting(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-green-700 mb-4">You're in line!</h1>
          <p className="text-2xl text-green-600">Please check your WhatsApp for your digital token and live updates.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 select-none">
      <Head><title>Self-Service Kiosk</title></Head>
      
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl text-center">
        <h1 className="text-3xl font-bold mb-2">Join the Queue</h1>
        <p className="text-gray-500 mb-8">Enter your mobile number to get your digital token via WhatsApp.</p>
        
        <div className="text-4xl font-mono bg-gray-100 p-4 rounded-lg mb-8 min-h-[72px] flex items-center justify-center tracking-widest">
          {phone || <span className="text-gray-300">Phone Number</span>}
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button 
              key={num} 
              onClick={() => handleKeyPress(num.toString())}
              className="text-3xl p-6 bg-gray-50 hover:bg-gray-200 rounded-xl font-medium transition-colors"
            >
              {num}
            </button>
          ))}
          <button 
             onClick={handleBackspace}
             className="text-xl p-6 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-medium transition-colors"
          >
            DEL
          </button>
          <button 
            onClick={() => handleKeyPress('0')}
            className="text-3xl p-6 bg-gray-50 hover:bg-gray-200 rounded-xl font-medium transition-colors"
          >
            0
          </button>
          <button 
             onClick={handleSubmit}
             disabled={isSubmitting || phone.length < 5}
             className="text-xl p-6 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-xl font-bold transition-colors"
          >
            GO
          </button>
        </div>
      </div>
    </div>
  );
}
