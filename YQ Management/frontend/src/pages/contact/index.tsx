import React, { useState } from 'react';
import MarketingLayout from '../../components/MarketingLayout';
import { fetchApi } from '../../lib/api';
import { Mail, MessageSquare, Building2, Phone, Clock, ShieldCheck, CheckCircle2, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    companyName: '',
    phone: '',
    inquiryType: 'sales',
    message: '',
  });

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.companyName || !formData.message) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        companyName: formData.companyName.trim(),
        phone: formData.phone.trim() || undefined,
        message: `[Topic: ${formData.inquiryType.toUpperCase()}] ${formData.message.trim()}`,
      };

      await fetchApi('/billing/enterprise-inquiries', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setSubmitted(true);
      toast.success('Your message has been sent successfully!');
    } catch (err: any) {
      console.error('Contact form submission failed:', err);
      toast.error(err?.message || 'Failed to submit inquiry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MarketingLayout
      title="Contact Us | Qmova Enterprise Visit Management"
      description="Connect with Qmova's solution architects, enterprise support, and partnerships teams."
    >
      <div className="pt-28 pb-24 px-6 relative overflow-hidden">
        {/* Glow backdrop effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-indigo-600/10 blur-[130px] pointer-events-none rounded-full" />
        <div className="absolute bottom-10 right-10 w-[400px] h-[250px] bg-purple-600/10 blur-[100px] pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto relative z-10">
          {/* Header */}
          <div className="max-w-3xl mb-16">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              We're Here For You
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
              Let's talk about transforming your customer flow.
            </h1>
            <p className="text-lg text-zinc-400 leading-relaxed">
              Whether you need enterprise-scale deployment across hundreds of locations, custom industry workflows, or immediate support, our specialized team is standing by.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            {/* Left Column: Direct channels & Trust proof */}
            <div className="lg:col-span-5 space-y-8">
              <div className="p-8 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-sm space-y-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-400" />
                  Direct Channels
                </h3>

                <div className="space-y-4 text-sm">
                  <div className="p-4 rounded-xl bg-zinc-800/40 border border-white/5 hover:border-white/10 transition-colors">
                    <p className="text-xs uppercase font-semibold text-indigo-400 mb-1">Enterprise & Sales</p>
                    <a href="mailto:sales@qmova.com" className="text-white font-medium hover:text-indigo-300 transition-colors flex items-center gap-2">
                      <Mail className="w-4 h-4 text-zinc-400" /> sales@qmova.com
                    </a>
                    <p className="text-xs text-zinc-500 mt-1">Dedicated solutions engineer response within 2 hours.</p>
                  </div>

                  <div className="p-4 rounded-xl bg-zinc-800/40 border border-white/5 hover:border-white/10 transition-colors">
                    <p className="text-xs uppercase font-semibold text-emerald-400 mb-1">Customer Support</p>
                    <a href="mailto:support@qmova.com" className="text-white font-medium hover:text-emerald-300 transition-colors flex items-center gap-2">
                      <Mail className="w-4 h-4 text-zinc-400" /> support@qmova.com
                    </a>
                    <p className="text-xs text-zinc-500 mt-1">24/7 technical incident desk for active subscribers.</p>
                  </div>

                  <div className="p-4 rounded-xl bg-zinc-800/40 border border-white/5 hover:border-white/10 transition-colors">
                    <p className="text-xs uppercase font-semibold text-amber-400 mb-1">Security & Compliance</p>
                    <a href="mailto:security@qmova.com" className="text-white font-medium hover:text-amber-300 transition-colors flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-zinc-400" /> security@qmova.com
                    </a>
                    <p className="text-xs text-zinc-500 mt-1">SOC 2 Type II, HIPAA BAA, and GDPR audit records.</p>
                  </div>
                </div>
              </div>

              {/* Response SLA Commitment */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-950/40 to-purple-950/20 border border-indigo-500/20">
                <div className="flex items-center gap-3 mb-2">
                  <Clock className="w-5 h-5 text-indigo-400" />
                  <h4 className="text-sm font-semibold text-white">Guaranteed Response SLA</h4>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Enterprise inquiries are routed directly to our executive account engineers with a guaranteed response under 1 business hour.
                </p>
              </div>
            </div>

            {/* Right Column: Interactive Form */}
            <div className="lg:col-span-7">
              <div className="p-8 md:p-10 rounded-2xl bg-zinc-900/80 border border-white/10 backdrop-blur-md shadow-2xl">
                {submitted ? (
                  <div className="py-12 flex flex-col items-center text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h3 className="text-2xl font-bold text-white">Thank you for reaching out!</h3>
                    <p className="text-zinc-400 text-sm max-w-md leading-relaxed">
                      We have received your message. Our team will review your requirements and follow up at <span className="text-white font-medium">{formData.email}</span> within 2 hours.
                    </p>
                    <button
                      onClick={() => {
                        setSubmitted(false);
                        setFormData({
                          name: '',
                          email: '',
                          companyName: '',
                          phone: '',
                          inquiryType: 'sales',
                          message: '',
                        });
                      }}
                      className="mt-4 px-6 py-2.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold transition-colors"
                    >
                      Send Another Message
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">Send us a message</h3>
                      <p className="text-xs text-zinc-400">Fill out the form below and we'll connect you with the right specialist.</p>
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
                          placeholder="Sarah Jenkins"
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
                          placeholder="sarah@company.com"
                          className="w-full px-4 py-2.5 rounded-xl bg-zinc-800/80 border border-white/10 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                          Company / Organization <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.companyName}
                          onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                          placeholder="Acme Health Inc."
                          className="w-full px-4 py-2.5 rounded-xl bg-zinc-800/80 border border-white/10 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                          Phone Number (Optional)
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

                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                        Inquiry Topic
                      </label>
                      <select
                        value={formData.inquiryType}
                        onChange={(e) => setFormData({ ...formData, inquiryType: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-zinc-800/80 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                      >
                        <option value="sales">Enterprise Pricing & Multi-Location Rollout</option>
                        <option value="demo">Product Architecture & Custom Flows</option>
                        <option value="support">Technical Support & Platform Assistance</option>
                        <option value="partnership">API Integrations & Hardware Partnerships</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                        How can we help? <span className="text-rose-400">*</span>
                      </label>
                      <textarea
                        required
                        rows={4}
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        placeholder="Tell us about your locations, expected foot traffic, or any custom integrations you need..."
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
                          Sending Inquiry...
                        </>
                      ) : (
                        <>
                          Send Message
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}
