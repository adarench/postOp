import { ArrowRightIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

interface ProcedureSelectorProps {
  selectedProcedure: string;
  onSelect: (procedure: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const COMMON_PROCEDURES = [
  {
    name: 'Rhinoplasty',
    description: 'Nose reshaping surgery',
    duration: 14, // typical monitoring days
    tips: [
      'Peak swelling Days 2-3',
      'Avoid blowing nose for 1 week',
      'Sleep elevated for 2 weeks'
    ]
  },
  {
    name: 'Septoplasty',
    description: 'Deviated septum repair',
    duration: 10,
    tips: [
      'Nasal congestion normal first week',
      'Saline rinses help healing',
      'Avoid strenuous activity 2 weeks'
    ]
  },
  {
    name: 'Facelift',
    description: 'Face and neck lift',
    duration: 14,
    tips: [
      'Swelling peaks Day 3-5',
      'Sleep elevated 2 weeks',
      'Limited facial movement initially'
    ]
  },
  {
    name: 'Breast Augmentation',
    description: 'Breast implant surgery',
    duration: 14,
    tips: [
      'Arm movement restrictions 1 week',
      'No lifting over 10lbs 2 weeks',
      'Implants settle over 3-6 months'
    ]
  },
  {
    name: 'Tummy Tuck',
    description: 'Abdominoplasty',
    duration: 21,
    tips: [
      'Drain care very important',
      'No lifting/twisting 6 weeks',
      'Compression garment required'
    ]
  },
  {
    name: 'Liposuction',
    description: 'Fat removal procedure',
    duration: 10,
    tips: [
      'Compression garment 24/7',
      'Light activity encouraged Day 1',
      'Swelling peaks Week 2-3'
    ]
  },
  {
    name: 'Custom Procedure',
    description: 'Define your own monitoring protocol',
    duration: 14,
    tips: [
      'Customizable monitoring period',
      'Procedure-specific templates',
      'Flexible scheduling'
    ]
  }
];

export default function ProcedureSelector({
  selectedProcedure,
  onSelect,
  onNext,
  onBack
}: ProcedureSelectorProps) {
  return (
    <div>
      <div className="text-center mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-2">Select Procedure Type</h2>
        <p className="text-sm text-gray-600">
          Choose the primary procedure for your patient roster to get tailored monitoring templates
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {COMMON_PROCEDURES.map((procedure) => {
          const isSelected = selectedProcedure === procedure.name;

          return (
            <button
              key={procedure.name}
              onClick={() => onSelect(procedure.name)}
              className={`p-4 rounded-lg border-2 text-left transition-all hover:shadow-md ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-medium text-gray-900">{procedure.name}</h3>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
                  {procedure.duration} days
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-3">{procedure.description}</p>
              <div className="space-y-1">
                {procedure.tips.slice(0, 2).map((tip, index) => (
                  <div key={index} className="text-xs text-gray-500 flex items-center">
                    <span className="w-1 h-1 bg-gray-400 rounded-full mr-2"></span>
                    {tip}
                  </div>
                ))}
                {procedure.tips.length > 2 && (
                  <div className="text-xs text-gray-400">
                    +{procedure.tips.length - 2} more care tips
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {selectedProcedure && selectedProcedure !== 'Custom Procedure' && (
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <h4 className="font-medium text-blue-900 mb-2">
            {selectedProcedure} Monitoring Protocol
          </h4>
          <div className="text-sm text-blue-800">
            <div className="mb-2">
              Standard monitoring period: <strong>{COMMON_PROCEDURES.find(p => p.name === selectedProcedure)?.duration} days</strong>
            </div>
            <div>
              <strong>Key recovery insights:</strong>
              <ul className="mt-1 space-y-1">
                {COMMON_PROCEDURES.find(p => p.name === selectedProcedure)?.tips.map((tip, index) => (
                  <li key={index} className="flex items-center">
                    <span className="w-1 h-1 bg-blue-600 rounded-full mr-2"></span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {selectedProcedure === 'Custom Procedure' && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h4 className="font-medium text-gray-900 mb-3">Custom Procedure Setup</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Procedure Name
              </label>
              <input
                type="text"
                placeholder="e.g., Blepharoplasty, Brazilian Butt Lift"
                className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monitoring Duration (days)
              </label>
              <select className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500">
                <option value="7">7 days</option>
                <option value="10">10 days</option>
                <option value="14">14 days</option>
                <option value="21">21 days</option>
                <option value="30">30 days</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <button onClick={onBack} className="btn-secondary flex items-center">
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!selectedProcedure}
          className="btn-primary flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue
          <ArrowRightIcon className="ml-2 h-4 w-4" />
        </button>
      </div>
    </div>
  );
}