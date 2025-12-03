import { ArrowLeft, MoreVertical, Mountain, Navigation, Coffee, MapPin } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import type { RouteType } from '../App';

interface RoutePreviewProps {
  routeType: RouteType;
  onBack: () => void;
  onRouteChange: (route: RouteType) => void;
  onStepByStep: () => void;
}

const routeData = {
  fastest: {
    title: 'Fastest route',
    time: '18 min',
    distance: '1.3 km',
    badge: 'Shorter time',
    badgeVariant: 'secondary' as const,
    safety: {
      lighting: 'Mixed lighting, some darker blocks',
      crossings: '4 major intersections',
      sidewalks: 'One short segment without sidewalk'
    },
    comfort: {
      hills: 'Mostly flat',
      shade: 'Limited shade',
      restSpots: '1 bench, no café on route'
    },
    timeline: [
      { label: 'Start', position: 0 },
      { label: 'Busy avenue', position: 25 },
      { label: 'Unshaded block', position: 50 },
      { label: 'Intersection', position: 75 },
      { label: 'Destination', position: 100 }
    ]
  },
  safest: {
    title: 'Safest route',
    time: '21 min',
    distance: '1.5 km',
    badge: 'High safety',
    badgeVariant: 'default' as const,
    safety: {
      lighting: 'Mostly well lit',
      crossings: '3 major intersections, 2 crosswalks',
      sidewalks: 'Continuous on both sides'
    },
    comfort: {
      hills: 'One moderate hill halfway',
      shade: 'About 60% shaded',
      restSpots: '2 benches, 1 café'
    },
    timeline: [
      { label: 'Start', position: 0 },
      { label: 'Busy crossing', position: 20 },
      { label: 'Hill', position: 50 },
      { label: 'Bench + café', position: 70 },
      { label: 'Destination', position: 100 }
    ]
  },
  comfortable: {
    title: 'Most Comfortable route',
    time: '20 min',
    distance: '1.4 km',
    badge: 'High comfort',
    badgeVariant: 'secondary' as const,
    safety: {
      lighting: 'Well lit throughout',
      crossings: '2 major intersections with signals',
      sidewalks: 'Wide sidewalks on both sides'
    },
    comfort: {
      hills: 'Gentle slopes only',
      shade: 'Mostly shaded (75%)',
      restSpots: '3 benches, 2 cafés'
    },
    timeline: [
      { label: 'Start', position: 0 },
      { label: 'Tree-lined street', position: 30 },
      { label: 'Rest area', position: 60 },
      { label: 'Park section', position: 80 },
      { label: 'Destination', position: 100 }
    ]
  }
};

export default function RoutePreview({ routeType, onBack, onRouteChange, onStepByStep }: RoutePreviewProps) {
  const data = routeData[routeType];

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Map section */}
      <div className="h-[60%] relative bg-gradient-to-br from-blue-100 via-green-50 to-blue-50">
        {/* Map with route */}
        <svg className="w-full h-full" viewBox="0 0 390 506">
          {/* Route path */}
          <path 
            d="M 60 450 Q 100 380, 150 320 T 250 180 T 330 80" 
            stroke="#2563EB" 
            strokeWidth="4" 
            fill="none"
            strokeLinecap="round"
          />
          
          {/* Start marker */}
          <circle cx="60" cy="450" r="8" fill="#DC2626" stroke="white" strokeWidth="2" />
          
          {/* End marker */}
          <circle cx="330" cy="80" r="8" fill="#059669" stroke="white" strokeWidth="2" />
          
          {/* Icon markers along route */}
          {routeType === 'safest' && (
            <>
              {/* Hill marker */}
              <circle cx="250" cy="180" r="16" fill="white" stroke="#2563EB" strokeWidth="2" />
              <text x="250" y="187" textAnchor="middle" fontSize="14">⛰️</text>
              
              {/* Crossing marker */}
              <circle cx="150" cy="320" r="16" fill="white" stroke="#2563EB" strokeWidth="2" />
              <text x="150" y="327" textAnchor="middle" fontSize="14">🚦</text>
              
              {/* Café marker */}
              <circle cx="280" cy="140" r="16" fill="white" stroke="#2563EB" strokeWidth="2" />
              <text x="280" y="147" textAnchor="middle" fontSize="14">☕</text>
            </>
          )}
        </svg>

        {/* Top buttons */}
        <button onClick={onBack} className="absolute top-4 left-4 w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <button className="absolute top-4 right-4 w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center">
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>

      {/* Bottom sheet */}
      <div className="flex-1 bg-white rounded-t-3xl -mt-6 relative overflow-y-auto">
        <div className="px-5 py-4 space-y-4">
          {/* Summary */}
          <div className="flex items-start justify-between">
            <div>
              <div>{data.title}</div>
              <div className="text-gray-600">{data.time} · {data.distance}</div>
            </div>
            <Badge variant={data.badgeVariant}>{data.badge}</Badge>
          </div>

          {/* Mode chips */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button 
              onClick={() => onRouteChange('fastest')}
              className={`px-4 py-2 rounded-full whitespace-nowrap border ${
                routeType === 'fastest' 
                  ? 'bg-blue-600 text-white border-blue-600' 
                  : 'bg-white text-gray-700 border-gray-300'
              }`}
            >
              Fastest
            </button>
            <button 
              onClick={() => onRouteChange('safest')}
              className={`px-4 py-2 rounded-full whitespace-nowrap border ${
                routeType === 'safest' 
                  ? 'bg-blue-600 text-white border-blue-600' 
                  : 'bg-white text-gray-700 border-gray-300'
              }`}
            >
              Safest
            </button>
            <button 
              onClick={() => onRouteChange('comfortable')}
              className={`px-4 py-2 rounded-full whitespace-nowrap border ${
                routeType === 'comfortable' 
                  ? 'bg-blue-600 text-white border-blue-600' 
                  : 'bg-white text-gray-700 border-gray-300'
              }`}
            >
              Most Comfortable
            </button>
            <button className="px-4 py-2 rounded-full whitespace-nowrap border bg-white text-gray-700 border-gray-300">
              Scenic
            </button>
          </div>

          {/* Safety section */}
          <div>
            <div className="mb-2">Safety</div>
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Lighting:</span>
                <span>{data.safety.lighting}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Crossings:</span>
                <span>{data.safety.crossings}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Sidewalks:</span>
                <span>{data.safety.sidewalks}</span>
              </div>
            </div>
          </div>

          {/* Comfort section */}
          <div>
            <div className="mb-2">Comfort</div>
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Hills:</span>
                <span>{data.comfort.hills}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shade:</span>
                <span>{data.comfort.shade}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Rest spots:</span>
                <span>{data.comfort.restSpots}</span>
              </div>
            </div>
          </div>

          {/* Route timeline */}
          <div>
            <div className="mb-3">Along your route</div>
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute top-3 left-0 right-0 h-0.5 bg-gray-300"></div>
              
              {/* Timeline markers */}
              <div className="relative flex justify-between">
                {data.timeline.map((point, i) => (
                  <div key={i} className="flex flex-col items-center" style={{ width: '20%' }}>
                    <div className="w-3 h-3 rounded-full bg-blue-600 mb-2 relative z-10"></div>
                    <div className="text-center text-gray-700">{point.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="space-y-3 pt-2 pb-6">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={onStepByStep}
            >
              Preview step-by-step
            </Button>
            <Button className="w-full bg-blue-600 hover:bg-blue-700">
              Start walking
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
