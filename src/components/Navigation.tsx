import { useEffect, useRef, useState, useCallback } from 'react';
import { X, Volume2, VolumeX, CornerUpRight, CornerUpLeft, ArrowUp, MapPin, ChevronUp, ChevronDown } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import { useRoute, Coordinates } from '../context/RouteContext';

interface NavigationProps {
  onBack: () => void;
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
  return `${Math.round(meters)} m`;
};

export default function Navigation({ onBack }: NavigationProps) {
  const { selectedRoute, origin, destination, mapboxToken } = useRoute();
  
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const userMarker = useRef<mapboxgl.Marker | null>(null);
  
  const [mapLoaded, setMapLoaded] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [distanceToNext, setDistanceToNext] = useState<number | null>(null);

  // Calculate distance between two points
  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const deltaPhi = (lat2 - lat1) * Math.PI / 180;
    const deltaLambda = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current || !selectedRoute) return;

    mapboxgl.accessToken = mapboxToken;
    
    const startCoords = origin?.coordinates || { lng: -73.9965, lat: 40.7295 };
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/navigation-night-v1',
      center: [startCoords.lng, startCoords.lat],
      zoom: 17,
      pitch: 45,
      bearing: 0,
      attributionControl: false,
    });

    map.current.on('load', () => {
      setMapLoaded(true);
      
      // Add route line
      if (map.current && selectedRoute) {
        map.current.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: selectedRoute.geometry,
          },
        });

        map.current.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#4F8EF7',
            'line-width': 8,
          },
        });

        // Add destination marker
        if (destination) {
          new mapboxgl.Marker({ color: '#10B981' })
            .setLngLat([destination.coordinates.lng, destination.coordinates.lat])
            .addTo(map.current);
        }
      }
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [mapboxToken, selectedRoute, origin, destination]);

  // Start watching user location
  useEffect(() => {
    if (!navigator.geolocation || !mapLoaded) return;

    let localWatchId: number | null = null;

    localWatchId = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation = {
          lng: position.coords.longitude,
          lat: position.coords.latitude,
        };
        setUserLocation(newLocation);

        // Update user marker on map
        if (map.current) {
          if (!userMarker.current) {
            const el = document.createElement('div');
            el.className = 'user-location-marker';
            el.style.cssText = `
              width: 20px;
              height: 20px;
              background: #2563EB;
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            `;
            
            userMarker.current = new mapboxgl.Marker(el)
              .setLngLat([newLocation.lng, newLocation.lat])
              .addTo(map.current);
          } else {
            userMarker.current.setLngLat([newLocation.lng, newLocation.lat]);
          }

          // Center map on user
          map.current.easeTo({
            center: [newLocation.lng, newLocation.lat],
            duration: 1000,
          });
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );

    return () => {
      if (localWatchId !== null) {
        navigator.geolocation.clearWatch(localWatchId);
      }
    };
  }, [mapLoaded]);

  // Update distance to next step when location changes
  useEffect(() => {
    if (!selectedRoute || !userLocation) return;
    
    const step = selectedRoute.steps[currentStepIndex];
    if (step) {
      const dist = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        step.maneuver.location[1],
        step.maneuver.location[0]
      );
      setDistanceToNext(dist);

      // Auto-advance to next step if close enough
      if (dist < 20 && currentStepIndex < selectedRoute.steps.length - 1) {
        setCurrentStepIndex(prev => prev + 1);
        
        // Speak instruction if not muted
        if (!isMuted && 'speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(
            selectedRoute.steps[currentStepIndex + 1]?.instruction || ''
          );
          speechSynthesis.speak(utterance);
        }
      }
    }
  }, [userLocation, selectedRoute, currentStepIndex, isMuted, calculateDistance]);

  // Simulate location for demo purposes (runs only once on mount)
  useEffect(() => {
    if (origin && selectedRoute?.steps[0]) {
      setUserLocation(origin.coordinates);
      setDistanceToNext(selectedRoute.steps[0].distance);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!selectedRoute) return null;

  const currentStep = selectedRoute.steps[currentStepIndex];
  const nextStep = selectedRoute.steps[currentStepIndex + 1];
  const CurrentIcon = currentStep ? getManeuverIcon(currentStep.maneuver.type, currentStep.maneuver.modifier) : ArrowUp;

  const totalDistance = selectedRoute.distance;
  const remainingSteps = selectedRoute.steps.slice(currentStepIndex);
  const remainingDistance = remainingSteps.reduce((acc, step) => acc + step.distance, 0);
  const remainingTime = remainingSteps.reduce((acc, step) => acc + step.duration, 0);

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Map */}
      <div ref={mapContainer} className="flex-1 relative">
        {/* Exit button */}
        <button 
          onClick={onBack}
          className="absolute top-4 left-4 w-10 h-10 bg-gray-800/90 rounded-full flex items-center justify-center z-10"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        {/* Mute button */}
        <button 
          onClick={() => setIsMuted(!isMuted)}
          className="absolute top-4 right-4 w-10 h-10 bg-gray-800/90 rounded-full flex items-center justify-center z-10"
        >
          {isMuted ? (
            <VolumeX className="w-5 h-5 text-white" />
          ) : (
            <Volume2 className="w-5 h-5 text-white" />
          )}
        </button>
      </div>

      {/* Navigation panel */}
      <div className={`bg-gray-800 transition-all duration-300 ${isExpanded ? 'h-[60%]' : ''}`}>
        {/* Current instruction */}
        <div className="bg-blue-600 px-4 py-4">
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="absolute right-4 top-2 text-white/70"
          >
            {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
          </button>
          
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
              <CurrentIcon className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-2xl font-bold text-white">
                {distanceToNext !== null ? formatDistance(distanceToNext) : formatDistance(currentStep?.distance || 0)}
              </div>
              <div className="text-white/90">{currentStep?.instruction || 'Starting navigation...'}</div>
            </div>
          </div>
        </div>

        {/* Next instruction preview */}
        {nextStep && (
          <div className="bg-gray-700 px-4 py-3 flex items-center gap-3">
            <div className="text-gray-400 text-sm">Then</div>
            <div className="text-white text-sm">{nextStep.instruction}</div>
          </div>
        )}

        {/* Progress bar */}
        <div className="px-4 py-3 bg-gray-800">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>{formatDistance(remainingDistance)} remaining</span>
            <span>{Math.ceil(remainingTime / 60)} min</span>
          </div>
          <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${((totalDistance - remainingDistance) / totalDistance) * 100}%` }}
            />
          </div>
        </div>

        {/* Expanded steps list */}
        {isExpanded && (
          <div className="flex-1 overflow-y-auto px-4 py-2">
            {remainingSteps.map((step, index) => {
              const Icon = getManeuverIcon(step.maneuver.type, step.maneuver.modifier);
              const isActive = index === 0;
              
              return (
                <div 
                  key={index} 
                  className={`flex items-center gap-3 py-3 border-b border-gray-700/50 ${
                    isActive ? 'bg-gray-700/50 -mx-4 px-4 rounded-lg' : ''
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isActive ? 'bg-blue-600' : 'bg-gray-700'
                  }`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-white text-sm">{step.instruction}</div>
                    <div className="text-gray-500 text-xs">{formatDistance(step.distance)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom actions */}
        <div className="p-4 flex gap-3">
          <button 
            onClick={onBack}
            className="flex-1 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
          >
            End navigation
          </button>
        </div>
      </div>
    </div>
  );
}
