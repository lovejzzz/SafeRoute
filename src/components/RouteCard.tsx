import { Moon, Sun, TreePine, Coffee, Armchair } from 'lucide-react';
import { Badge } from './ui/badge';

interface RouteCardProps {
  route: 'fastest' | 'safest' | 'comfortable' | 'scenic';
  title: string;
  time: string;
  details: string;
  tags: string[];
  nightFriendly?: boolean;
  safety: {
    lightingLevel: 'well-lit' | 'mixed' | 'dark';
    crossingCount: number;
    sidewalkCoverage: 'continuous' | 'partial' | 'none';
  };
  comfort: {
    shadePercent: number;
    restSpotCount: number;
  };
  recommended?: boolean;
  recommendationReason?: string;
  onClick: () => void;
}

export default function RouteCard({
  route,
  title,
  time,
  details,
  tags,
  nightFriendly,
  safety,
  comfort,
  recommended,
  recommendationReason,
  onClick
}: RouteCardProps) {
  // Tag color based on type
  const getTagStyle = (tag: string) => {
    if (tag.toLowerCase().includes('safety') || tag.toLowerCase().includes('lit') || tag.toLowerCase().includes('night')) {
      return 'bg-green-100 text-green-700';
    }
    if (tag.toLowerCase().includes('comfort') || tag.toLowerCase().includes('shade') || tag.toLowerCase().includes('rest')) {
      return 'bg-purple-100 text-purple-700';
    }
    if (tag.toLowerCase().includes('fast') || tag.toLowerCase().includes('direct')) {
      return 'bg-blue-100 text-blue-700';
    }
    if (tag.toLowerCase().includes('scenic') || tag.toLowerCase().includes('park')) {
      return 'bg-amber-100 text-amber-700';
    }
    return 'bg-gray-100 text-gray-700';
  };

  // Route type badge color
  const routeTypeColor = {
    fastest: 'bg-blue-500',
    safest: 'bg-green-500',
    comfortable: 'bg-purple-500',
    scenic: 'bg-amber-500'
  };

  return (
    <button 
      onClick={onClick}
      className="w-full bg-white rounded-xl p-4 shadow-sm border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all text-left"
    >
      <div className="flex items-start gap-3">
        {/* Route type indicator */}
        <div className={`w-1 h-full min-h-[80px] rounded-full ${routeTypeColor[route]}`} />
        
        <div className="flex-1">
          {/* Header */}
          <div className="flex items-start justify-between mb-2">
            <div>
              <div>
                <span className="font-semibold text-gray-900">{title}</span>
                {nightFriendly && (
                  <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded w-fit mt-1">
                    <Moon className="w-3 h-3" />
                    Night friendly
                  </span>
                )}
              </div>
              {recommended && (
                <Badge 
                  variant="secondary" 
                  className={`mt-1 text-xs ${
                    recommendationReason?.includes('🌙') 
                      ? 'bg-indigo-100 text-indigo-700' 
                      : recommendationReason?.includes('☀️')
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {recommendationReason || '★ Recommended for you'}
                </Badge>
              )}
            </div>
            <div className="text-right">
              <div className="text-blue-600 font-bold text-lg">{time}</div>
            </div>
          </div>

          {/* Details row */}
          <div className="text-sm text-gray-600 mb-3">{details}</div>

          {/* Quick info icons */}
          <div className="flex items-center gap-4 mb-3 text-xs text-gray-600">
            <span className="flex items-center gap-1">
              {safety.lightingLevel === 'well-lit' ? (
                <Sun className="w-3.5 h-3.5 text-yellow-500" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-gray-400" />
              )}
              {safety.lightingLevel === 'well-lit' ? 'Well lit' : safety.lightingLevel === 'mixed' ? 'Mixed lighting' : 'Some dark areas'}
            </span>
            <span className="flex items-center gap-1">
              <TreePine className="w-3.5 h-3.5 text-green-500" />
              {comfort.shadePercent}% shade
            </span>
            {comfort.restSpotCount > 0 && (
              <span className="flex items-center gap-1">
                <Coffee className="w-3.5 h-3.5 text-amber-600" />
                {comfort.restSpotCount} rest {comfort.restSpotCount === 1 ? 'spot' : 'spots'}
              </span>
            )}
          </div>

          {/* Tags */}
          <div className="flex gap-1.5 flex-wrap">
            {tags.map((tag, i) => (
              <span 
                key={i} 
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTagStyle(tag)}`}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </button>
  );
}
