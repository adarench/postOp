import { ExclamationTriangleIcon, EyeIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { DashboardMetrics, RiskLevel } from '@/types';

interface SummaryCardsProps {
  metrics?: DashboardMetrics;
  isLoading: boolean;
  onRiskFilterChange: (filter: RiskLevel | 'all') => void;
  activeFilter: RiskLevel | 'all';
}

export default function SummaryCards({
  metrics,
  isLoading,
  onRiskFilterChange,
  activeFilter
}: SummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="summary-card animate-pulse">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
              </div>
              <div className="ml-4 flex-1">
                <div className="h-6 bg-gray-200 rounded w-16 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-20"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  const cards = [
    {
      title: 'Urgent',
      value: metrics.red_count,
      icon: ExclamationTriangleIcon,
      color: 'red',
      filter: 'red' as RiskLevel,
      bgColor: 'bg-red-50',
      iconColor: 'text-red-600',
      textColor: 'text-red-900'
    },
    {
      title: 'Review Today',
      value: metrics.yellow_count,
      icon: EyeIcon,
      color: 'yellow',
      filter: 'yellow' as RiskLevel,
      bgColor: 'bg-yellow-50',
      iconColor: 'text-yellow-600',
      textColor: 'text-yellow-900'
    },
    {
      title: 'Routine',
      value: metrics.green_count,
      icon: CheckCircleIcon,
      color: 'green',
      filter: 'green' as RiskLevel,
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
      textColor: 'text-green-900'
    }
  ];

  return (
    <div>
      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
        {cards.map((card) => {
          const isActive = activeFilter === card.filter;
          const Icon = card.icon;

          return (
            <button
              key={card.title}
              onClick={() => onRiskFilterChange(isActive ? 'all' : card.filter)}
              className={`summary-card text-left transition-all ${
                isActive
                  ? `ring-2 ring-${card.color === 'yellow' ? 'amber' : card.color}-500 ${card.bgColor}`
                  : 'hover:shadow-md'
              }`}
            >
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`p-2 ${card.bgColor} rounded-lg`}>
                    <Icon className={`h-6 w-6 ${card.iconColor}`} />
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-card-number font-semibold text-gray-900">
                    {card.value}
                  </p>
                  <p className="text-sm text-gray-secondary font-medium">
                    {card.title}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Summary stats */}
      <div className="flex items-center justify-between text-sm text-gray-secondary">
        <div>
          Total patients: <span className="font-medium text-gray-900">{metrics.total_patients}</span>
        </div>
        <div>
          Response rate: <span className="font-medium text-gray-900">{Math.round(metrics.response_rate * 100)}%</span>
        </div>
        {activeFilter !== 'all' && (
          <button
            onClick={() => onRiskFilterChange('all')}
            className="text-blue-accent hover:text-blue-700 font-medium"
          >
            Show all patients
          </button>
        )}
      </div>
    </div>
  );
}