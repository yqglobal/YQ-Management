const fs = require('fs');
const file = 'frontend/src/pages/onboarding/index.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add trialAgreed state
content = content.replace(
  "const [selectedType, setSelectedType] = useState('general');",
  "const [selectedType, setSelectedType] = useState('general');\n  const [trialAgreed, setTrialAgreed] = useState(false);"
);

// 2. Modify the plan buttons logic and add the checkbox
// The previous button:
/*
                        <button
                          onClick={() => {
                            if (plan.price === 0) {
                              finishOnboarding();
                            } else {
                              subscribeMutation.mutate({ planId: plan.id, billingInterval: 'monthly' });
                            }
                          }}
                          disabled={subscribeMutation.isPending && subscribeMutation.variables?.planId === plan.id}
                          className={`w-full py-3 px-4 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 ${isPopular ? 'bg-primary hover:bg-primary-container text-white' : 'bg-surface-container-high dark:bg-white/10 text-on-surface dark:text-white hover:bg-surface-container-highest dark:hover:bg-white/20'} disabled:opacity-50`}
                        >
                          {subscribeMutation.isPending && subscribeMutation.variables?.planId === plan.id ? <Loader2 className="w-5 h-5 animate-spin" /> : (plan.price === 0 ? 'Start Free' : 'Upgrade Now')}
                        </button>
*/

const newButtonLogic = `
                        {plan.price === 0 && (
                          <label className="flex items-start gap-3 mt-4 mb-3 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={trialAgreed}
                              onChange={(e) => setTrialAgreed(e.target.checked)}
                              className="w-5 h-5 mt-0.5 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <span className="text-sm text-on-surface-variant dark:text-outline leading-tight">
                              I confirm and agree to start my 14-day free trial.
                            </span>
                          </label>
                        )}
                        <button
                          onClick={() => {
                            if (plan.price === 0) {
                              if (!trialAgreed) {
                                toast.error("Please confirm you want to start the 14-day free trial, or choose a paid plan.");
                                return;
                              }
                              finishOnboarding();
                            } else {
                              subscribeMutation.mutate({ planId: plan.id, billingInterval: 'monthly' });
                            }
                          }}
                          disabled={subscribeMutation.isPending && subscribeMutation.variables?.planId === plan.id}
                          className={\`w-full py-3 px-4 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 \${isPopular ? 'bg-primary hover:bg-primary-container text-white' : 'bg-surface-container-high dark:bg-white/10 text-on-surface dark:text-white hover:bg-surface-container-highest dark:hover:bg-white/20'} disabled:opacity-50\`}
                        >
                          {subscribeMutation.isPending && subscribeMutation.variables?.planId === plan.id ? <Loader2 className="w-5 h-5 animate-spin" /> : (plan.price === 0 ? 'Start 14-Day Free Trial' : 'Upgrade Now')}
                        </button>
`;

content = content.replace(
  /<button\s+onClick=\{\(\) => \{\s+if \(plan\.price === 0\) \{\s+finishOnboarding\(\);\s+\} else \{\s+subscribeMutation\.mutate\(\{ planId: plan\.id, billingInterval: 'monthly' \}\);\s+\}\s+\}\}[\s\S]*?<\/button>/g,
  newButtonLogic
);


// 3. Remove the "Skip for now" section entirely
const skipSectionRegex = /<div className="w-full pt-6 mt-2 flex justify-center border-t border-border dark:border-dark-border">\s*<button\s*onClick=\{finishOnboarding\}\s*className="text-on-surface-variant dark:text-outline hover:text-on-surface dark:hover:text-white text-sm font-medium transition-colors underline decoration-border dark:decoration-dark-border underline-offset-4"\s*>\s*Skip for now, I'll decide later\s*<\/button>\s*<\/div>/g;

content = content.replace(skipSectionRegex, "");

fs.writeFileSync(file, content);
console.log('Patched onboarding correctly');
