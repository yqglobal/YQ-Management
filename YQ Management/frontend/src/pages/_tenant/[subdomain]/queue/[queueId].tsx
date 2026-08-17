import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { useQuery, useMutation } from '@tanstack/react-query';
import { fetchApi, ApiError } from '../../../../lib/api';
import { languages, t } from '../../../../lib/i18n';
import { format, parseISO } from 'date-fns';

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { subdomain, queueId } = context.params as { subdomain: string, queueId: string };
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';
  
  try {
    const tenantRes = await fetch(`${baseUrl}/tenant/public/${subdomain}`);
    if (!tenantRes.ok) return { notFound: true };
    const tenant = await tenantRes.json();
    return { props: { tenant, queueId } };
  } catch (error) {
    return { notFound: true };
  }
};

export default function JoinQueue({ tenant, queueId }: { tenant: any, queueId: string }) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [language, setLanguage] = useState('en');
  const [joinMode, setJoinMode] = useState<'immediate' | 'appointment'>('immediate');
  
  // Appointment state
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');

  const primaryColor = tenant.branding?.primaryColor || '#4f46e5';

  const { data: queue, isLoading: isLoadingQueue } = useQuery({
    queryKey: ['queue', queueId],
    queryFn: () => fetchApi(`/queue/public/${queueId}`),
    enabled: !!queueId,
  });

  const { data: availableSlots = [], isLoading: isLoadingSlots } = useQuery({
    queryKey: ['queue-slots', queueId, selectedDate],
    queryFn: () => fetchApi(`/queue/${queueId}/slots?date=${selectedDate}`),
    enabled: !!queueId && !!selectedDate && joinMode === 'appointment',
  });

  useEffect(() => {
    if (queue?.formConfig) {
      const initial: Record<string, any> = {};
      queue.formConfig.forEach((field: any) => {
        if (field.type === 'dropdown' && field.options?.length > 0) {
          initial[field.id] = field.options[0];
        } else if (field.type === 'checkbox') {
          initial[field.id] = false;
        } else {
          initial[field.id] = '';
        }
      });
      setResponses((prev) => ({ ...initial, ...prev }));
    }
  }, [queue]);

  const requestOtpMutation = useMutation({
    mutationFn: (phone: string) => fetchApi('/token/request-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, queueId })
    }),
    onSuccess: () => {
      setStep(2);
      setError('');
    },
    onError: (err: any) => {
      if (err instanceof ApiError && err.status === 503) {
        const phoneField = queue?.formConfig?.find((f: any) => f.type === 'phone');
        const phone = phoneField ? responses[phoneField.id] : undefined;
        joinMutation.mutate({
          queueId,
          customerName: responses['name'] || 'Customer',
          phone,
          otp: undefined,
          formResponses: responses,
          language,
          scheduledFor: joinMode === 'appointment' && selectedTimeSlot ? selectedTimeSlot : undefined
        });
      } else {
        setError(err.message || 'Failed to send OTP. Please try again.');
      }
    }
  });

  const joinMutation = useMutation({
    mutationFn: (data: { queueId: string, customerName: string, phone?: string, otp?: string, formResponses: any, language: string, scheduledFor?: string }) => 
      fetchApi('/token/join', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    onSuccess: (data) => {
      // Navigate to the status page - the middleware handles subdomain rewriting
      router.push(`/status/${data.id}`);
    },
    onError: (err: any) => {
      setError(err.message || 'Invalid OTP. Please try again.');
    }
  });

  const handleRequestOtp = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (queue?.formConfig) {
      for (const field of queue.formConfig) {
        if (field.required && !responses[field.id]) {
          setError(`Please fill in: ${field.label}`);
          return;
        }
      }
    }

    if (joinMode === 'appointment' && !selectedTimeSlot) {
      setError('Please select an available time slot for your appointment.');
      return;
    }

    const phoneField = queue?.formConfig?.find((f: any) => f.type === 'phone');

    if (phoneField) {
      const phone = responses[phoneField.id];
      if (!phone && phoneField.required) {
        setError('Please enter your phone number.');
        return;
      }
      if (phone) {
        requestOtpMutation.mutate(phone);
      } else {
        joinMutation.mutate({
          queueId,
          customerName: responses['name'] || 'Customer',
          phone: undefined,
          otp: undefined,
          formResponses: responses,
          language,
          scheduledFor: joinMode === 'appointment' && selectedTimeSlot ? selectedTimeSlot : undefined
        });
      }
    } else {
      joinMutation.mutate({
        queueId,
        customerName: responses['name'] || 'Customer',
        phone: undefined,
        otp: undefined,
        formResponses: responses,
        language,
        scheduledFor: joinMode === 'appointment' && selectedTimeSlot ? selectedTimeSlot : undefined
      });
    }
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return;
    const phoneFieldId = queue?.formConfig?.find((f: any) => f.type === 'phone')?.id;
    joinMutation.mutate({
      queueId,
      customerName: responses['name'] || 'Customer',
      phone: phoneFieldId ? responses[phoneFieldId] : undefined,
      otp,
      formResponses: responses,
      language,
      scheduledFor: joinMode === 'appointment' && selectedTimeSlot ? selectedTimeSlot : undefined
    });
  };

  const handleInputChange = (id: string, value: any) => {
    setResponses(prev => ({ ...prev, [id]: value }));
  };

  if (isLoadingQueue) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>;
  }

  if (!queue) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Queue not found</div>;
  }

  const formConfig = queue.formConfig || [
    { id: 'name', type: 'text', label: 'Full Name', required: true, system: true },
    { id: 'phone', type: 'phone', label: 'WhatsApp Number', required: true, system: true },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 relative overflow-hidden transition-colors">
      <Head>
        <title>Join {queue.name} | {tenant.name}</title>
      </Head>

      <div 
        className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full mix-blend-multiply filter blur-[150px] pointer-events-none z-0 opacity-20"
        style={{ backgroundColor: primaryColor }}
      ></div>

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-10">
          {tenant.branding?.logoUrl ? (
            <img src={tenant.branding.logoUrl} alt={tenant.name} className="h-16 mx-auto mb-6 object-contain" />
          ) : (
             <div 
              className="w-16 h-16 mx-auto mb-6 rounded-2xl flex items-center justify-center font-bold text-white text-2xl shadow-lg"
              style={{ backgroundColor: primaryColor }}
            >
              {tenant.name.substring(0, 2).toUpperCase()}
            </div>
          )}
          <h1 className="text-3xl font-bold mb-2 text-gray-900">{t(language, 'joinQueue')} {queue.name}</h1>
          <p className="text-gray-500">Please enter your details to join.</p>
        </div>

        <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-xl">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm text-center font-medium">
              {error}
            </div>
          )}

          {queue.status === 'PAUSED' ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-amber-500 text-3xl">pause_circle</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Service on Hold</h2>
              <p className="text-gray-500">
                This queue is temporarily paused. Please wait or check back later to join.
              </p>
            </div>
          ) : step === 1 ? (
            <form onSubmit={handleRequestOtp} className="space-y-5">
              
              {formConfig.map((field: any) => (
                <div key={field.id}>
                  {field.type !== 'checkbox' && (
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </label>
                  )}

                  {field.type === 'text' && (
                    <input 
                      type="text" 
                      value={responses[field.id] || ''}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 focus:outline-none focus:ring-2 transition-all"
                      style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                      required={field.required}
                    />
                  )}

                  {field.type === 'phone' && (
                    <div>
                      <input 
                        type="tel" 
                        value={responses[field.id] || ''}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 focus:outline-none focus:ring-2 transition-all"
                        style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                        placeholder="+1234567890"
                        required={field.required}
                      />
                      <p className="text-xs text-gray-500 mt-2">We'll send you an OTP via WhatsApp to verify your number.</p>
                    </div>
                  )}

                  {field.type === 'dropdown' && (
                    <select
                      value={responses[field.id] || ''}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                      required={field.required}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 focus:outline-none focus:ring-2 transition-all appearance-none"
                      style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                    >
                      <option value="" disabled>Select an option</option>
                      {(field.options || []).map((opt: string, i: number) => (
                        <option key={i} value={opt}>{opt}</option>
                      ))}
                    </select>
                  )}

                  {field.type === 'checkbox' && (
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={!!responses[field.id]}
                        onChange={(e) => handleInputChange(field.id, e.target.checked)}
                        required={field.required}
                        className="w-5 h-5 border-gray-300 rounded"
                        style={{ accentColor: primaryColor }}
                      />
                      <span className="text-sm font-medium text-gray-700">
                        {field.label} {field.required && <span className="text-red-500">*</span>}
                      </span>
                    </label>
                  )}
                </div>
              ))}

              {queue?.allowAppointments && (
                <div className="space-y-4 pt-4 border-t border-gray-100">
                  <h3 className="text-sm font-medium text-gray-700">When do you want to join?</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      type="button" 
                      onClick={() => setJoinMode('immediate')}
                      className="p-3 rounded-xl border text-sm font-medium transition-all"
                      style={joinMode === 'immediate' ? { backgroundColor: `${primaryColor}15`, borderColor: primaryColor, color: primaryColor } : { backgroundColor: '#f9fafb', borderColor: '#e5e7eb', color: '#374151' }}
                    >
                      Join Now
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setJoinMode('appointment')}
                      className="p-3 rounded-xl border text-sm font-medium transition-all"
                      style={joinMode === 'appointment' ? { backgroundColor: `${primaryColor}15`, borderColor: primaryColor, color: primaryColor } : { backgroundColor: '#f9fafb', borderColor: '#e5e7eb', color: '#374151' }}
                    >
                      Book Appointment
                    </button>
                  </div>
                  
                  {joinMode === 'appointment' && (
                    <div className="mt-4 p-4 rounded-xl border border-gray-100 bg-gray-50/50 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Select Date</label>
                        <input 
                          type="date" 
                          value={selectedDate}
                          onChange={(e) => {
                            setSelectedDate(e.target.value);
                            setSelectedTimeSlot('');
                          }}
                          min={new Date().toISOString().split('T')[0]}
                          className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 transition-all"
                          style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                          required
                        />
                      </div>

                      {selectedDate && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Select Time</label>
                          {isLoadingSlots ? (
                            <div className="text-sm text-gray-500 py-2">Loading available slots...</div>
                          ) : availableSlots.length > 0 ? (
                            <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                              {availableSlots.map((slot: string) => {
                                const isSelected = selectedTimeSlot === slot;
                                return (
                                  <button
                                    key={slot}
                                    type="button"
                                    onClick={() => setSelectedTimeSlot(slot)}
                                    className="p-2 text-xs font-medium rounded-lg border transition-all"
                                    style={isSelected ? { backgroundColor: primaryColor, borderColor: primaryColor, color: 'white' } : { backgroundColor: 'white', borderColor: '#e5e7eb', color: '#374151' }}
                                  >
                                    {format(parseISO(slot), 'HH:mm')}
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="text-sm text-red-500 py-2 bg-red-50 rounded-lg px-3 border border-red-100">
                              No available slots for this date.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <button 
                type="submit"
                disabled={requestOtpMutation.isPending}
                className="w-full py-4 mt-8 text-white rounded-xl font-bold transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                style={{ backgroundColor: primaryColor }}
              >
                {requestOtpMutation.isPending ? 'Sending OTP...' : joinMutation.isPending ? 'Joining queue...' : 'Continue'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="text-center mb-6">
                <p className="text-sm text-gray-600">
                  Enter the 6-digit code sent to <br/>
                  <strong className="text-gray-900">{responses['phone']}</strong>
                </p>
              </div>

              <div>
                <input 
                  type="text" 
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-center text-3xl tracking-[1em] text-gray-900 font-mono focus:outline-none focus:ring-2 transition-all"
                  style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                  placeholder="------"
                  required
                />
              </div>

              <button 
                type="submit"
                disabled={joinMutation.isPending || otp.length !== 6}
                className="w-full py-4 text-white rounded-xl font-bold transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                style={{ backgroundColor: primaryColor }}
              >
                {joinMutation.isPending ? 'Verifying...' : 'Verify & Join Queue'}
              </button>

              <button 
                type="button"
                onClick={() => setStep(1)}
                className="w-full py-2 text-gray-500 hover:text-gray-700 text-sm transition-colors"
              >
                Use a different number
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
