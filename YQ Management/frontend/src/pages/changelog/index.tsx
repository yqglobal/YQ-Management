import React, { useState } from 'react';
import MarketingLayout from '../../components/MarketingLayout';
import { Sparkles, Tag, Calendar, Check, GitCommit, Layers, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

interface ReleaseNote {
  version: string;
  title: string;
  date: string;
  category: 'Major' | 'Feature' | 'Improvement';
  summary: string;
  highlights: string[];
  tags: string[];
}

const releases: ReleaseNote[] = [
  {
    version: 'v2.4.0',
    title: 'Staff Desk Workspace & Real-time KDS Queue Display',
    date: 'October 2026',
    category: 'Major',
    summary: 'Introducing a high-productivity staff workspace ("My Desk") with modular widgets, live Kitchen Display System (KDS) bump bar, patient clinical notes, and instant customer visit history.',
    highlights: [
      'Modular Staff Desk: dynamic widget grid with Current Task counter, Customer History timeline, Today Schedule view, and KDS queue.',
      'Kitchen Display & Counter KDS: color-coded wait times with one-click "Bump" completion and auto-refresh telemetry.',
      'Instant Patient & Customer Lookup: drill down into past visit history, customer notes, VIP flags, and satisfaction ratings.',
      'One-click Call & Announce: direct audio-visual counter announcement triggering customer notifications.',
    ],
    tags: ['Staff Desk', 'KDS', 'Queue Engine', 'UI'],
  },
  {
    version: 'v2.3.0',
    title: 'Native WhatsApp Baileys Gateway & Multi-Device Sync',
    date: 'September 2026',
    category: 'Feature',
    summary: 'Deliver instant visitor arrival confirmations, turn-ready alerts, and estimated wait times directly over WhatsApp without per-message third-party carrier costs.',
    highlights: [
      'Native QR Pairing: connect your clinic or retail phone line in seconds via Baileys multi-device pairing.',
      'Zero-Carrier SMS Fees: send rich media arrival notices, interactive queue links, and feedback prompts over WhatsApp.',
      'Automated Reminder Cron: configurable 24-hour and 1-hour appointment reminder pings.',
      'Failover SMS Integration: automatic fallback to Twilio when WhatsApp delivery is unavailable.',
    ],
    tags: ['WhatsApp', 'Notifications', 'Automations'],
  },
  {
    version: 'v2.2.0',
    title: 'Visual Journey Stage Builder & Stripe In-Queue Payments',
    date: 'August 2026',
    category: 'Feature',
    summary: 'Design multi-step customer journeys with conditional branch routing and collect booking deposits or in-queue service payments via Stripe.',
    highlights: [
      'Drag-and-Drop Flow Canvas: sequence triage, consultation, diagnostics, lab procedures, and checkout steps.',
      'Integrated Stripe Checkout: enforce deposits for high-demand services with automatic refund on compliant cancellation.',
      'Role-based Step Permissions: route visitors between specialized staff members as they complete each stage.',
      'Dynamic Form Questions: collect medical questionnaires or intake answers directly during queue check-in.',
    ],
    tags: ['Workflows', 'Stripe', 'Forms', 'Billing'],
  },
  {
    version: 'v2.1.0',
    title: 'Two-Way Google Calendar Synchronization & Resource Booking',
    date: 'July 2026',
    category: 'Improvement',
    summary: 'Keep practitioner calendars and specialized clinic equipment perfectly synchronized without manual double-entry.',
    highlights: [
      'Two-Way Calendar Sync: appointments booked in Qmova instantly appear in Google Calendar and external blocks update Qmova availability.',
      'Equipment & Room Allocations: assign examination rooms, ultrasound machines, or stylist chairs alongside staff members.',
      'Smart Buffer Times: automatically inject preparation and sanitization intervals between consecutive bookings.',
      'Client Self-Reschedule: secure one-click link for visitors to reschedule within authorized policy limits.',
    ],
    tags: ['Google Calendar', 'Scheduling', 'Resources'],
  },
  {
    version: 'v2.0.0',
    title: 'Enterprise Multi-Location Isolation & Custom Subdomains',
    date: 'June 2026',
    category: 'Major',
    summary: 'Complete multi-tenant platform architecture supporting global hospital chains, retail networks, and franchise operations.',
    highlights: [
      'Strict Tenant Data Isolation: enterprise database partitioning with dedicated audit logging and compliance boundaries.',
      'Custom Subdomains & Custom SSL: launch company.qmova.app with your organization branding and localized color palette.',
      'Kiosk & Mobile QR Station: touch-screen self-checkin interface with branded ticket printing and QR digital passes.',
      'Global Location Analytics: cross-branch executive dashboards comparing wait times, throughput, and staff utilization.',
    ],
    tags: ['Enterprise', 'Multi-tenant', 'Analytics', 'Kiosk'],
  },
];

export default function ChangelogPage() {
  const [selectedTag, setSelectedTag] = useState<string>('All');

  const allTags = ['All', 'Staff Desk', 'Queue Engine', 'WhatsApp', 'Workflows', 'Stripe', 'Google Calendar', 'Enterprise'];

  const filteredReleases = selectedTag === 'All'
    ? releases
    : releases.filter((r) => r.tags.includes(selectedTag));

  return (
    <MarketingLayout
      title="Changelog & Product Updates | Qmova"
      description="Stay up to date with new features, enterprise enhancements, and improvements to the Qmova customer flow management platform."
    >
      <div className="pt-28 pb-24 px-6 relative overflow-hidden">
        {/* Glow backdrop effects */}
        <div className="absolute top-20 right-1/4 w-[500px] h-[350px] bg-indigo-600/10 blur-[140px] pointer-events-none rounded-full" />
        <div className="absolute bottom-20 left-10 w-[450px] h-[300px] bg-purple-600/10 blur-[120px] pointer-events-none rounded-full" />

        <div className="max-w-5xl mx-auto relative z-10">
          {/* Header */}
          <div className="mb-12">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              Continuous Delivery
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
              Qmova Product Changelog
            </h1>
            <p className="text-lg text-zinc-400 max-w-2xl leading-relaxed">
              We ship rapid updates every week. Explore the latest architectural additions, customer journey features, and workflow optimizations.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap gap-2 mb-12 pb-6 border-b border-white/10">
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                  selectedTag === tag
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-white/5'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Timeline */}
          <div className="space-y-12 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-zinc-800/80">
            {filteredReleases.map((release) => (
              <div key={release.version} className="relative pl-10 group">
                {/* Timeline node */}
                <div className="absolute left-0 top-1 w-7 h-7 rounded-full bg-zinc-900 border-2 border-indigo-500 flex items-center justify-center text-indigo-400 shadow-md">
                  <GitCommit className="w-3.5 h-3.5" />
                </div>

                <div className="p-8 rounded-2xl bg-zinc-900/70 border border-white/10 backdrop-blur-sm hover:border-white/20 transition-all">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        {release.version}
                      </span>
                      <span className="text-xs text-zinc-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {release.date}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {release.tags.map((t) => (
                        <span key={t} className="px-2 py-0.5 rounded text-[11px] bg-zinc-800 text-zinc-400">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-2">{release.title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed mb-6">{release.summary}</p>

                  <div className="space-y-2.5 pt-4 border-t border-white/5">
                    <h4 className="text-xs uppercase tracking-wider font-semibold text-zinc-300">Key Highlights</h4>
                    <ul className="space-y-2 text-xs text-zinc-400">
                      {release.highlights.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom CTA */}
          <div className="mt-16 p-8 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-zinc-900/60 border border-indigo-500/20 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-lg font-bold text-white mb-1">Have a feature request or need a custom integration?</h3>
              <p className="text-xs text-zinc-400">Our engineering roadmap is driven by frontline operational feedback.</p>
            </div>
            <Link
              href="/contact"
              className="px-6 py-2.5 rounded-full bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition-colors shrink-0 flex items-center gap-2"
            >
              Contact Engineering
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}
