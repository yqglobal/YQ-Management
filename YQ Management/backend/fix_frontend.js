const fs = require('fs');
const file = '/home/abhimanyu/Projects/YQ/YQ Management/frontend/src/pages/_tenant/[subdomain]/booking/index.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Add session restoration effect
const restoreSessionEffect = `
  // Session Restore
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem('bookingState');
        if (saved) {
          const s = JSON.parse(saved);
          if (s.step) setStep(s.step);
          if (s.selectedLocationId) setSelectedLocationId(s.selectedLocationId);
          if (s.name) setName(s.name);
          if (s.phone) setPhone(s.phone);
          if (s.selectedServiceIds) setSelectedServiceIds(s.selectedServiceIds);
          if (s.currentServiceIndex) setCurrentServiceIndex(s.currentServiceIndex);
          if (s.serviceDetails) setServiceDetails(s.serviceDetails);
        }
      } catch (e) {}
    }
  }, []);

  // Session Save
  useEffect(() => {
    if (typeof window !== 'undefined' && step < 5) {
      sessionStorage.setItem('bookingState', JSON.stringify({
        step, selectedLocationId, name, phone, selectedServiceIds, currentServiceIndex, serviceDetails
      }));
    }
  }, [step, selectedLocationId, name, phone, selectedServiceIds, currentServiceIndex, serviceDetails]);

`;
code = code.replace(/  \/\/ Local storage persistence removed in favor of secure shareable URLs/g, restoreSessionEffect);


// 2. Remove setLoading(false) from submitJoin finally block, clear sessionStorage on success
code = code.replace(/    } catch \(err: any\) \{\n      setErrorMsg\(err.message \|\| 'Failed to complete booking.'\);\n    \} finally \{\n      setLoading\(false\);\n    \}/g, `    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to complete booking.');
      setLoading(false);
    }
    // Loading stays true on success to wait for router.push
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('bookingState');
    }`);

// 3. Fix Step 5 rendering
const oldStep5 = `{/* STEP 5: OTP */}
          {step === 5 && (
            <motion.div key="step4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col items-center justify-center text-center space-y-6 pt-8">
              {loading && !otpSent ? (
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 border-4 border-gray-200 border-t-current rounded-full animate-spin mb-4" style={{ color: primaryColor }} />
                  <p className="text-gray-500 font-medium">Processing...</p>
                </div>
              ) : otpSent ? (
                <div className="w-full space-y-6">
                  <h2 className="text-2xl font-bold">Verify your number</h2>
                  <p className="text-gray-500">Enter the code sent to <br/><strong className="text-gray-900 dark:text-white">{phone}</strong></p>
                  
                  <input
                    type="text" inputMode="numeric" maxLength={6} value={otp}
                    onChange={e => {
                      const val = e.target.value.replace(/\\D/g, '');
                      setOtp(val);
                      if (val.length === 6) submitJoin(val);
                    }}
                    placeholder="000000"
                    className="w-full bg-white dark:bg-zinc-900 border-2 border-gray-200 rounded-xl p-4 text-3xl tracking-[0.5em] text-center font-mono outline-none"
                    autoFocus
                  />
                  {errorMsg && <p className="text-red-500 text-sm font-medium">{errorMsg}</p>}
                </div>
              ) : null}
            </motion.div>
          )}`;

const newStep5 = `{/* STEP 5: OTP / Processing */}
          {step === 5 && (
            <motion.div key="step5" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col items-center justify-center text-center space-y-6 pt-8">
              {loading && !otpSent ? (
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 border-4 border-gray-200 border-t-current rounded-full animate-spin mb-4" style={{ color: primaryColor }} />
                  <p className="text-gray-500 font-medium">Processing...</p>
                </div>
              ) : (
                <div className="w-full space-y-6">
                  {otpSent ? (
                    <>
                      <h2 className="text-2xl font-bold">Verify your number</h2>
                      <p className="text-gray-500">Enter the code sent to <br/><strong className="text-gray-900 dark:text-white">{phone}</strong></p>
                      <input
                        type="text" inputMode="numeric" maxLength={6} value={otp}
                        onChange={e => {
                          const val = e.target.value.replace(/\\D/g, '');
                          setOtp(val);
                          if (val.length === 6) submitJoin(val);
                        }}
                        placeholder="000000"
                        className="w-full bg-white dark:bg-zinc-900 border-2 border-gray-200 rounded-xl p-4 text-3xl tracking-[0.5em] text-center font-mono outline-none"
                        autoFocus
                      />
                    </>
                  ) : (
                    <div className="py-4">
                      <h2 className="text-2xl font-bold mb-2">Almost there</h2>
                      <p className="text-gray-500">We're finalizing your booking.</p>
                    </div>
                  )}
                  {errorMsg && (
                    <div className="bg-red-50 dark:bg-red-950/30 p-4 rounded-xl border border-red-100 dark:border-red-900/50">
                      <p className="text-red-600 dark:text-red-400 font-medium">{errorMsg}</p>
                    </div>
                  )}
                  {(!loading || errorMsg) && (
                    <button 
                      type="button" 
                      onClick={() => { setStep(4); setErrorMsg(''); setLoading(false); setOtpSent(false); }} 
                      className="mt-6 px-6 py-3 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors inline-block"
                    >
                      Go Back
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          )}`;

code = code.replace(oldStep5, newStep5);

fs.writeFileSync(file, code);
console.log('Frontend booking flow updated.');
