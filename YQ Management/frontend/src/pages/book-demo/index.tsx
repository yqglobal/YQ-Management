import React, { useState } from 'react';
import MarketingLayout from '../../components/MarketingLayout';
import { fetchApi } from '../../lib/api';
import { Calendar, MonitorPlay, CheckCircle2, ArrowRight, Loader2, Sparkles, Shield, Building, Users, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

export default function BookDemoPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    companyName: '',
    phone: '',
    industry: 'healthcare',
    locationsCount: '1-3',
    monthlyVisitors: '1,000 - 5,000',
    primaryGoal: 'reduce_wait_times',
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.companyName) {
      toast.error('Please complete all required fields.');
      return;
    }

    setLoading(true);
    try {
      const formattedMessage = `[DEMO REQUEST]
Industry: ${formData.industry}
Locations: ${formData.locationsCount}
Monthly Visitors: ${formData.monthlyVisitors}
Primary Goal: ${formData.primaryGoal}
Notes: ${formData.notes || 'None provided'}`;

      await fetchApi('/billing/enterprise-inquiries', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          companyName: formData.companyName.trim(),
          phone: formData.phone.trim() || undefined,
          message: formattedMessage,
        }),
      });

      setSubmitted(true);
      toast.success('Demo request submitted! We will contact you shortly.');
    } catch (err: any) {
      console.error('Demo submission error:', err);
      toast.error(err?.message || 'Failed to request demo. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MarketingLayout
      title="Book a Live Demo | Qmova Enterprise Visit Management"
      description="Schedule a 1-on-1 walkthrough tailored to your industry, physical locations, and visitor workflow requirements."
    >
      <div className="pt-28 pb-24 px-6 relative overflow-hidden">
        {/* Glow backdrop effects */}
        <div className="absolute top-20 left-1/3 w-[500px] h-[350px] bg-indigo-600/15 blur-[140px] pointer-events-none rounded-full" />
        <div className="absolute bottom-20 right-10 w-[450px] h-[300px] bg-purple-600/10 blur-[120px] pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto relative z-10">
          {/* Header */}
          <div className="max-w-3xl mb-14">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              Tailored Product Walkthrough
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
              See Qmova in action with your industry's exact workflow.
            </h1>
            <p className="text-lg text-zinc-400 leading-relaxed">
              Join a 30-minute private consultation with an enterprise solutions architect. We'll simulate your physical queues, digital kiosks, WhatsApp notifications, and staff counters in real time.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            {/* Left: Interactive Demo Form */}
            <div className="lg:col-span-7">
              <div className="p-8 md:p-10 rounded-2xl bg-zinc-900/80 border border-white/10 backdrop-blur-md shadow-2xl">
                {submitted ? (
                  <div className="py-12 flex flex-col items-center text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h3 className="text-2xl font-bold text-white">Your Demo is Reserved!</h3>
                    <p className="text-zinc-400 text-sm max-w-md leading-relaxed">
                      Thank you, <span className="text-white font-medium">{formData.name}</span>. An executive solutions engineer will reach out to <span className="text-white font-medium">{formData.email}</span> within 2 hours with tailored calendar timeslots and an interactive sandbox preview.
                    </p>
                    <button
                      onClick={() => {
                        setSubmitted(false);
                        setFormData({
                          name: '',
                          email: '',
                          companyName: '',
                          phone: '',
                          industry: 'healthcare',
                          locationsCount: '1-3',
                          monthlyVisitors: '1,000 - 5,000',
                          primaryGoal: 'reduce_wait_times',
                          notes: '',
                        });
                      }}
                      className="mt-4 px-6 py-2.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold transition-colors"
                    >
                      Book Another Session
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">Tell us about your organization</h3>
                      <p className="text-xs text-zinc-400">All fields marked with an asterisk are required.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                          Full Name <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Dr. Amanda Vance"
                          className="w-full px-4 py-2.5 rounded-xl bg-zinc-800/80 border border-white/10 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                          Work Email <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="amanda@clinicgroup.com"
                          className="w-full px-4 py-2.5 rounded-xl bg-zinc-800/80 border border-white/10 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                          Company / Network Name <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.companyName}
                          onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                          placeholder="Metro Health Network"
                          className="w-full px-4 py-2.5 rounded-xl bg-zinc-800/80 border border-white/10 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="+1 (555) 000-0000"
                          className="w-full px-4 py-2.5 rounded-xl bg-zinc-800/80 border border-white/10 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                          Industry Template
                        </label>
                        <select
                          value={formData.industry}
                          onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl bg-zinc-800/80 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                        >
                          <option value="healthcare">Healthcare, Hospitals & Dental</option>
                          <option value="retail">Retail Showrooms & Customer Centers</option>
                          <option value="public_sector">Public Services & Government DMVs</option>
                          <option value="banking">Financial Branches & Banking</option>
                          <option value="education">University Admissions & Student Services</option>
                          <option value="hospitality">Salons, Spas & Wellness Resorts</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                          Physical Locations
                        </label>
                        <select
                          value={formData.locationsCount}
                          onChange={(e) => setFormData({ ...formData, locationsCount: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl bg-zinc-800/80 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                        >
                          <option value="1-3">1 - 3 Locations</option>
                          <option value="4-10">4 - 10 Locations</option>
                          <option value="11-25">11 - 25 Locations</option>
                          <option value="26-100">26 - 100 Locations</option>
                          <option value="100+">100+ Enterprise Locations</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                        Primary Goal / Urgent Pain Point
                      </label>
                      <select
                        value={formData.primaryGoal}
                        onChange={(e) => setFormData({ ...formData, primaryGoal: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-zinc-800/80 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                      >
                        <option value="reduce_wait_times">Reduce perceived wait times & eliminate physical lines</option>
                        <option value="whatsapp_alerts">Implement automated WhatsApp & SMS arrival notifications</option>
                        <option value="multi_step_flow">Orchestrate complex multi-stage patient / customer journeys</option>
                        <option value="digital_signage">Deploy live TV display queues and self-service kiosks</option>
                        <option value="scheduling_sync">Replace fragmented booking tools with 2-way calendar sync</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                        Specific Questions or Systems to Integrate
                      </label>
                      <textarea
                        rows={3}
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Mention any existing EHR/EMR, CRM, or hardware you need Qmova to connect with..."
                        className="w-full px-4 py-3 rounded-xl bg-zinc-800/80 border border-white/10 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 px-6 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Scheduling Demo...
                        </>
                      ) : (
                        <>
                          Schedule Live Demo
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Right: What to expect in your demo */}
            <div className="lg:col-span-5 space-y-6">
              <div className="p-8 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-sm space-y-6">
                <div className="flex items-center gap-2.5 text-indigo-400">
                  <MonitorPlay className="w-5 h-5" />
                  <h3 className="text-base font-bold text-white">What to expect in your session</h3>
                </div>

                <ul className="space-y-4 text-sm text-zinc-400">
                  <li className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                      1
                    </div>
                    <div>
                      <strong className="text-white block font-medium">Industry Blueprint Demonstration</strong>
                      Walkthrough of workflows designed specifically for your vertical (triage, consultations, orders, appointments).
                    </div>
                  </li>

                  <li className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                      2
                    </div>
                    <div>
                      <strong className="text-white block font-medium">Full Hardware & Display Simulation</strong>
                      Live view of customer smartphone check-in, tablet kiosk mode, digital waiting room signage, and staff desk counters.
                    </div>
                  </li>

                  <li className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                      3
                    </div>
                    <div>
                      <strong className="text-white block font-medium">Integrations & Architecture Mapping</strong>
                      Review of our REST API, Webhooks, Stripe billing, Google Calendar sync, and native WhatsApp Baileys gateway.
                    </div>
                  </li>

                  <li className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                      4
                    </div>
                    <div>
                      <strong className="text-white block font-medium">Transparent Enterprise Quote</strong>
                      Custom ROI analysis based on your exact location count and expected visitor traffic.
                    </div>
                  </li>
                </ul>
              </div>

              {/* Security & Compliance Callout */}
              <div className="p-6 rounded-2xl bg-zinc-900/40 border border-white/5 space-y-3">
                <div className="flex items-center gap-2 text-white font-medium text-sm">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  Enterprise-Grade Security Standards
                </div>
                <div className="flex flex-wrap gap-2 text-[11px] text-zinc-400">
                  <span className="px-2.5 py-1 rounded-md bg-zinc-800/80 border border-white/5">SOC 2 Type II</span>
                  <span className="px-2.5 py-1 rounded-md bg-zinc-800/80 border border-white/5">HIPAA Compliant</span>
                  <span className="px-2.5 py-1 rounded-md bg-zinc-800/80 border border-white/5">GDPR & CCPA</span>
                  <span className="px-2.5 py-1 rounded-md bg-zinc-800/80 border border-white/5">99.99% SLA</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}
