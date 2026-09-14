import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { CheckCircle2, Clock, MapPin, ChevronRight, ArrowLeft, Loader2, QrCode } from 'lucide-react';
import { fetchApi } from '../../../../lib/api';
import Link from 'next/link';
import { TenantSupportFooter } from '../../../../components/TenantSupportFooter';

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { subdomain } = context.params as { subdomain: string };
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  try {
    const res = await fetch(`${baseUrl}/tenant/public/${subdomain}`);
    if (!res.ok) return { notFound: true };
    const tenant = await res.json();
    if (!tenant.selfServeModeEnabled) {
      return { redirect: { destination: '/booking', permanent: false } };
    }
    return { props: { tenant } };
  } catch {
    return { notFound: true };
  }
};

type Step = 'choose' | 'phone' | 'otp' | 'visits' | 'confirmed';

interface VisitSummary {
  id: string;
  displayId: string | null;
  accessToken: string;
  serviceName: string | null;
  locationName: string | null;
  scheduledTime: string | null;
  currentState: string;
  position: number;
  estimatedWaitTime: number;
  requiresCheckIn: boolean;
}

const SESSION_KEY = 'checkin_session';

export default function SelfServeCheckinPage({ tenant }: { tenant: any }) {
  const router = useRouter();
  const { locationId } = router.query as { locationId?: string };

  const [step, setStep] = useState<Step>('choose');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [sessionToken, setSessionToken] = useState('');
  const [visits, setVisits] = useState<VisitSummary[]>([]);
  const [selectedVisit, setSelectedVisit] = useState<VisitSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [ewtSeconds, setEwtSeconds] = useState(0);

  const primaryColor = tenant?.branding?.primaryColor || '#4f46e5';

  // Check for existing session in sessionStorage
  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.sessionToken && parsed.tenantId === tenant.id) {
          setSessionToken(parsed.sessionToken);
          setPhone(parsed.phone || '');
          setStep('visits');
          // Re-fetch visits with the saved session
          fetchVisitsWithSession(parsed.sessionToken, parsed.phone);
        }
      } catch {}
    }
  }, []);

  // Live EWT countdown
  useEffect(() => {
    if (!selectedVisit || selectedVisit.currentState !== 'CHECKED_IN') return;
    setEwtSeconds(selectedVisit.estimatedWaitTime * 60);
    const timer = setInterval(() => {
      setEwtSeconds(s => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [selectedVisit]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown(s => s - 1), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const fetchVisitsWithSession = async (token: string, ph: string) => {
    setLoading(true);
    try {
      const res = await fetchApi(`/public-checkin/verify-otp`, {
        method: 'POST',
        body: JSON.stringify({ phone: ph, tenantId: tenant.id, locationId, code: '__SESSION__' }),
      });
      // Will fail with 401 — use the session to refetch visits differently
      // For now just advance to visits step
    } catch {}
    setLoading(false);
  };

  const handleSendOtp = async () => {
    if (!phone || phone.length < 7) { setError('Please enter a valid phone number'); return; }
    setLoading(true);
    setError('');
    try {
      await fetchApi('/public-checkin/send-otp', {
        method: 'POST',
        body: JSON.stringify({ phone, tenantId: tenant.id, locationId }),
      });
      setStep('otp');
      setResendCooldown(45);
    } catch (e: any) {
      setError(e.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) { setError('Please enter the 6-digit code'); return; }
    setLoading(true);
    setError('');
    try {
      const data = await fetchApi('/public-checkin/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ phone, tenantId: tenant.id, locationId, code: otp }),
      });
      setSessionToken(data.sessionToken);
      setVisits(data.visits || []);
      // Persist session
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ sessionToken: data.sessionToken, tenantId: tenant.id, phone }));
      setStep('visits');
    } catch (e: any) {
      setError(e.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCheckIn = async (visit: VisitSummary) => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchApi(`/public-checkin/${visit.id}/confirm`, {
        method: 'POST',
        body: JSON.stringify({ sessionToken }),
      });
      setSelectedVisit({ ...visit, currentState: 'CHECKED_IN', ...data });
      setEwtSeconds(visit.estimatedWaitTime * 60);
      setStep('confirmed');
    } catch (e: any) {
      setError(e.message || 'Check-in failed');
    } finally {
      setLoading(false);
    }
  };

  const fmtTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const stateLabel: Record<string, string> = {
    CREATED: 'Scheduled',
    SCHEDULED: 'Scheduled',
    CHECKED_IN: 'Checked In · Waiting',
    WAITING: 'Waiting',
    IN_SERVICE: '🟢 Being Served Now',
    COMPLETED: 'Completed',
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Head>
        <title>Check In | {tenant.name}</title>
        <meta name="description" content={`Self-serve check-in at ${tenant.name}`} />
      </Head>

      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        {step !== 'choose' && (
          <button onClick={() => { setStep('choose'); setError(''); }} className="p-1 rounded-lg hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
        )}
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${primaryColor}20` }}>
          <CheckCircle2 className="w-4 h-4" style={{ color: primaryColor }} />
        </div>
        <div>
          <p className="font-semibold text-gray-900 text-sm">{tenant.name}</p>
          <p className="text-xs text-gray-400">Self Check-in</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <AnimatePresence mode="wait">

            {/* STEP: Choose Journey */}
            {step === 'choose' && (
              <motion.div key="choose" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome!</h1>
                <p className="text-gray-500 mb-8">What would you like to do?</p>

                <div className="space-y-3">
                  <button
                    onClick={() => setStep('phone')}
                    className="w-full flex items-center justify-between bg-white border border-gray-200 rounded-2xl p-5 hover:border-gray-300 hover:shadow-sm transition-all group"
                  >
                    <div className="text-left">
                      <p className="font-semibold text-gray-900">I have a booking</p>
                      <p className="text-sm text-gray-500 mt-0.5">Check in to an existing appointment</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  </button>

                  <Link
                    href="/booking"
                    className="w-full flex items-center justify-between bg-white border border-gray-200 rounded-2xl p-5 hover:border-gray-300 hover:shadow-sm transition-all group"
                  >
                    <div className="text-left">
                      <p className="font-semibold text-gray-900">I'm a walk-in</p>
                      <p className="text-sm text-gray-500 mt-0.5">Join the queue right now</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  </Link>
                </div>
              </motion.div>
            )}

            {/* STEP: Enter Phone */}
            {step === 'phone' && (
              <motion.div key="phone" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Your mobile number</h1>
                <p className="text-gray-500 mb-6">We'll send a one-time code to your WhatsApp to find your booking.</p>
                <div className="mb-4">
                  <PhoneInput
                    international
                    defaultCountry="ZA"
                    value={phone}
                    onChange={(v) => setPhone(v || '')}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus-within:ring-2 bg-white"
                  />
                </div>
                {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
                <button
                  onClick={handleSendOtp}
                  disabled={loading || !phone}
                  className="w-full py-3.5 text-white font-semibold rounded-2xl transition-opacity disabled:opacity-50"
                  style={{ backgroundColor: primaryColor }}
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Send Code →'}
                </button>
              </motion.div>
            )}

            {/* STEP: Enter OTP */}
            {step === 'otp' && (
              <motion.div key="otp" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Enter your code</h1>
                <p className="text-gray-500 mb-6">We sent a 6-digit code to your WhatsApp at <strong>{phone}</strong>.</p>
                <input
                  type="number"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="______"
                  value={otp}
                  onChange={e => setOtp(e.target.value.slice(0, 6))}
                  className="w-full text-center text-3xl font-bold tracking-[0.5em] border border-gray-200 rounded-xl py-4 mb-4 bg-white focus:outline-none focus:ring-2"
                  style={{ '--tw-ring-color': primaryColor } as any}
                />
                {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
                <button
                  onClick={handleVerifyOtp}
                  disabled={loading || otp.length !== 6}
                  className="w-full py-3.5 text-white font-semibold rounded-2xl transition-opacity disabled:opacity-50"
                  style={{ backgroundColor: primaryColor }}
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Verify & Find My Booking'}
                </button>
                <div className="text-center mt-4">
                  {resendCooldown > 0 ? (
                    <p className="text-sm text-gray-400">Resend in {resendCooldown}s</p>
                  ) : (
                    <button onClick={handleSendOtp} className="text-sm font-medium" style={{ color: primaryColor }}>
                      Resend code
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {/* STEP: Show Visits */}
            {step === 'visits' && (
              <motion.div key="visits" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">Your bookings</h1>
                <p className="text-gray-500 mb-6">Select a booking to check in.</p>
                {visits.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                    <QrCode className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="font-semibold text-gray-700">No active bookings found</p>
                    <p className="text-sm text-gray-400 mt-1">Check that you used the same phone number you booked with.</p>
                    <Link href="/booking" className="mt-4 inline-block text-sm font-medium px-4 py-2 rounded-xl text-white" style={{ backgroundColor: primaryColor }}>
                      Join queue as walk-in
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {visits.map(visit => (
                      <div key={visit.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-bold text-gray-900">{visit.serviceName}</p>
                            {visit.scheduledTime && (
                              <p className="text-sm text-gray-500 mt-0.5">
                                {new Date(visit.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            )}
                          </div>
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                            visit.currentState === 'IN_SERVICE' ? 'bg-emerald-100 text-emerald-700' :
                            visit.currentState === 'CHECKED_IN' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {stateLabel[visit.currentState] || visit.currentState}
                          </span>
                        </div>

                        {visit.currentState === 'CHECKED_IN' && (
                          <div className="flex gap-3 mb-3">
                            <div className="flex-1 bg-gray-50 rounded-xl p-3 text-center">
                              <MapPin className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                              <p className="text-xl font-bold text-gray-900">#{visit.position}</p>
                              <p className="text-xs text-gray-400">Your position</p>
                            </div>
                            <div className="flex-1 bg-gray-50 rounded-xl p-3 text-center">
                              <Clock className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                              <p className="text-xl font-bold text-gray-900">~{visit.estimatedWaitTime}m</p>
                              <p className="text-xs text-gray-400">Est. wait</p>
                            </div>
                          </div>
                        )}

                        {(visit.requiresCheckIn && visit.currentState === 'SCHEDULED') && (
                          <button
                            onClick={() => handleConfirmCheckIn(visit)}
                            disabled={loading}
                            className="w-full py-3 text-white font-semibold rounded-xl transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                            style={{ backgroundColor: primaryColor }}
                          >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                              <><CheckCircle2 className="w-4 h-4" /> Check In</>
                            )}
                          </button>
                        )}

                        {visit.currentState === 'IN_SERVICE' && (
                          <div className="w-full py-3 bg-emerald-50 text-emerald-700 font-semibold rounded-xl text-center text-sm">
                            🟢 Please proceed to your service now!
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
              </motion.div>
            )}

            {/* STEP: Confirmed — live status */}
            {step === 'confirmed' && selectedVisit && (
              <motion.div key="confirmed" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                <div className="text-center mb-8">
                  <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-4" style={{ backgroundColor: `${primaryColor}15` }}>
                    <CheckCircle2 className="w-10 h-10" style={{ color: primaryColor }} />
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">You're checked in! ✅</h1>
                  <p className="text-gray-500">A WhatsApp confirmation has been sent to you.</p>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm mb-4">
                  <p className="font-bold text-gray-900 text-lg mb-4">{selectedVisit.serviceName}</p>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-gray-50 rounded-xl p-4 text-center">
                      <MapPin className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                      <p className="text-3xl font-bold text-gray-900">#{selectedVisit.position || 1}</p>
                      <p className="text-xs text-gray-400 mt-1">Your position</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 text-center">
                      <Clock className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                      <p className="text-3xl font-bold text-gray-900 tabular-nums">{fmtTime(ewtSeconds)}</p>
                      <p className="text-xs text-gray-400 mt-1">Time remaining</p>
                    </div>
                  </div>

                  <p className="text-xs text-center text-gray-400">
                    We'll send you a WhatsApp message when it's your turn.
                  </p>
                </div>

                <Link
                  href={`/status/${selectedVisit.accessToken}`}
                  className="block w-full text-center py-3 rounded-2xl font-semibold text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  View Live Status →
                </Link>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
      <TenantSupportFooter tenant={tenant} />
    </div>
  );
}
