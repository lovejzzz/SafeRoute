import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, MoreVertical, Share2, Heart, Sun, Moon, TreePine, Coffee, MountainSnow, Crosshair, AlertTriangle, Footprints, Copy, Download, Flag } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { DropdownMenu, DropdownItem, DropdownDivider } from './ui/dropdown-menu';
import { useRoute } from '../context/RouteContext';

interface RoutePreviewProps {
  onBack: () => void;
  onStepByStep: () => void;
  onStartNavigation: () => void;
}

export default function RoutePreview({ onBack, onStepByStep, onStartNavigation }: RoutePreviewProps) {
  const { 
    origin, 
    destination, 
    routes, 
    selectedRoute, 
    selectRoute, 
    mapboxToken 
  } = useRoute();
  
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = mapboxToken;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-73.9965, 40.7295],
      zoom: 14,
      attributionControl: false,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.current.on('load', () => {
      setMapLoaded(true);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [mapboxToken]);

  // Update map with selected route
  useEffect(() => {
    if (!map.current || !mapLoaded || !selectedRoute || !origin || !destination) return;

    // Remove existing layer and source
    if (map.current.getLayer('route')) map.current.removeLayer('route');
    if (map.current.getSource('route')) map.current.removeSource('route');

    // Add route line
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
        'line-color': '#2563EB',
        'line-width': 5,
      },
    });

    // Remove existing markers
    const existingMarkers = document.querySelectorAll('.mapboxgl-marker');
    existingMarkers.forEach(marker => marker.remove());

    // Add markers
    new mapboxgl.Marker({ color: '#DC2626' })
      .setLngLat([origin.coordinates.lng, origin.coordinates.lat])
      .setPopup(new mapboxgl.Popup().setHTML(`<strong>Start</strong><br/>${origin.name}`))
      .addTo(map.current);

    new mapboxgl.Marker({ color: '#059669' })
      .setLngLat([destination.coordinates.lng, destination.coordinates.lat])
      .setPopup(new mapboxgl.Popup().setHTML(`<strong>End</strong><br/>${destination.name}`))
      .addTo(map.current);

    // Add step markers along route
    if (selectedRoute.steps.length > 0) {
      selectedRoute.steps.forEach((step, index) => {
        if (index > 0 && index < selectedRoute.steps.length - 1 && step.maneuver.type !== 'arrive') {
          const el = document.createElement('div');
          el.className = 'step-marker';
          el.style.cssText = `
            width: 20px;
            height: 20px;
            background: white;
            border: 2px solid #2563EB;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-weight: bold;
            color: #2563EB;
          `;
          el.textContent = String(index);
          
          new mapboxgl.Marker(el)
            .setLngLat(step.maneuver.location)
            .setPopup(new mapboxgl.Popup().setHTML(`<strong>Step ${index}</strong><br/>${step.instruction}`))
            .addTo(map.current!);
        }
      });
    }

    // Fit bounds
    const bounds = new mapboxgl.LngLatBounds();
    bounds.extend([origin.coordinates.lng, origin.coordinates.lat]);
    bounds.extend([destination.coordinates.lng, destination.coordinates.lat]);
    
    map.current.fitBounds(bounds, {
      padding: { top: 80, bottom: 200, left: 50, right: 50 },
    });
  }, [selectedRoute, origin, destination, mapLoaded]);

  const formatDistance = (meters: number) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${Math.round(meters)} m`;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.round(seconds / 60);
    if (mins < 60) return `${mins} min`;
    const hours = Math.floor(mins / 60);
    const remainMins = mins % 60;
    return `${hours}h ${remainMins}m`;
  };

  if (!selectedRoute) return null;

  const badgeVariant = selectedRoute.type === 'safest' ? 'default' : 'secondary';
  const badgeText = selectedRoute.type === 'safest' 
    ? 'High safety' 
    : selectedRoute.type === 'fastest' 
      ? 'Shortest time' 
      : 'High comfort';

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Map section */}
      <div ref={mapContainer} className="h-[55%] relative">
        {/* Top buttons */}
        <button 
          onClick={onBack} 
          className="absolute top-4 left-4 w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center z-10 hover:bg-gray-50"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="absolute top-4 right-4 flex gap-2 z-10">
          <button 
            onClick={() => {
              setIsSaved(!isSaved);
              if (!isSaved) {
                // Show saved feedback
                const toast = document.createElement('div');
                toast.className = 'fixed bottom-20 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm z-50';
                toast.textContent = 'Route saved to favorites';
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 2000);
              }
            }}
            className={`w-10 h-10 rounded-full shadow-md flex items-center justify-center ${
              isSaved ? 'bg-red-500 text-white' : 'bg-white'
            }`}
          >
            <Heart className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
          </button>
          <button 
            onClick={async () => {
              const shareData = {
                title: `${selectedRoute?.title} - SafeRoute`,
                text: `Check out this ${selectedRoute?.title?.toLowerCase()} from ${origin?.name} to ${destination?.name}. ${Math.round((selectedRoute?.duration || 0) / 60)} min walk.`,
                url: window.location.href
              };
              
              if (navigator.share) {
                try {
                  await navigator.share(shareData);
                } catch (err) {
                  console.log('Share cancelled');
                }
              } else {
                // Fallback: copy to clipboard
                await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
                const toast = document.createElement('div');
                toast.className = 'fixed bottom-20 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm z-50';
                toast.textContent = 'Link copied to clipboard';
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 2000);
              }
            }}
            className="w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-gray-50"
          >
            <Share2 className="w-5 h-5" />
          </button>
          <DropdownMenu
            trigger={
              <button className="w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-gray-50">
                <MoreVertical className="w-5 h-5" />
              </button>
            }
          >
            <DropdownItem 
              icon={<Copy className="w-4 h-4" />}
              onClick={async () => {
                const directions = selectedRoute?.steps.map(s => s.instruction).join('\n') || '';
                await navigator.clipboard.writeText(directions);
                const toast = document.createElement('div');
                toast.className = 'fixed bottom-20 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm z-50';
                toast.textContent = 'Directions copied';
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 2000);
              }}
            >
              Copy directions
            </DropdownItem>
            <DropdownItem 
              icon={<Download className="w-4 h-4" />}
              onClick={() => {
                const directions = `Route: ${selectedRoute?.title}\nFrom: ${origin?.name}\nTo: ${destination?.name}\nDistance: ${selectedRoute?.distance}m\nDuration: ${Math.round((selectedRoute?.duration || 0) / 60)} min\n\nDirections:\n${selectedRoute?.steps.map((s, i) => `${i + 1}. ${s.instruction}`).join('\n')}`;
                const blob = new Blob([directions], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'route-directions.txt';
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Download directions
            </DropdownItem>
            <DropdownDivider />
            <DropdownItem 
              icon={<Flag className="w-4 h-4" />}
              onClick={() => {
                const toast = document.createElement('div');
                toast.className = 'fixed bottom-20 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm z-50';
                toast.textContent = '✓ Route reported. Thank you for helping improve SafeRoute!';
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 3000);
              }}
              danger
            >
              Report route issue
            </DropdownItem>
          </DropdownMenu>
        </div>
      </div>

      {/* Bottom sheet */}
      <div className="flex-1 bg-white rounded-t-3xl -mt-6 relative overflow-y-auto shadow-lg">
        <div className="px-5 py-4 space-y-4">
          {/* Handle bar */}
          <div className="flex justify-center">
            <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
          </div>

          {/* Summary */}
          <div className="flex items-start justify-between">
            <div>
              <div className="text-lg font-semibold">{selectedRoute.title}</div>
              <div className="text-gray-600">
                {formatDuration(selectedRoute.duration)} · {formatDistance(selectedRoute.distance)}
              </div>
            </div>
            <Badge variant={badgeVariant}>{badgeText}</Badge>
          </div>

          {/* Tags */}
          {selectedRoute.tags && selectedRoute.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedRoute.nightFriendly && (
                <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                  <Moon className="w-3 h-3" />
                  Night friendly
                </span>
              )}
              {selectedRoute.tags.map((tag, i) => (
                <span 
                  key={i}
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    tag.includes('safety') || tag.includes('lit') 
                      ? 'bg-green-100 text-green-700'
                      : tag.includes('comfort') || tag.includes('Shaded')
                      ? 'bg-purple-100 text-purple-700'
                      : tag.includes('Fast')
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Mode chips */}
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
            {routes.map((route) => {
              const typeLabels: Record<string, string> = {
                fastest: 'Fastest',
                safest: 'Safest', 
                comfortable: 'Comfortable',
                scenic: 'Scenic'
              };
              return (
                <button 
                  key={route.id}
                  onClick={() => selectRoute(route)}
                  className={`px-4 py-2 rounded-full whitespace-nowrap border transition-colors ${
                    selectedRoute.id === route.id 
                      ? 'bg-blue-600 text-white border-blue-600' 
                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                  }`}
                >
                  {typeLabels[route.type] || route.type}
                </button>
              );
            })}
          </div>

          {/* Safety section with visual indicators */}
          <div>
            <div className="flex items-center gap-2 font-medium mb-3">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Safety Info
            </div>
            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                {selectedRoute.safety.lightingLevel === 'well-lit' ? (
                  <Sun className="w-5 h-5 text-yellow-500 mt-0.5" />
                ) : (
                  <Moon className="w-5 h-5 text-gray-400 mt-0.5" />
                )}
                <div>
                  <div className="font-medium text-sm">{selectedRoute.safety.lighting}</div>
                  <div className="text-xs text-gray-500">
                    {selectedRoute.safety.lightingLevel === 'well-lit' 
                      ? 'Good visibility at night' 
                      : 'Consider daytime walking'}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Crosshair className="w-5 h-5 text-blue-500 mt-0.5" />
                <div>
                  <div className="font-medium text-sm">{selectedRoute.safety.crossings}</div>
                  <div className="text-xs text-gray-500">
                    {selectedRoute.safety.busyRoads} busy road{selectedRoute.safety.busyRoads !== 1 ? 's' : ''} to cross
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Footprints className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <div className="font-medium text-sm">{selectedRoute.safety.sidewalks}</div>
                  <div className="text-xs text-gray-500">
                    {selectedRoute.safety.sidewalkCoverage === 'continuous' 
                      ? 'Safe walking surface throughout' 
                      : 'Some sections may require caution'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Comfort section with visual indicators */}
          <div>
            <div className="flex items-center gap-2 font-medium mb-3">
              <TreePine className="w-4 h-4 text-green-500" />
              Comfort Info
            </div>
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                <MountainSnow className="w-5 h-5 text-gray-500 mt-0.5" />
                <div>
                  <div className="font-medium text-sm">{selectedRoute.comfort.hills}</div>
                  <div className="text-xs text-gray-500">
                    {selectedRoute.comfort.hillLevel === 'flat' 
                      ? 'Easy walk for all fitness levels' 
                      : 'May require some effort'}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <TreePine className="w-5 h-5 text-green-500 mt-0.5" />
                <div className="flex-1">
                  <div className="font-medium text-sm">{selectedRoute.comfort.shade}</div>
                  {/* Shade progress bar */}
                  <div className="mt-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-400 rounded-full" 
                      style={{ width: `${selectedRoute.comfort.shadePercent}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Coffee className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <div className="font-medium text-sm">{selectedRoute.comfort.restSpots}</div>
                  <div className="text-xs text-gray-500">
                    {selectedRoute.comfort.restSpotTypes?.join(', ') || 'Rest options available'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Route timeline preview */}
          <div>
            <div className="font-medium mb-3">Route overview</div>
            <div className="relative bg-gray-50 rounded-xl p-4">
              <div className="absolute top-8 left-4 right-4 h-1 bg-gray-200 rounded"></div>
              <div className="relative flex justify-between">
                {['Start', 
                  selectedRoute.safety.lightingLevel === 'well-lit' ? '☀️ Lit' : '🌙 Mixed',
                  `${selectedRoute.safety.crossingCount} crossings`,
                  selectedRoute.comfort.restSpotCount > 0 ? `☕ ${selectedRoute.comfort.restSpotCount} stops` : '→',
                  'End'
                ].map((label, i, arr) => (
                  <div key={i} className="flex flex-col items-center z-10" style={{ width: `${100/arr.length}%` }}>
                    <div className={`w-4 h-4 rounded-full mb-2 ${
                      i === 0 ? 'bg-red-500' : i === arr.length - 1 ? 'bg-green-500' : 'bg-blue-500'
                    }`}></div>
                    <div className="text-center text-xs text-gray-600">{label}</div>
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
            <Button 
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={onStartNavigation}
            >
              Start walking
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
