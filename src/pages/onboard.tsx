import { useState } from 'react';
import { useRouter } from 'next/router';
import { ArrowRightIcon, DocumentTextIcon, ClockIcon, CheckIcon } from '@heroicons/react/24/outline';
import CSVUploader from '@/components/onboard/CSVUploader';
import ProcedureSelector from '@/components/onboard/ProcedureSelector';
import ScheduleSetup from '@/components/onboard/ScheduleSetup';
import PreviewSetup from '@/components/onboard/PreviewSetup';

type OnboardingStep = 'upload' | 'procedure' | 'schedule' | 'preview' | 'complete';

interface OnboardingState {
  patients: any[];
  procedureType: string;
  checkInTime: string;
  timezone: string;
  duration: number; // days
}

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('upload');
  const [state, setState] = useState<OnboardingState>({
    patients: [],
    procedureType: '',
    checkInTime: '09:00',
    timezone: 'America/New_York',
    duration: 14
  });

  const steps = [
    { id: 'upload', name: 'Upload Roster', icon: DocumentTextIcon },
    { id: 'procedure', name: 'Select Procedure', icon: ClockIcon },
    { id: 'schedule', name: 'Set Schedule', icon: ClockIcon },
    { id: 'preview', name: 'Preview & Launch', icon: CheckIcon },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex].id as OnboardingStep);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].id as OnboardingStep);
    }
  };

  const handleLaunch = async () => {
    try {
      // Call API to create patients and start monitoring
      const response = await fetch('/api/patients/bulk-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state)
      });

      if (response.ok) {
        setCurrentStep('complete');
        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          router.push('/');
        }, 2000);
      } else {
        throw new Error('Failed to create patients');
      }
    } catch (error) {
      console.error('Launch failed:', error);
      alert('Failed to launch monitoring program. Please try again.');
    }
  };

  if (currentStep === 'complete') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <CheckIcon className="h-6 w-6 text-green-600" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Monitoring Program Launched!
          </h1>
          <p className="text-gray-600 mb-4">
            {state.patients.length} patients have been enrolled and will start receiving daily check-ins.
          </p>
          <p className="text-sm text-gray-500">
            Redirecting to dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Setup Post-Op Monitoring</h1>
              <p className="text-sm text-gray-500">One-hour onboarding process</p>
            </div>
            <button
              onClick={() => router.push('/')}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress steps */}
        <nav className="mb-8" aria-label="Progress">
          <ol className="flex items-center">
            {steps.map((step, stepIdx) => {
              const isCurrent = step.id === currentStep;
              const isCompleted = stepIdx < currentStepIndex;
              const Icon = step.icon;

              return (
                <li key={step.id} className={`relative ${stepIdx !== steps.length - 1 ? 'pr-8 sm:pr-20' : ''}`}>
                  <div className="flex items-center">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                      isCompleted ? 'bg-blue-600' :
                      isCurrent ? 'bg-blue-100 border-2 border-blue-600' :
                      'bg-gray-100 border-2 border-gray-300'
                    }`}>
                      <Icon className={`w-4 h-4 ${
                        isCompleted ? 'text-white' :
                        isCurrent ? 'text-blue-600' :
                        'text-gray-400'
                      }`} />
                    </div>
                    <span className={`ml-2 text-sm font-medium ${
                      isCurrent ? 'text-blue-600' : 'text-gray-500'
                    }`}>
                      {step.name}
                    </span>
                  </div>
                  {stepIdx !== steps.length - 1 && (
                    <div className={`absolute top-4 left-4 w-full h-0.5 ${
                      isCompleted ? 'bg-blue-600' : 'bg-gray-300'
                    }`} style={{ left: '2rem', width: 'calc(100% - 2rem)' }} />
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        {/* Step content */}
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          {currentStep === 'upload' && (
            <CSVUploader
              onUpload={(patients) => {
                setState(prev => ({ ...prev, patients }));
                handleNext();
              }}
            />
          )}

          {currentStep === 'procedure' && (
            <ProcedureSelector
              selectedProcedure={state.procedureType}
              onSelect={(procedureType) => {
                setState(prev => ({ ...prev, procedureType }));
              }}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}

          {currentStep === 'schedule' && (
            <ScheduleSetup
              checkInTime={state.checkInTime}
              timezone={state.timezone}
              duration={state.duration}
              onChange={(updates) => {
                setState(prev => ({ ...prev, ...updates }));
              }}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}

          {currentStep === 'preview' && (
            <PreviewSetup
              state={state}
              onLaunch={handleLaunch}
              onBack={handleBack}
            />
          )}
        </div>
      </div>
    </div>
  );
}