import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PatientSummary, DashboardMetrics, RiskLevel } from '@/types';
import SummaryCards from '@/components/dashboard/SummaryCards';
import TriageTable from '@/components/dashboard/TriageTable';
import PatientReviewDrawer from '@/components/dashboard/PatientReviewDrawer';
import Header from '@/components/layout/Header';

export default function Dashboard() {
  const [selectedPatient, setSelectedPatient] = useState<PatientSummary | null>(null);
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Fetch dashboard metrics
  const { data: metrics, isLoading: metricsLoading } = useQuery<DashboardMetrics>({
    queryKey: ['dashboard-metrics', selectedDate],
    queryFn: () => fetchDashboardMetrics(selectedDate),
  });

  // Fetch patient data with filters
  const { data: patients = [], isLoading: patientsLoading, refetch: refetchPatients } = useQuery<PatientSummary[]>({
    queryKey: ['patients', selectedDate, riskFilter, searchQuery],
    queryFn: () => fetchPatients({ date: selectedDate, riskFilter, searchQuery }),
  });

  return (
    <div className="min-h-screen bg-background">
      <Header
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="mb-8">
          <SummaryCards
            metrics={metrics}
            isLoading={metricsLoading}
            onRiskFilterChange={setRiskFilter}
            activeFilter={riskFilter}
          />
        </div>

        {/* Triage Table */}
        <div className="bg-white rounded-lg border border-gray-200">
          <TriageTable
            patients={patients}
            isLoading={patientsLoading}
            onPatientSelect={setSelectedPatient}
            riskFilter={riskFilter}
          />
        </div>
      </main>

      {/* Patient Review Drawer */}
      {selectedPatient && (
        <PatientReviewDrawer
          patient={selectedPatient}
          onClose={() => setSelectedPatient(null)}
          onAction={async (action, payload) => {
            // Handle staff actions
            await handleStaffAction(selectedPatient.id, action, payload);
            refetchPatients();
          }}
        />
      )}
    </div>
  );
}

// Mock API functions - will be replaced with actual Firebase calls
async function fetchDashboardMetrics(date: string): Promise<DashboardMetrics> {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 500));

  return {
    red_count: 3,
    yellow_count: 8,
    green_count: 24,
    total_patients: 35,
    response_rate: 0.86
  };
}

async function fetchPatients({ date, riskFilter, searchQuery }: {
  date: string;
  riskFilter: RiskLevel | 'all';
  searchQuery: string;
}): Promise<PatientSummary[]> {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 300));

  const mockPatients: PatientSummary[] = [
    {
      id: '1',
      practice_id: 'practice1',
      first_name: 'Sarah',
      last_initial: 'J',
      phone_e164: '+15551234567',
      procedure_type: 'Rhinoplasty',
      surgery_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      timezone: 'America/New_York',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      risk_level: 'red',
      flags: ['PAIN_HIGH', 'CONCERNING_SYMPTOMS'],
      days_post_op: 3,
      latest_response: {
        id: 'r1',
        patient_id: '1',
        checkin_day: 3,
        received_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        pain_score: 9,
        bleeding: false,
        concerns_text: 'Pain is really bad and I have a fever'
      },
      latest_triage: {
        id: 't1',
        response_id: 'r1',
        risk_level: 3,
        flags: ['PAIN_HIGH', 'FEVER_MENTIONED'],
        reasons: 'Severe pain (9/10); Fever mentioned without temperature',
        computed_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      }
    },
    {
      id: '2',
      practice_id: 'practice1',
      first_name: 'Michael',
      last_initial: 'R',
      phone_e164: '+15557654321',
      procedure_type: 'Septoplasty',
      surgery_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      timezone: 'America/New_York',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      risk_level: 'yellow',
      flags: ['PAIN_MODERATE'],
      days_post_op: 1,
      latest_response: {
        id: 'r2',
        patient_id: '2',
        checkin_day: 1,
        received_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        pain_score: 7,
        bleeding: false,
        concerns_text: 'Swelling seems worse today'
      }
    },
    {
      id: '3',
      practice_id: 'practice1',
      first_name: 'Emma',
      last_initial: 'L',
      phone_e164: '+15559876543',
      procedure_type: 'Rhinoplasty',
      surgery_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      timezone: 'America/New_York',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      risk_level: 'green',
      flags: [],
      days_post_op: 5,
      latest_response: {
        id: 'r3',
        patient_id: '3',
        checkin_day: 5,
        received_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        pain_score: 3,
        bleeding: false,
        concerns_text: 'Feeling much better today'
      }
    }
  ];

  // Apply filters
  let filtered = mockPatients;

  if (riskFilter !== 'all') {
    filtered = filtered.filter(p => p.risk_level === riskFilter);
  }

  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(p =>
      p.first_name.toLowerCase().includes(query) ||
      p.last_initial.toLowerCase().includes(query) ||
      p.phone_e164.includes(query.replace(/\D/g, ''))
    );
  }

  return filtered;
}

async function handleStaffAction(patientId: string, action: string, payload: any): Promise<void> {
  console.log(`Staff action: ${action} for patient ${patientId}`, payload);
  // This would call the Firebase function API
  await new Promise(resolve => setTimeout(resolve, 500));
}