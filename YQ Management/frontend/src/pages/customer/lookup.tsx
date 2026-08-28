import { useState, useEffect } from 'react';
import { MapPin, Clock, XCircle, Search, AlertCircle, Phone, ArrowRight } from 'lucide-react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { format } from 'date-fns';

export default function CustomerLookup() {
  const [phone, setPhone] = useState('');
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const router = useRouter();

  // If a phone number is provided in the URL, search immediately
  useEffect(() => {
    if (router.query.phone && typeof router.query.phone === 'string') {
      setPhone(router.query.phone);
      handleSearch(router.query.phone);
    }
  }, [router.query.phone]);

  const handleSearch = async (phoneNumber: string = phone) => {
    if (!phoneNumber.trim()) {
      setError('Please enter a valid phone number');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5455'}/public-visit/by-phone?phone=${encodeURIComponent(phoneNumber)}`);
      if (!response.ok) {
        throw new Error('Failed to find tickets');
      }
      const data = await response.json();
      setVisits(data);
      setSearched(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (accessToken: string) => {
    if (!confirm('Are you sure you want to cancel this ticket?')) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5455'}/public-visit/${accessToken}/cancel`, {
        method: 'POST',
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Failed to cancel ticket');
      }
      
      // Refresh the list
      handleSearch();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel ticket');
    }
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'WAITING':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'SERVING':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'SCHEDULED':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-900 py-12 px-4 sm:px-6 lg:px-8">
      <Head>
        <title>Find My Tickets | Qmova</title>
      </Head>

      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">
            Find Your Tickets
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Enter your phone number to view and manage your active queue tickets across all businesses.
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-800 shadow rounded-xl p-6 border border-gray-100 dark:border-zinc-700">
          <div className="flex gap-4">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Phone className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-zinc-600 rounded-lg leading-5 bg-white dark:bg-zinc-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 dark:text-white"
                placeholder="Enter your phone number (e.g. +1234567890)"
              />
            </div>
            <button
              onClick={() => handleSearch()}
              disabled={loading || !phone.trim()}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Searching...' : 'Search'}
              {!loading && <Search className="ml-2 -mr-1 h-5 w-5" />}
            </button>
          </div>
          {error && (
            <div className="mt-4 flex items-center text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-800/30">
              <AlertCircle className="h-4 w-4 mr-2" />
              {error}
            </div>
          )}
        </div>

        {searched && !loading && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center justify-between">
              Active Tickets
              <span className="bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 text-sm py-1 px-3 rounded-full border border-gray-200 dark:border-zinc-700">
                {visits.length} found
              </span>
            </h2>

            {visits.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-zinc-800 rounded-xl border border-gray-100 dark:border-zinc-700 shadow-sm">
                <div className="mx-auto w-16 h-16 bg-gray-50 dark:bg-zinc-700/50 rounded-full flex items-center justify-center mb-4">
                  <Search className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">No active tickets</h3>
                <p className="mt-1 text-gray-500 dark:text-gray-400">We couldn't find any active tickets for this phone number.</p>
              </div>
            ) : (
              <div className="grid gap-6">
                {visits.map((visit) => (
                  <div key={visit.id} className="bg-white dark:bg-zinc-800 shadow-sm rounded-xl overflow-hidden border border-gray-100 dark:border-zinc-700 hover:shadow-md transition-shadow">
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full border ${getStateColor(visit.currentState)}`}>
                            {visit.currentState}
                          </span>
                          <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                            Token: <strong className="text-gray-900 dark:text-white">{visit.displayId}</strong>
                          </span>
                        </div>
                        <a 
                          href={`/customer/status/${visit.accessToken}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center"
                        >
                          View Live Status <ArrowRight className="ml-1 h-4 w-4" />
                        </a>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                        <div className="flex items-start">
                          <MapPin className="h-5 w-5 text-gray-400 mt-0.5 mr-3 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{visit.queue?.location?.name || 'Main Location'}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{visit.queue?.name}</p>
                          </div>
                        </div>
                        <div className="flex items-start">
                          <Clock className="h-5 w-5 text-gray-400 mt-0.5 mr-3 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {visit.scheduledTime 
                                ? `Scheduled: ${format(new Date(visit.scheduledTime), 'MMM d, h:mm a')}` 
                                : 'Walk-in'}
                            </p>
                            {visit.waitingStart && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Joined at {format(new Date(visit.waitingStart), 'h:mm a')}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-gray-100 dark:border-zinc-700 pt-4 flex justify-end">
                        <button
                          onClick={() => handleCancel(visit.accessToken)}
                          className="inline-flex items-center px-4 py-2 border border-red-300 dark:border-red-800 shadow-sm text-sm font-medium rounded-lg text-red-700 dark:text-red-400 bg-white dark:bg-transparent hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Cancel Ticket
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
