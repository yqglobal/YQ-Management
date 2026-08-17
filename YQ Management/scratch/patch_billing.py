import re

with open('frontend/src/pages/dashboard/settings/_components/billing.tsx', 'r') as f:
    content = f.read()

# 1. Add checkoutPlan state
content = content.replace(
    "const [showEnterpriseModal, setShowEnterpriseModal] = useState(false);",
    "const [showEnterpriseModal, setShowEnterpriseModal] = useState(false);\n  const [checkoutPlan, setCheckoutPlan] = useState<any>(null);"
)

# 2. Refactor handleUpgrade
content = content.replace(
    "const handleUpgrade = (planId: string) => {\n    subscribeMutation.mutate({ planId, billingInterval });\n  };",
    "const handleUpgradeClick = (plan: any) => {\n    setCheckoutPlan(plan);\n  };\n\n  const confirmCheckout = () => {\n    if (checkoutPlan) subscribeMutation.mutate({ planId: checkoutPlan.id, billingInterval });\n  };"
)

# 3. Update active plan check
content = content.replace(
    "const isActive = currentSub?.status === 'ACTIVE';",
    "const isPaid = currentSub?.status === 'ACTIVE' && currentSub?.plan?.price > 0;\n  const isTrial = currentSub?.status === 'ACTIVE' && currentSub?.plan?.price === 0;"
)

# 4. Replace 'isActive ?' with 'isPaid ?'
content = content.replace(
    ") : isActive ? (",
    ") : isPaid ? ("
)

# 5. Fix onClick in Pricing Grid to use handleUpgradeClick
content = re.sub(
    r"onClick=\{\(\) => handleUpgrade\(plan\.id\)\}",
    "onClick={() => handleUpgradeClick(plan)}",
    content
)

# 6. For Paid Users, add the Upgrade Ad card replacing the "Payment Method" card
# Instead of complex replace, I'll find the "Payment Method" section and inject the upgrade ad.
ad_html = """
            <div className="bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-xl p-6 flex flex-col relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-colors"></div>
              <h4 className="font-headline-sm text-headline-sm text-on-surface dark:text-white mb-2">{currentSub?.plan?.name.toLowerCase().includes('standard') ? 'Upgrade to Premium' : 'Enterprise Setup'}</h4>
              <p className="text-on-surface-variant dark:text-outline font-body-sm text-body-sm mb-6 leading-relaxed relative z-10">
                {currentSub?.plan?.name.toLowerCase().includes('standard') 
                  ? 'Unlock advanced features like WhatsApp Chat, full white-labeling, and dedicated support to scale your business.' 
                  : 'Get a custom infrastructure, unlimited locations, and dedicated account management for large-scale operations.'}
              </p>
              <div className="mt-auto pt-4 relative z-10">
                <button onClick={() => currentSub?.plan?.name.toLowerCase().includes('standard') ? handleUpgradeClick(plans.find((p: any) => p.name.includes('Premium'))) : setShowEnterpriseModal(true)} className="w-full bg-primary hover:bg-primary-container text-white font-body-md text-body-md font-semibold h-[44px] rounded-lg transition-colors shadow-sm">
                  {currentSub?.plan?.name.toLowerCase().includes('standard') ? 'View Premium Plan' : 'Contact Sales'}
                </button>
              </div>
            </div>
            
            <div className="bg-surface-container-lowest dark:bg-black/20 border border-border dark:border-dark-border rounded-xl p-6 flex flex-col mt-6">
              <h4 className="font-headline-sm text-headline-sm text-on-surface dark:text-white mb-2">Payment Method</h4>
              <p className="text-on-surface-variant dark:text-outline font-body-sm text-body-sm mb-4 leading-relaxed">
                Processed via Ozow Instant EFT.
              </p>
              <button className="text-primary font-body-md font-semibold hover:underline flex items-center gap-2">
                Billing History <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
"""
content = re.sub(
    r'<div className="bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-xl p-6 flex flex-col">.*?</div>\s*</div>\s*</div>',
    ad_html + '\n          </div>\n        </div>',
    content,
    flags=re.DOTALL
)

