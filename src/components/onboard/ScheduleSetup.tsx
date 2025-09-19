import { ArrowRightIcon, ArrowLeftIcon, ClockIcon } from '@heroicons/react/24/outline';

interface ScheduleSetupProps {
  checkInTime: string;
  timezone: string;
  duration: number;
  onChange: (updates: Partial<{ checkInTime: string; timezone: string; duration: number }>) => void;
  onNext: () => void;
  onBack: () => void;
}

const TIMEZONE_OPTIONS = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' }
];

const TIME_OPTIONS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
];

export default function ScheduleSetup({
  checkInTime,
  timezone,
  duration,
  onChange,
  onNext,
  onBack
}: ScheduleSetupProps) {
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour24 = parseInt(hours);
    const isPM = hour24 >= 12;
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    return `${hour12}:${minutes} ${isPM ? 'PM' : 'AM'}`;
  };

  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-2">Configure Check-in Schedule</h2>
        <p className="text-sm text-gray-600">
          Set when patients will receive their daily check-in messages
        </p>
      </div>

      <div className="space-y-6 max-w-md mx-auto">
        {/* Check-in Time */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-3">
            <ClockIcon className="inline h-4 w-4 mr-1" />
            Daily Check-in Time
          </label>
          <div className="grid grid-cols-2 gap-3">
            {TIME_OPTIONS.map((time) => (
              <button
                key={time}
                onClick={() => onChange({ checkInTime: time })}
                className={`p-3 text-center rounded-lg border transition-all ${
                  checkInTime === time
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                <div className="font-medium">{formatTime(time)}</div>
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-500 text-center">
            Recommended: 9:00 AM allows patients to respond before lunch
          </p>
        </div>

        {/* Timezone */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Practice Timezone
          </label>
          <select
            value={timezone}
            onChange={(e) => onChange({ timezone: e.target.value })}
            className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            {TIMEZONE_OPTIONS.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Monitoring Duration
          </label>
          <select
            value={duration}
            onChange={(e) => onChange({ duration: parseInt(e.target.value) })}
            className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value={7}>7 days (1 week)</option>
            <option value={10}>10 days</option>
            <option value={14}>14 days (2 weeks) - Recommended</option>
            <option value={21}>21 days (3 weeks)</option>
            <option value={30}>30 days (1 month)</option>
          </select>
          <p className="mt-1 text-xs text-gray-500">
            Most complications occur within the first 2 weeks post-op
          </p>
        </div>

        {/* Preview */}
        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Schedule Preview</h4>
          <div className="text-sm text-blue-800 space-y-1">
            <div>
              <strong>Check-in time:</strong> {formatTime(checkInTime)} {timezone.split('/')[1].replace('_', ' ')}
            </div>
            <div>
              <strong>Duration:</strong> {duration} days starting from surgery date
            </div>
            <div>
              <strong>Total messages:</strong> ~{duration * 2} SMS per patient (check-ins + replies)
            </div>
          </div>
        </div>

        {/* Sample message */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">Sample Check-in Message</h4>
          <div className="bg-white rounded border p-3 text-sm">
            <div className="text-gray-600 text-xs mb-1">SMS Preview:</div>
            <div className="text-gray-900">
              "Hi Sarah! Day 3 check-in. Peak swelling typically occurs around now.
              <br /><br />
              1. Pain level 0-10?<br />
              2. Any new bleeding/swelling? (YES/NO)<br />
              3. Any concerns?"
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <button onClick={onBack} className="btn-secondary flex items-center">
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          Back
        </button>
        <button onClick={onNext} className="btn-primary flex items-center">
          Continue
          <ArrowRightIcon className="ml-2 h-4 w-4" />
        </button>
      </div>
    </div>
  );
}