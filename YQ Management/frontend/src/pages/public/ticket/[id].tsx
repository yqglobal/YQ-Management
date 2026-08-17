import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../../../lib/api';
import { motion } from 'framer-motion';
import { QrCode, Clock, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function DigitalTicket() {
  const router = useRouter();
  const { id } = router.query;

  const { data: visit, isLoading, error } = useQuery({
    queryKey: ['public-visit', id],
    queryFn: () => fetchApi(`/public-visit/${id}`),
    enabled: !!id,
    retry: 1,
    refetchInterval: 10000, // auto-refresh status every 10s
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error || !visit) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h1 className="text-xl font-bold text-gray-900 mb-2">Ticket Not Found</h1>
        <p className="text-gray-500 text-center">The requested digital ticket is invalid or has expired.</p>
      </div>
    );
  }

  const isCheckedIn = ['CHECKED_IN', 'IN_SERVICE', 'COMPLETED'].includes(visit.currentState);
  const isCompleted = visit.currentState === 'COMPLETED';
  const isCanceled = ['CANCELLED', 'NO_SHOW'].includes(visit.currentState);
  const isActive = ['WAITING', 'CHECKED_IN', 'IN_SERVICE'].includes(visit.currentState);

  // Format wait time
  const waitStart = visit.waitingStart ? new Date(visit.waitingStart) : new Date(visit.createdAt);
  const waitMins = Math.max(0, Math.floor((Date.now() - waitStart.getTime()) / 60000));
  
  // Format date
  const dateFormatted = format(new Date(visit.createdAt), 'MMM d, yyyy');
  const timeFormatted = format(new Date(visit.createdAt), 'h:mm a');

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center p-6 selection:bg-indigo-500/30 overflow-hidden font-sans">
      <Head>
        <title>Your Digital Ticket</title>
        <meta name="theme-color" content="#09090b" />
      </Head>

      <motion.div 
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="w-full max-w-sm mt-8"
      >
        {/* Ticket Container */}
        <div className="relative group">
          
          {/* Glossy Reflection Effect */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 z-10 pointer-events-none rounded-3xl" />
          
          <div className="bg-white rounded-[2rem] overflow-hidden shadow-2xl relative z-0">
            {/* Header Section */}
            <div className={`p-6 sm:p-8 pb-10 text-white relative transition-colors duration-500 ${isCompleted ? 'bg-zinc-800' : isCanceled ? 'bg-rose-900' : 'bg-indigo-600'}`}>
              {/* Pattern Overlay */}
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent bg-[length:10px_10px]" />
              
              <div className="relative z-10 text-center">
                <p className="text-white/80 text-sm font-medium tracking-widest uppercase mb-1">{visit.tenant?.name || 'Qmova Service'}</p>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight">{visit.service?.name}</h2>
              </div>
            </div>

            {/* Cutouts & Dashed Line */}
            <div className="relative h-0 flex items-center">
              <div className="absolute -left-4 w-8 h-8 bg-zinc-950 rounded-full" />
              <div className="absolute -right-4 w-8 h-8 bg-zinc-950 rounded-full" />
              <div className="w-full border-t-[3px] border-dashed border-gray-200 mx-6" />
            </div>

            {/* Body Section */}
            <div className="px-6 sm:px-8 py-8 sm:py-10 bg-white">
              
              {/* Status Header */}
              <div className="flex flex-col items-center justify-center mb-8 sm:mb-10">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Current Status</span>
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm ${
                  isCompleted ? 'bg-zinc-100 text-zinc-600' :
                  isCanceled ? 'bg-rose-100 text-rose-700' :
                  visit.currentState === 'IN_SERVICE' ? 'bg-emerald-100 text-emerald-700 animate-pulse' :
                  visit.currentState === 'CHECKED_IN' ? 'bg-indigo-100 text-indigo-700' :
                  'bg-amber-100 text-amber-700 animate-pulse'
                }`}>
                  {isCompleted && <CheckCircle2 className="w-4 h-4" />}
                  {isCanceled && <AlertCircle className="w-4 h-4" />}
                  {visit.currentState.replace('_', ' ')}
                </div>
              </div>

              {/* Data Grid */}
              <div className="grid grid-cols-2 gap-y-8 gap-x-4">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Customer</p>
                  <p className="font-bold text-gray-900 text-lg truncate">{visit.customer?.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Queue / Wait</p>
                  <p className="font-bold text-gray-900 text-lg">
                    {visit.currentState === 'WAITING' ? `${waitMins} mins` : '--'}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Date</p>
                  <p className="font-bold text-gray-900 truncate flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-indigo-500 hidden" />
                    {dateFormatted}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Time</p>
                  <p className="font-bold text-gray-900 flex items-center justify-end gap-1">
                    <Clock className="w-4 h-4 text-indigo-500 hidden" />
                    {timeFormatted}
                  </p>
                </div>
              </div>

              {/* Location */}
              <div className="mt-8 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Location</p>
                <p className="font-semibold text-gray-900">{visit.location?.name}</p>
                <p className="text-sm text-gray-500 mt-0.5">{visit.location?.address}</p>
              </div>

            </div>

            {/* Footer QR */}
            <div className="bg-gray-50 p-6 sm:p-8 pb-10 sm:pb-12 flex flex-col items-center justify-center border-t border-gray-100">
              <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
                {/* Dummy QR code since it's just visual for now */}
                <QrCode className={`w-20 h-20 sm:w-24 sm:h-24 ${isCanceled ? 'text-gray-300' : 'text-gray-900'}`} strokeWidth={1} />
              </div>
              <p className="text-gray-400 font-mono text-xs tracking-[0.2em] mt-4 uppercase text-center break-all">
                ID: {id?.toString().split('-')[0]}
              </p>
            </div>
            
          </div>
        </div>

        {/* Add to Wallet button simulation */}
        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full mt-6 bg-zinc-900 border border-zinc-800 text-white rounded-2xl py-4 font-semibold text-sm flex items-center justify-center gap-2 shadow-xl hover:bg-zinc-800 transition-colors"
        >
          <img src="https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" className="w-4 h-4 filter invert opacity-80" alt="Apple" />
          Add to Apple Wallet
        </motion.button>
      </motion.div>
    </div>
  );
}
