import { useState } from 'react';
import { ChevronRightIcon, ClockIcon, PhoneIcon } from '@heroicons/react/24/outline';
import { PatientSummary, RiskLevel } from '@/types';
import { formatDistanceToNow } from 'date-fns';

interface TriageTableProps {
  patients: PatientSummary[];
  isLoading: boolean;
  onPatientSelect: (patient: PatientSummary) => void;
  riskFilter: RiskLevel | 'all';
}

export default function TriageTable({
  patients,
  isLoading,
  onPatientSelect,
  riskFilter
}: TriageTableProps) {
  const [sortBy, setSortBy] = useState<'risk' | 'time'>('risk');

  // Sort patients by risk (Red > Yellow > Green) then by latest update time
  const sortedPatients = [...patients].sort((a, b) => {
    if (sortBy === 'risk') {
      const riskOrder = { red: 3, yellow: 2, green: 1 };
      const riskDiff = riskOrder[b.risk_level] - riskOrder[a.risk_level];
      if (riskDiff !== 0) return riskDiff;
    }

    // Sort by time as secondary criteria
    const aTime = a.latest_response?.received_at || a.updated_at;
    const bTime = b.latest_response?.received_at || b.updated_at;
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });

  if (isLoading) {
    return (
      <div className="overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Patient Triage</h3>
          <p className="mt-1 text-sm text-gray-500">
            Review patient check-ins and take action
          </p>
        </div>
        <div className="animate-pulse">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center space-x-4">
                <div className="h-6 w-16 bg-gray-200 rounded"></div>
                <div className="h-4 w-24 bg-gray-200 rounded"></div>
                <div className="h-4 w-32 bg-gray-200 rounded"></div>
                <div className="h-4 w-8 bg-gray-200 rounded"></div>
                <div className="h-4 w-12 bg-gray-200 rounded"></div>
                <div className="h-4 w-20 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (patients.length === 0) {
    return (
      <div className="text-center py-12">
        <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No patient updates</h3>
        <p className="mt-1 text-sm text-gray-500">
          {riskFilter === 'all'
            ? 'No patient check-ins yet today.'
            : `No ${riskFilter} risk patients today.`}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      {/* Table header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">
            Patient Triage
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({patients.length} patient{patients.length !== 1 ? 's' : ''})
            </span>
          </h3>
          <div className="flex space-x-2">
            <button
              onClick={() => setSortBy('risk')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                sortBy === 'risk'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Sort by Risk
            </button>
            <button
              onClick={() => setSortBy('time')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                sortBy === 'time'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Sort by Time
            </button>
          </div>
        </div>
      </div>

      {/* Table content */}
      <div className="overflow-y-auto max-h-96">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Risk
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Patient
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Procedure
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pain
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Bleeding
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Update
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Flags
              </th>
              <th className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedPatients.map((patient) => (
              <PatientRow
                key={patient.id}
                patient={patient}
                onSelect={() => onPatientSelect(patient)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PatientRow({ patient, onSelect }: { patient: PatientSummary; onSelect: () => void }) {
  const riskBadgeClass = {
    red: 'risk-badge-red',
    yellow: 'risk-badge-yellow',
    green: 'risk-badge-green'
  }[patient.risk_level];

  const lastUpdate = patient.latest_response?.received_at || patient.updated_at;
  const timeAgo = formatDistanceToNow(new Date(lastUpdate), { addSuffix: true });

  return (
    <tr
      className="table-row cursor-pointer focus-ring"
      onClick={onSelect}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <td className="table-cell">
        <span className={`risk-badge ${riskBadgeClass} capitalize`}>
          {patient.risk_level}
        </span>
      </td>
      <td className="table-cell">
        <div>
          <div className="font-medium text-gray-900">
            {patient.first_name} {patient.last_initial}.
          </div>
          <div className="text-sm text-gray-500">
            <PhoneIcon className="inline h-3 w-3 mr-1" />
            {patient.phone_e164.slice(-4)}
          </div>
        </div>
      </td>
      <td className="table-cell">
        <div>
          <div className="text-sm text-gray-900">{patient.procedure_type}</div>
          <div className="text-sm text-gray-500">Day {patient.days_post_op}</div>
        </div>
      </td>
      <td className="table-cell">
        {patient.latest_response?.pain_score !== undefined ? (
          <span className="text-sm font-medium text-gray-900">
            {patient.latest_response.pain_score}/10
          </span>
        ) : (
          <span className="text-sm text-gray-400">—</span>
        )}
      </td>
      <td className="table-cell">
        {patient.latest_response?.bleeding !== null ? (
          <span className={`text-sm font-medium ${
            patient.latest_response?.bleeding ? 'text-red-600' : 'text-gray-600'
          }`}>
            {patient.latest_response?.bleeding ? 'Yes' : 'No'}
          </span>
        ) : (
          <span className="text-sm text-gray-400">—</span>
        )}
      </td>
      <td className="table-cell">
        <div className="text-sm text-gray-900">{timeAgo}</div>
        <div className="text-xs text-gray-500">
          {patient.latest_response ? 'via SMS' : 'No response'}
        </div>
      </td>
      <td className="table-cell">
        <div className="flex flex-wrap gap-1">
          {patient.flags.slice(0, 2).map((flag, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700"
            >
              {formatFlag(flag)}
            </span>
          ))}
          {patient.flags.length > 2 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
              +{patient.flags.length - 2}
            </span>
          )}
        </div>
      </td>
      <td className="table-cell text-right">
        <ChevronRightIcon className="h-5 w-5 text-gray-400" />
      </td>
    </tr>
  );
}

function formatFlag(flag: string): string {
  const flagMap: Record<string, string> = {
    'PAIN_HIGH': 'High Pain',
    'PAIN_MODERATE': 'Moderate Pain',
    'BLEEDING_YES': 'Bleeding',
    'BLEEDING_HEAVY': 'Heavy Bleeding',
    'BLEEDING_LIGHT': 'Light Bleeding',
    'SWELLING_INCREASED': '↑Swelling',
    'FEVER_HIGH': 'High Fever',
    'FEVER_MILD': 'Fever',
    'FEVER_MENTIONED': 'Fever?',
    'CONCERNING_SYMPTOMS': 'Concerning'
  };

  return flagMap[flag] || flag;
}