# 7. Add Checkout Modal before the Enterprise Modal
checkout_modal_html = """
      {/* Checkout Modal */}
      {checkoutPlan && (
        <div className="fixed inset-0 bg-zinc-950/40 dark:bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-[24px] shadow-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-8 pb-6 border-b border-border dark:border-dark-border relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
              <button onClick={() => setCheckoutPlan(null)} className="absolute top-6 right-6 text-on-surface-variant hover:text-on-surface transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
              <h2 className="font-headline-md text-headline-md text-on-surface dark:text-white tracking-tight font-semibold mb-2">Complete Purchase</h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant dark:text-outline">You are upgrading to the <span className="font-bold text-on-surface dark:text-white">{checkoutPlan.name}</span>.</p>
            </div>
            
            <div className="p-8 bg-surface-container-lowest dark:bg-black/20">
              <div className="flex justify-between items-center mb-6">
                <span className="font-body-md text-on-surface-variant dark:text-outline">Billed {billingInterval}</span>
                <div className="text-right">
                  <span className="font-data-mono-lg text-3xl text-on-surface dark:text-white font-bold">{checkoutPlan.currency === 'ZAR' ? 'R' : '$'}{billingInterval === 'yearly' && checkoutPlan.billingInterval === 'monthly' ? Math.floor(checkoutPlan.price * 12 * 0.9) : checkoutPlan.price}</span>
                  <span className="font-body-sm text-on-surface-variant ml-1">/{billingInterval === 'yearly' ? 'yr' : 'mo'}</span>
                </div>
              </div>
              
              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3 text-on-surface dark:text-white font-body-sm font-medium">
                  <CheckCircle2 className="w-4 h-4 text-primary" /> {checkoutPlan.limits?.maxQueues || 1} Queues & {checkoutPlan.limits?.maxTokens || 500} Tokens/day
                </div>
                {checkoutPlan.features?.whatsappNotifications && (
                  <div className="flex items-center gap-3 text-on-surface dark:text-white font-body-sm font-medium">
                    <CheckCircle2 className="w-4 h-4 text-primary" /> WhatsApp Integration
                  </div>
                )}
                {checkoutPlan.features?.customBranding && (
                  <div className="flex items-center gap-3 text-on-surface dark:text-white font-body-sm font-medium">
                    <CheckCircle2 className="w-4 h-4 text-primary" /> Custom White-labeling
                  </div>
                )}
              </div>
              
              <button 
                onClick={confirmCheckout}
                disabled={subscribeMutation.isPending}
                className="w-full h-[48px] bg-primary hover:bg-primary-container text-white rounded-xl font-body-lg font-semibold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {subscribeMutation.isPending ? <Loader2 strokeWidth={1.5} className="w-5 h-5 animate-spin" /> : <span className="material-symbols-outlined text-[20px]">lock</span>}
                Confirm & Pay with Ozow
              </button>
              <p className="text-center font-body-sm text-[11px] text-on-surface-variant dark:text-outline mt-4 font-medium flex items-center justify-center gap-1">
                <span className="material-symbols-outlined text-[14px]">shield</span> Secure Instant EFT by Ozow
              </p>
            </div>
          </div>
        </div>
      )}
"""
content = content.replace(
    "{/* Enterprise Contact Modal */}",
    checkout_modal_html + "\n      {/* Enterprise Contact Modal */}"
)

# 8. Hide the Ozow secure payments card if active paid plan
content = content.replace(
    '<div className="mt-12 text-center p-8 bg-surface-container-lowest border border-border dark:border-dark-border rounded-2xl">',
    '{!isPaid && <div className="mt-12 text-center p-8 bg-surface-container-lowest border border-border dark:border-dark-border rounded-2xl">'
)
content = content.replace(
    '</p>\n          </div>\n        </div>\n      )}',
    '</p>\n          </div>}\n        </div>\n      )}'
)

# 9. Ensure the Trial message says "Trial is active" only when trial is active
content = content.replace(
    "Your trial {currentSub?.status === 'EXPIRED' ? 'has expired' : 'is active'}",
    "{isTrial ? 'Your trial is active' : currentSub?.status === 'EXPIRED' ? 'Your trial has expired' : 'Choose a Plan'}"
)

with open('frontend/src/pages/dashboard/settings/_components/billing.tsx', 'w') as f:
    f.write(content)

