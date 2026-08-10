import React, { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Calendar, Clock, User, ChevronRight, CheckCircle2, ArrowLeft } from 'lucide-react';
// import { fetchApi } from '../../../lib/api'; // Commenting out actual API calls for mockup logic

export default function PublicBookingPage() {
  const router = useRouter();
  const { tenantId } = router.query;
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '' });

  // Mock Data
  const services = [
    { id: '1', name: 'General Consultation', duration: 30, price: 'Free' },
    { id: '2', name: 'Follow-up Check', duration: 15, price: 'Free' },
    { id: '3', name: 'Specialist Session', duration: 60, price: '$50' },
  ];

  const dates = ['Today, Aug 10', 'Tomorrow, Aug 11', 'Wed, Aug 12'];
  const times = ['09:00 AM', '09:30 AM', '10:00 AM', '11:00 AM', '01:30 PM', '03:00 PM'];

  const handleNext = () => setStep(step + 1);
  const handleBack = () => setStep(step - 1);

  const handleConfirm = async () => {
    // try {
    //   await fetchApi(`/appointments`, {
    //     method: 'POST',
    //     body: JSON.stringify({
    //       tenantId,
    //       serviceId: selectedService.id,
    //       customerName: formData.name,
    //       phone: formData.phone,
    //       scheduledStart: new Date(), // Logic needed to parse Date/Time
    //     }),
    //   });
    //   setStep(4);
    // } catch (e) {}
    setStep(4);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] flex items-center justify-center p-4 selection:bg-indigo-500/30">
      <Head>
        <title>Book Appointment</title>
      </Head>

      <div className="w-full max-w-md bg-white dark:bg-zinc-900/80 backdrop-blur-xl rounded-[2rem] shadow-2xl overflow-hidden border border-gray-100 dark:border-white/10 relative">
        {/* Header Header */}
        <div className="bg-indigo-600 p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 rounded-full bg-white opacity-10 blur-2xl"></div>
          {step > 1 && step < 4 && (
            <button onClick={handleBack} className="absolute top-6 left-6 text-indigo-100 hover:text-white transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </button>
          )}
          <div className="text-center mt-2">
            <h1 className="text-2xl font-bold tracking-tight">Book an Appointment</h1>
            <p className="text-indigo-200 text-sm mt-1">YQ Medical Center</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex px-8 pt-6 pb-2 gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`h-1.5 rounded-full flex-1 transition-all duration-500 ${step >= i ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-zinc-800'}`}></div>
          ))}
        </div>

        {/* Content Area */}
        <div className="p-8 pt-4 min-h-[400px]">
          {/* STEP 1: Select Service */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="mb-6">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">What do you need?</h2>
                <p className="text-sm text-gray-500 dark:text-zinc-400">Select a service to continue.</p>
              </div>
              {services.map((service) => (
                <button
                  key={service.id}
                  onClick={() => { setSelectedService(service); handleNext(); }}
                  className="w-full text-left p-4 rounded-2xl border border-gray-200 dark:border-white/10 hover:border-indigo-500 dark:hover:border-indigo-500 bg-white dark:bg-zinc-900/50 flex items-center justify-between group transition-all hover:shadow-md hover:-translate-y-0.5"
                >
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{service.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">{service.duration} mins • {service.price}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-500 transition-colors" />
                </button>
              ))}
            </div>
          )}

          {/* STEP 2: Date & Time */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">When works for you?</h2>
                <p className="text-sm text-gray-500 dark:text-zinc-400">Select a date and time.</p>
              </div>
              
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {dates.map((date) => (
                  <button
                    key={date}
                    onClick={() => setSelectedDate(date)}
                    className={`whitespace-nowrap px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      selectedDate === date 
                      ? 'bg-indigo-600 text-white shadow-md' 
                      : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {date}
                  </button>
                ))}
              </div>

              {selectedDate && (
                <div className="grid grid-cols-3 gap-3 animate-in fade-in slide-in-from-bottom-2">
                  {times.map((time) => (
                    <button
                      key={time}
                      onClick={() => setSelectedTime(time)}
                      className={`py-3 rounded-xl text-sm font-medium transition-all border ${
                        selectedTime === time 
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-500/20 dark:border-indigo-500/30 dark:text-indigo-300' 
                        : 'border-gray-200 dark:border-white/10 text-gray-700 dark:text-zinc-300 hover:border-indigo-300'
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              )}

              <button
                disabled={!selectedDate || !selectedTime}
                onClick={handleNext}
                className="w-full mt-6 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-300 dark:disabled:bg-zinc-800 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)]"
              >
                Continue
              </button>
            </div>
          )}

          {/* STEP 3: Details */}
          {step === 3 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Almost there!</h2>
                <p className="text-sm text-gray-500 dark:text-zinc-400">Enter your details to confirm.</p>
              </div>

              <div className="bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-gray-100 dark:border-white/5 mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-500 dark:text-zinc-400">Service</span>
                  <span className="font-medium text-gray-900 dark:text-white">{selectedService?.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 dark:text-zinc-400">Time</span>
                  <span className="font-medium text-indigo-600 dark:text-indigo-400">{selectedDate} at {selectedTime}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-white/10 rounded-xl outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all dark:text-white"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-white/10 rounded-xl outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all dark:text-white"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
              </div>

              <button
                disabled={!formData.name || !formData.phone}
                onClick={handleConfirm}
                className="w-full mt-6 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-300 dark:disabled:bg-zinc-800 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)]"
              >
                Confirm Booking
              </button>
            </div>
          )}

          {/* STEP 4: Success */}
          {step === 4 && (
            <div className="text-center py-8 animate-in zoom-in-95 duration-500">
              <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Booking Confirmed!</h2>
              <p className="text-gray-500 dark:text-zinc-400 mb-8">
                Your appointment is set for <br />
                <span className="font-semibold text-gray-900 dark:text-white">{selectedDate} at {selectedTime}</span>. <br/>
                We've sent a confirmation to your phone.
              </p>
              
              <button
                onClick={() => setStep(1)}
                className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
              >
                Book another appointment
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
