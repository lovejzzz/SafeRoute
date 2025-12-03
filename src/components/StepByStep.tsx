import { ArrowLeft, Navigation2, CornerUpRight, CornerUpLeft, ArrowUp, MapPin, Sun, Moon, TreePine, AlertTriangle, Coffee, Armchair, MountainSnow } from 'lucide-react';
import { Button } from './ui/button';
import { useRoute, RouteStep } from '../context/RouteContext';

interface StepByStepProps {
  onBack: () => void;
  onStartNavigation: () => void;
}

const getManeuverIcon = (type: string, modifier?: string) => {
  if (type === 'turn') {
    if (modifier?.includes('right')) return CornerUpRight;
    if (modifier?.includes('left')) return CornerUpLeft;
  }
  if (type === 'arrive' || type === 'depart') return MapPin;
  return ArrowUp;
};

const formatDistance = (meters: number) => {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  if (meters < 10) return '';
  return `${Math.round(meters)} m`;
};

const formatDuration = (seconds: number) => {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return `${hours}h ${remainMins}m`;
};

// Generate comfort-aware description for a step
const getComfortDescription = (step: RouteStep): string[] => {
  const tags: string[] = [];
  
  if (step.comfort) {
    // Lighting
    if (step.comfort.lighting === 'well-lit') {
      tags.push('Well lit street');
    } else if (step.comfort.lighting === 'dark') {
      tags.push('Some darker areas');
    }
    
    // Shade
    if (step.comfort.shade) {
      tags.push('Shaded path');
    }
    
    // Terrain
    if (step.comfort.terrain === 'steep') {
      tags.push('Steep hill ahead');
    } else if (step.comfort.terrain === 'slight-incline') {
      tags.push('Gentle slope');
    }
    
    // Crossing
    if (step.comfort.crossing === 'signal') {
      tags.push('Signalized crossing');
    } else if (step.comfort.crossing === 'busy-road') {
      tags.push('Busy road crossing');
    }
    
    // Rest spot
    if (step.comfort.restSpot === 'cafe') {
      tags.push('Café nearby');
    } else if (step.comfort.restSpot === 'bench') {
      tags.push('Bench available');
    } else if (step.comfort.restSpot === 'park') {
      tags.push('Park rest area');
    }
  }
  
  return tags;
};

