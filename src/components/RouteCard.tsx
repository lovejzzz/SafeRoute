import { ChevronRight } from 'lucide-react';
import { Badge } from './ui/badge';

interface RouteCardProps {
  route: 'fastest' | 'safest' | 'comfortable' | 'scenic';
  title: string;
  time: string;
  details: string;
  recommended?: boolean;
  recommendationReason?: string;
  onClick: () => void;
}

export default function RouteCard({
  route,
  title,
  time,
  details,
  recommended,
  recommendationReason,
  onClick
}: RouteCardProps) {
  // Route type badge color
  const routeTypeColor = {
    fastest: 'bg-blue-500',
    safest: 'bg-green-500',
    comfortable: 'bg-purple-500',
    scenic: 'bg-amber-500'
  };

  // Route type description
  const routeDescription = {
    fastest: 'Quickest path',
    safest: 'Well-lit & safe',
    comfortable: 'Easy walk',
    scenic: 'Parks & views'
  };

  return (
    <button 
      onClick={onClick}
      className="w-full bg-white rounded-xl p-4 shadow-sm border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all text-left"
    >
      <div className="flex items-center gap-3">
        {/* Route type indicator */}
        <div className={`w-1.5 self-stretch rounded-full ${routeTypeColor[route]}`} />
        
        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">{title}</span>
              {recommended && (
                <Badge 
                  variant="secondary" 
                  className={`text-xs ${
                    recommendationReason?.includes('🌙') 
                      ? 'bg-indigo-100 text-indigo-700' 
                      : recommendationReason?.includes('☀️')
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {recommendationReason || '★ Recommended'}
                </Badge>
              )}
            </div>
            <div className="text-blue-600 font-bold text-lg">{time}</div>
          </div>

          {/* Details row */}
          <div className="flex items-center justify-between mt-1">
            <div className="text-sm text-gray-500">
              {details} · <span className="text-gray-400">{routeDescription[route]}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </div>
        </div>
      </div>
    </button>
  );
}
