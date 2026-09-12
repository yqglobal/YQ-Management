import React from 'react';
import MarketingLayout from '../../components/MarketingLayout';
import { Mail, Search, BookOpen, Settings, CreditCard, HelpCircle, MessageSquare } from 'lucide-react';
import Link from 'next/link';

export default function SupportHelpCenterPage() {
  const categories = [
    {
      title: "Getting Started",
      description: "Learn how to set up your workspace and queues.",
      icon: <BookOpen className="w-6 h-6 text-sky-400" />,
      link: "#",
    },
    {
      title: "Account & Settings",
      description: "Manage your profile, team members, and permissions.",
      icon: <Settings className="w-6 h-6 text-emerald-400" />,
      link: "#",
    },
    {
      title: "Billing & Plans",
      description: "Understand our pricing, invoices, and subscription plans.",
      icon: <CreditCard className="w-6 h-6 text-purple-400" />,
      link: "#",
    },
    {
      title: "Troubleshooting",
      description: "Find solutions to common issues and errors.",
      icon: <HelpCircle className="w-6 h-6 text-amber-400" />,
      link: "#",
    }
  ];

  const faqs = [
    {
      question: "How do I reset my password?",
      answer: "You can reset your password by clicking on the 'Forgot Password' link on the login page. An email will be sent with instructions."
    },
    {
      question: "Can I upgrade my plan later?",
      answer: "Yes, you can upgrade or downgrade your plan at any time from your billing dashboard. Changes will be prorated automatically."
    },
    {
      question: "How do I connect WhatsApp?",
      answer: "Navigate to the Settings tab in your dashboard, select WhatsApp Integration, and scan the QR code using your WhatsApp mobile app."
    },
    {
      question: "Is there a limit to how many queues I can create?",
      answer: "Queue limits depend on your current subscription plan. Our Standard Plan allows up to 10 queues, while Premium supports up to 50."
    }
  ];

  return (
    <MarketingLayout 
      title="Support & Help Center | Qmova" 
      description="Get help with Qmova. Browse our knowledge base, read FAQs, or contact our support team."
    >
      <div className="pt-32 pb-20 px-6 min-h-screen relative overflow-hidden">
        
        {/* Background Glow */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute -top-[20%] left-[20%] w-[50%] h-[50%] rounded-full bg-sky-500/10 blur-[120px] mix-blend-screen" />
        </div>

        <div className="max-w-6xl mx-auto relative z-10">
          {/* Hero Section */}
          <div className="text-center mb-20">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-white tracking-tight">How can we help you?</h1>
            <p className="text-xl text-zinc-400 mb-10 max-w-2xl mx-auto">
              Search our knowledge base or browse categories below to find the answers you need.
            </p>
            
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto relative">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Search className="w-5 h-5 text-zinc-400" />
              </div>
              <input 
                type="text" 
                placeholder="Search for articles, guides, and FAQs..." 
                className="w-full bg-zinc-900/50 border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-all backdrop-blur-sm"
              />
            </div>
          </div>

          {/* Categories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
            {categories.map((cat, idx) => (
              <div key={idx} className="bg-zinc-900/40 border border-white/5 hover:border-white/10 hover:bg-zinc-800/40 transition-all rounded-2xl p-6 group cursor-pointer backdrop-blur-sm">
                <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  {cat.icon}
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{cat.title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{cat.description}</p>
              </div>
            ))}
          </div>

          {/* FAQ Section */}
          <div className="mb-20">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">Frequently Asked Questions</h2>
            <div className="max-w-3xl mx-auto grid gap-4">
              {faqs.map((faq, idx) => (
                <div key={idx} className="bg-zinc-900/30 border border-white/5 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-2">{faq.question}</h3>
                  <p className="text-zinc-400">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Contact Support CTA */}
          <div className="max-w-4xl mx-auto bg-gradient-to-br from-sky-900/20 to-indigo-900/20 border border-sky-500/20 rounded-[2.5rem] p-10 md:p-16 text-center backdrop-blur-md relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay pointer-events-none"></div>
            <MessageSquare className="w-12 h-12 text-sky-400 mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Still need help?</h2>
            <p className="text-lg text-zinc-300 mb-8 max-w-lg mx-auto">
              Our support team is always ready to help you with any technical questions or account issues.
            </p>
            <a 
              href="mailto:yqbuddysa@gmail.com" 
              className="inline-flex items-center justify-center gap-3 bg-white text-black hover:bg-zinc-200 font-semibold py-4 px-8 rounded-full transition-colors text-lg"
            >
              <Mail className="w-5 h-5" />
              Email Support
            </a>
            <p className="text-sm text-zinc-500 mt-6">yqbuddysa@gmail.com</p>
          </div>

        </div>
      </div>
    </MarketingLayout>
  );
}