export default function StepByStep({ onBack, onStartNavigation }: StepByStepProps) {
  const { selectedRoute, origin, destination } = useRoute();

  if (!selectedRoute) return null;

  const routeInfo = `${selectedRoute.title} · ${formatDuration(selectedRoute.duration)} · ${formatDistance(selectedRoute.distance)}`;

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0">
        <div className="flex items-center gap-3 mb-1">
          <button onClick={onBack} className="p-1 hover:bg-gray-100 rounded">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="font-semibold">Step-by-step directions</div>
        </div>
        <div className="text-sm text-gray-600 ml-9">{routeInfo}</div>
      </div>

      {/* Route summary with safety/comfort info */}
      <div className="bg-gradient-to-r from-blue-50 to-green-50 px-4 py-3 border-b border-blue-100">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
            <Navigation2 className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <div className="font-medium text-blue-900">
              {origin?.name || 'Start'} → {destination?.name || 'Destination'}
            </div>
            <div className="text-sm text-blue-700">
              {selectedRoute.steps.length} steps · {selectedRoute.safety.sidewalks}
            </div>
          </div>
        </div>
        
        {/* Quick route overview */}
        <div className="flex flex-wrap gap-2">
          <span className="flex items-center gap-1 text-xs bg-white px-2 py-1 rounded-full text-gray-700">
            {selectedRoute.safety.lightingLevel === 'well-lit' ? (
              <Sun className="w-3 h-3 text-yellow-500" />
            ) : (
              <Moon className="w-3 h-3 text-gray-400" />
            )}
            {selectedRoute.safety.lighting}
          </span>
          <span className="flex items-center gap-1 text-xs bg-white px-2 py-1 rounded-full text-gray-700">
            <TreePine className="w-3 h-3 text-green-500" />
            {selectedRoute.comfort.shade}
          </span>
          <span className="flex items-center gap-1 text-xs bg-white px-2 py-1 rounded-full text-gray-700">
            <AlertTriangle className="w-3 h-3 text-amber-500" />
            {selectedRoute.safety.crossings}
          </span>
          {selectedRoute.comfort.restSpotCount > 0 && (
            <span className="flex items-center gap-1 text-xs bg-white px-2 py-1 rounded-full text-gray-700">
              <Coffee className="w-3 h-3 text-amber-600" />
              {selectedRoute.comfort.restSpotCount} rest spots
            </span>
          )}
        </div>
      </div>

      {/* Steps list with comfort info */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-4 space-y-1">
          {selectedRoute.steps.map((step, index) => {
            const Icon = getManeuverIcon(step.maneuver.type, step.maneuver.modifier);
            const isFirst = index === 0;
            const isLast = index === selectedRoute.steps.length - 1;
            const distance = formatDistance(step.distance);
            const comfortTags = getComfortDescription(step);
            
            return (
              <div key={index} className="flex gap-3">
                {/* Timeline line */}
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isFirst ? 'bg-red-100' : isLast ? 'bg-green-100' : 'bg-blue-100'
                  }`}>
                    <Icon className={`w-5 h-5 ${
                      isFirst ? 'text-red-600' : isLast ? 'text-green-600' : 'text-blue-600'
                    }`} />
                  </div>
                  {!isLast && (
                    <div className="w-0.5 flex-1 bg-gray-200 my-1 min-h-[20px]"></div>
                  )}
                </div>
                
                {/* Step content */}
                <div className="flex-1 pb-4">
                  {distance && (
                    <div className={`text-sm font-medium mb-1 ${
                      isFirst ? 'text-red-600' : isLast ? 'text-green-600' : 'text-blue-600'
                    }`}>
                      {distance}
                    </div>
                  )}
                  <div className="font-medium text-gray-900">{step.instruction}</div>
                  
                  {/* Comfort tags for this step */}
                  {comfortTags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {comfortTags.map((tag, i) => (
                        <span 
                          key={i}
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            tag.includes('dark') || tag.includes('Busy') || tag.includes('Steep') 
                              ? 'bg-amber-50 text-amber-700' 
                              : 'bg-green-50 text-green-700'
                          }`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {step.duration > 0 && (
                    <div className="text-sm text-gray-500 mt-1">
                      About {Math.ceil(step.duration / 60)} min
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* What to expect summary */}
        <div className="mx-4 mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-sm font-medium text-gray-700 mb-2">What to expect:</div>
          <div className="text-sm text-gray-600 space-y-1">
            <div className="flex items-center gap-2">
              <MountainSnow className="w-4 h-4 text-gray-400" />
              <span>{selectedRoute.comfort.hills}</span>
            </div>
            <div className="flex items-center gap-2">
              <TreePine className="w-4 h-4 text-green-500" />
              <span>{selectedRoute.comfort.shade}</span>
            </div>
            <div className="flex items-center gap-2">
              <Armchair className="w-4 h-4 text-amber-500" />
              <span>{selectedRoute.comfort.restSpots}</span>
            </div>
          </div>
        </div>

        {/* Bottom note */}
        <div className="px-4 pb-4 text-center text-sm text-gray-500">
          ✓ You know what to expect. Feel confident taking this route.
        </div>
      </div>

      {/* Start button */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <Button 
          className="w-full bg-blue-600 hover:bg-blue-700"
          onClick={onStartNavigation}
        >
          <Navigation2 className="w-4 h-4 mr-2" />
          Start navigation
        </Button>
      </div>
    </div>
  );
}
