import { ArrowLeftIcon, RocketLaunchIcon, ClockIcon, UserGroupIcon, PhoneIcon } from '@heroicons/react/24/outline';

interface PreviewSetupProps {
  state: {
    patients: any[];
    procedureType: string;
    checkInTime: string;
    timezone: string;
    duration: number;
  };
  onLaunch: () => void;
  onBack: () => void;
}

export default function PreviewSetup({ state, onLaunch, onBack }: PreviewSetupProps) {
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour24 = parseInt(hours);
    const isPM = hour24 >= 12;
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    return `${hour12}:${minutes} ${isPM ? 'PM' : 'AM'}`;
  };

  const estimatedCosts = {
    smsPerPatient: state.duration * 2, // check-in + reply
    totalSMS: state.patients.length * state.duration * 2,
    costPerSMS: 0.0075,
    get totalCost() {
      return this.totalSMS * this.costPerSMS;
    }
  };

  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-2">Ready to Launch</h2>
        <p className="text-sm text-gray-600">
          Review your configuration before starting the monitoring program
        </p>
      </div>

      {/* Configuration Summary */}
      <div className="space-y-6 mb-8">
        {/* Patients */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <UserGroupIcon className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="font-medium text-gray-900">Patient Roster</h3>
          </div>
          <div className="flex justify-between items-center mb-3">
            <span className="text-2xl font-semibold text-gray-900">{state.patients.length}</span>
            <span className="text-sm text-gray-500">
              {state.procedureType} patients
            </span>
          </div>
          {state.patients.length > 0 && (
            <div className="bg-gray-50 rounded p-3">
              <div className="text-xs font-medium text-gray-700 mb-2">Sample patients:</div>
              <div className="space-y-1 text-sm">
                {state.patients.slice(0, 3).map((patient, index) => (
                  <div key={index} className="flex justify-between">
                    <span>{patient.first_name} {patient.last_initial}.</span>
                    <span className="text-gray-500">{patient.phone}</span>
                  </div>
                ))}
                {state.patients.length > 3 && (
                  <div className="text-xs text-gray-500 text-center pt-1">
                    +{state.patients.length - 3} more patients
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Schedule */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <ClockIcon className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="font-medium text-gray-900">Schedule Configuration</h3>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Check-in time:</span>
              <div className="font-medium">{formatTime(state.checkInTime)}</div>
            </div>
            <div>
              <span className="text-gray-500">Timezone:</span>
              <div className="font-medium">{state.timezone.split('/')[1].replace('_', ' ')}</div>
            </div>
            <div>
              <span className="text-gray-500">Duration:</span>
              <div className="font-medium">{state.duration} days</div>
            </div>
            <div>
              <span className="text-gray-500">Total check-ins:</span>
              <div className="font-medium">{state.patients.length * state.duration}</div>
            </div>
          </div>
        </div>

        {/* Cost Estimate */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <PhoneIcon className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="font-medium text-gray-900">SMS Cost Estimate</h3>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">SMS per patient:</span>
              <div className="font-medium">~{estimatedCosts.smsPerPatient} messages</div>
            </div>
            <div>
              <span className="text-gray-500">Total SMS:</span>
              <div className="font-medium">~{estimatedCosts.totalSMS} messages</div>
            </div>
            <div>
              <span className="text-gray-500">Rate:</span>
              <div className="font-medium">${estimatedCosts.costPerSMS} per SMS</div>
            </div>
            <div>
              <span className="text-gray-500">Est. total cost:</span>
              <div className="font-medium text-blue-600">${estimatedCosts.totalCost.toFixed(2)}</div>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            * Estimate includes check-in messages and auto-replies. Actual costs may vary based on response rates.
          </p>
        </div>

        {/* What Happens Next */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-medium text-blue-900 mb-3">What happens when you launch:</h3>
          <div className="space-y-2 text-sm text-blue-800">
            <div className="flex items-start">
              <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-3 mt-0.5">1</span>
              <span>Patients are enrolled in the monitoring program</span>
            </div>
            <div className="flex items-start">
              <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-3 mt-0.5">2</span>
              <span>Daily check-ins start at {formatTime(state.checkInTime)} based on each patient's surgery date</span>
            </div>
            <div className="flex items-start">
              <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-3 mt-0.5">3</span>
              <span>Patient responses are automatically triaged and appear on your dashboard</span>
            </div>
            <div className="flex items-start">
              <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-3 mt-0.5">4</span>
              <span>You'll receive notifications for urgent (red) cases immediately</span>
            </div>
          </div>
        </div>

        {/* Important Notes */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h4 className="font-medium text-amber-900 mb-2">Important Notes:</h4>
          <ul className="text-sm text-amber-800 space-y-1">
            <li>• Patients can opt out anytime by texting "STOP"</li>
            <li>• Red alerts include instructions to seek immediate care if needed</li>
            <li>• All patient data is encrypted and HIPAA-compliant</li>
            <li>• You can pause or modify the program from your dashboard</li>
          </ul>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button onClick={onBack} className="btn-secondary flex items-center">
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          Back
        </button>
        <button onClick={onLaunch} className="bg-green-600 text-white px-6 py-2 rounded-md font-medium hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors flex items-center">
          <RocketLaunchIcon className="mr-2 h-5 w-5" />
          Launch Monitoring Program
        </button>
      </div>
    </div>
  );
}