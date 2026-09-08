import re

with open('frontend/src/pages/onboarding/index.tsx', 'r') as f:
    content = f.read()

# 1. Add Data Prefilling
prefill_code = """
  // --- Premium UI: Data Prefilling ---
  useEffect(() => {
    if (user && !localStorage.getItem('onboarding_form_data')) {
      if (user.name && !fullName) setFullName(user.name);
      if (user.tenant?.name && !companyName) {
        setCompanyName(user.tenant.name);
      } else if (user.email && !companyName) {
        const domain = user.email.split('@')[1];
        if (domain && !['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com'].includes(domain.toLowerCase())) {
          const companyStr = domain.split('.')[0];
          setCompanyName(companyStr.charAt(0).toUpperCase() + companyStr.slice(1));
        }
      }
      if (user.phone && !phone) {
        setPhone(user.phone);
      }
    }
  }, [user]);
  // ------------------------------------
"""
content = content.replace("    if (typeof window !== 'undefined') {\n      const code",
prefill_code + "\n    if (typeof window !== 'undefined') {\n      const code")

# 2. Add Background Glows
glows = """
      {/* Premium UI Background Glows */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px] dark:bg-sky-500/20 mix-blend-screen animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute top-[30%] -right-[10%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 blur-[100px] mix-blend-screen animate-pulse" style={{ animationDuration: '10s' }} />
        <div className="absolute -bottom-[20%] left-[20%] w-[60%] h-[60%] rounded-full bg-sky-400/10 blur-[120px] dark:bg-sky-400/10 mix-blend-screen animate-pulse" style={{ animationDuration: '12s' }} />
      </div>
"""
content = content.replace(
    "{showConfetti && <Confetti width={typeof window !== 'undefined' ? window.innerWidth : 1000} height={typeof window !== 'undefined' ? window.innerHeight : 1000} recycle={false} numberOfPieces={500} gravity={0.15} />}",
    glows + "\n      {showConfetti && <Confetti width={typeof window !== 'undefined' ? window.innerWidth : 1000} height={typeof window !== 'undefined' ? window.innerHeight : 1000} recycle={false} numberOfPieces={500} gravity={0.15} zIndex={100} />}"
)

# 3. Upgrade Main Card to Glassmorphism
content = content.replace(
    'className="w-full max-w-2xl bg-card dark:bg-dark-card rounded-[2.5rem] border border-border dark:border-dark-border shadow-sm p-8 md:p-12 relative overflow-hidden my-12"',
    'className="w-full max-w-2xl bg-white/70 dark:bg-[#121212]/80 backdrop-blur-3xl rounded-[2.5rem] border border-white/40 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-8 md:p-12 relative z-10 overflow-hidden my-12"'
)

# 4. Enhance input fields with premium focus transitions
content = content.replace('className="w-full h-[56px] px-4 rounded-xl border border-border dark:border-dark-border bg-canvas dark:bg-black/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow font-body-lg text-on-surface dark:text-white placeholder:text-outline-variant"',
'className="w-full h-[56px] px-4 rounded-xl border border-white/40 dark:border-white/10 bg-white/50 dark:bg-black/40 backdrop-blur-md focus:bg-white dark:focus:bg-black focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all duration-300 font-body-lg text-on-surface dark:text-white placeholder:text-outline-variant shadow-inner"')

content = content.replace('className="flex h-[56px] rounded-xl border border-border dark:border-dark-border bg-canvas dark:bg-black/50 overflow-hidden focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-shadow"',
'className="flex h-[56px] rounded-xl border border-white/40 dark:border-white/10 bg-white/50 dark:bg-black/40 backdrop-blur-md overflow-hidden focus-within:bg-white dark:focus-within:bg-black focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all duration-300 shadow-inner"')

content = content.replace('className="w-full h-[56px] px-4 rounded-xl border border-border dark:border-dark-border bg-canvas dark:bg-black/50 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow font-body-lg text-on-surface dark:text-white"',
'className="w-full h-[56px] px-4 rounded-xl border border-white/40 dark:border-white/10 bg-white/50 dark:bg-black/40 backdrop-blur-md focus:bg-white dark:focus:bg-black focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all duration-300 font-body-lg text-on-surface dark:text-white shadow-inner"')

# Replace buttons to motion.button safely:
content = content.replace('<button', '<motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}')
content = content.replace('</button>', '</motion.button>')

# Replace label loop for template with motion.label safely
content = content.replace(
    '<label \n                      key={template.id}',
    '<motion.label whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}\n                      key={template.id}'
)
content = re.sub(
    r'(<motion\.label[\s\S]*?)<\/label>',
    r'\1</motion.label>',
    content
)

# And another label:
content = content.replace(
    '<label className="flex items-center gap-4 p-4 rounded-xl',
    '<motion.label whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} className="flex items-center gap-4 p-4 rounded-xl'
)
# Close motion.label for waitlist specifically
content = re.sub(
    r'(<motion\.label whileHover=\{\{ scale: 1\.01 \}\} whileTap=\{\{ scale: 0\.99 \}\} className="flex items-center gap-4 p-4 rounded-xl[\s\S]*?)(<\/label>)',
    r'\1</motion.label>',
    content
)

# Also need to make sure the label in loop (Which services do you offer)
content = content.replace(
    '<label key={s.name} className="flex items-center gap-3 p-3',
    '<motion.label whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} key={s.name} className="flex items-center gap-3 p-3'
)

# the closing tags for these loop labels:
# They are closed right after `</span>`.
content = content.replace(
    '</span>\n                      </label>',
    '</span>\n                      </motion.label>'
)
# The waitlist closing label
content = content.replace(
    '</p>\n                  </div>\n                </label>',
    '</p>\n                  </div>\n                </motion.label>'
)

# The template labels end:
content = content.replace(
    '</div>\n                    </label>',
    '</div>\n                    </motion.label>'
)

# And another label for trial agreed:
content = content.replace(
    '<label className="flex items-start gap-3 mt-4 mb-3 cursor-pointer">',
    '<motion.label whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} className="flex items-start gap-3 mt-4 mb-3 cursor-pointer">'
)
content = content.replace(
    '</span>\n                          </label>',
    '</span>\n                          </motion.label>'
)

with open('frontend/src/pages/onboarding/index.tsx', 'w') as f:
    f.write(content)

print("Patched successfully")
