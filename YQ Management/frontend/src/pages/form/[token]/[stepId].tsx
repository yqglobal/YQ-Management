import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { fetchApi } from '../../../lib/api';
import { ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';

export default function FormStepPage() {
  const router = useRouter();
  const { token, stepId } = router.query;
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [visit, setVisit] = useState<any>(null);
  const [step, setStep] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token || !stepId) return;

    const loadData = async () => {
      try {
        const visitData = await fetchApi(`/public-visit/${token}`);
        if (!visitData) throw new Error('Visit not found');
        setVisit(visitData);

        const currentStep = visitData.steps?.find((s: any) => s.id === stepId);
        if (!currentStep) throw new Error('Step not found');
        if (currentStep.type !== 'FORM') throw new Error('This step is not a form');

        setStep(currentStep);
        
        // Initialize form data if already answered
        if (currentStep.formData) {
          setFormData(currentStep.formData);
          if (currentStep.status === 'DONE') {
            setSuccess(true);
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load form');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [token, stepId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !stepId) return;

    setSubmitting(true);
    setError('');

    try {
      await fetchApi(`/public-visit/${token}/submit-form/${stepId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ formData }),
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to submit form');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        <p className="mt-4 text-gray-500">Loading form...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-red-100 text-center max-w-md w-full">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            !
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Oops!</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-emerald-100 text-center max-w-md w-full">
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Thank You!</h2>
          <p className="text-gray-600 mb-6">Your form has been successfully submitted.</p>
          <button 
            onClick={() => router.push(`/customer/status/${token}`)}
            className="w-full py-3 px-4 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors"
          >
            View Ticket Status
          </button>
        </div>
      </div>
    );
  }

  const schema = step?.templateStep?.formSchema || [];
  const isFormEmpty = !schema || (Array.isArray(schema) && schema.length === 0);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Head>
        <title>{step?.name || 'Form'} | Qmova</title>
      </Head>

      <div className="max-w-xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-8 sm:p-10">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900">{step?.name || 'Please fill out this form'}</h1>
              {step?.templateStep?.customerInstruction && (
                <p className="mt-2 text-gray-600">
                  {step.templateStep.customerInstruction}
                </p>
              )}
            </div>

            {isFormEmpty ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-6">No fields are configured for this form.</p>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-base font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {Array.isArray(schema) && schema.map((field: any, idx: number) => (
                  <div key={idx}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {field.label || field.name}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    
                    {field.type === 'textarea' ? (
                      <textarea
                        required={field.required}
                        value={formData[field.name] || ''}
                        onChange={(e) => handleInputChange(field.name, e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 min-h-[100px]"
                        placeholder={field.placeholder}
                      />
                    ) : field.type === 'select' ? (
                      <select
                        required={field.required}
                        value={formData[field.name] || ''}
                        onChange={(e) => handleInputChange(field.name, e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      >
                        <option value="">Select an option</option>
                        {field.options?.map((opt: string) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : field.type === 'checkbox' ? (
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          required={field.required}
                          checked={formData[field.name] || false}
                          onChange={(e) => handleInputChange(field.name, e.target.checked)}
                          className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-600">{field.description || 'Yes'}</span>
                      </div>
                    ) : (
                      <input
                        type={field.type || 'text'}
                        required={field.required}
                        value={formData[field.name] || ''}
                        onChange={(e) => handleInputChange(field.name, e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        placeholder={field.placeholder}
                      />
                    )}
                  </div>
                ))}

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-base font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {submitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        Submit Form
                        <ArrowRight className="ml-2 w-5 h-5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
