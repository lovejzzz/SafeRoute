import { useEffect, useRef, useState } from 'react';
import { MoreVertical, Car, User, Bike, Loader2, Settings, Info, MapPin, RotateCcw, ArrowUpDown, Sun, Cloud, CloudRain, Snowflake } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import RouteCard from './RouteCard';
import LocationSearch from './LocationSearch';
import { DropdownMenu, DropdownItem, DropdownDivider } from './ui/dropdown-menu';
import { useRoute, TransportMode } from '../context/RouteContext';
import { useWeather } from '../context/WeatherContext';

interface RoutesListProps {
  onRouteSelect: (route: 'fastest' | 'safest' | 'comfortable' | 'scenic') => void;
}

export default function RoutesList({ onRouteSelect }: RoutesListProps) {
  const {
    origin,
    destination,
    routes,
    transportMode,
    isLoading,
    error,
    mapboxToken,
    setOrigin,
    setDestination,
    setTransportMode,
    fetchRoutes,
    getCurrentLocation,
    clearAll,
  } = useRoute();
  
  const { weather, timeContext, alerts } = useWeather();
  
  const [routePreference, setRoutePreference] = useState<'safe' | 'fast' | 'comfy'>(() => {
    return (localStorage.getItem('routePreference') as 'safe' | 'fast' | 'comfy') || 'safe';
  });

  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Auto-get current location on mount if origin is not set
  useEffect(() => {
    if (!origin) {
      getCurrentLocation().then((location) => {
        if (location) {
          setOrigin(location);
        }
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = mapboxToken;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-73.9965, 40.7295], // NYC default
      zoom: 13,
      attributionControl: false,
    });

    map.current.on('load', () => {
      setMapLoaded(true);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [mapboxToken]);

  // Update map with routes
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Remove existing layers and sources
    ['route-fastest', 'route-safest', 'route-comfortable'].forEach(id => {
      if (map.current?.getLayer(id)) map.current.removeLayer(id);
      if (map.current?.getSource(id)) map.current.removeSource(id);
    });

    // Remove existing markers
    const existingMarkers = document.querySelectorAll('.mapboxgl-marker');
    existingMarkers.forEach(marker => marker.remove());

    if (routes.length > 0 && origin && destination) {
      // Add route lines
      const colors: Record<string, string> = {
        fastest: '#3B82F6',
        safest: '#10B981',
        comfortable: '#8B5CF6',
        scenic: '#F59E0B',
      };

      routes.forEach(route => {
        if (!map.current) return;
        
        map.current.addSource(`route-${route.type}`, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: route.geometry,
          },
        });

        map.current.addLayer({
          id: `route-${route.type}`,
          type: 'line',
          source: `route-${route.type}`,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': colors[route.type],
            'line-width': route.type === 'safest' ? 5 : 3,
            'line-opacity': route.type === 'safest' ? 1 : 0.6,
          },
        });
      });

      // Add markers
      new mapboxgl.Marker({ color: '#DC2626' })
        .setLngLat([origin.coordinates.lng, origin.coordinates.lat])
        .addTo(map.current);

      new mapboxgl.Marker({ color: '#059669' })
        .setLngLat([destination.coordinates.lng, destination.coordinates.lat])
        .addTo(map.current);

      // Fit bounds
      const bounds = new mapboxgl.LngLatBounds();
      bounds.extend([origin.coordinates.lng, origin.coordinates.lat]);
      bounds.extend([destination.coordinates.lng, destination.coordinates.lat]);
      
      map.current.fitBounds(bounds, {
        padding: { top: 50, bottom: 50, left: 50, right: 50 },
      });
    }
  }, [routes, origin, destination, mapLoaded]);

  // Fetch routes when origin/destination changes
  useEffect(() => {
    if (origin && destination) {
      fetchRoutes(transportMode);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin?.coordinates.lat, origin?.coordinates.lng, destination?.coordinates.lat, destination?.coordinates.lng]);

  const handleModeChange = (mode: TransportMode) => {
    setTransportMode(mode);
    // Immediately fetch with the new mode
    if (origin && destination) {
      fetchRoutes(mode);
    }
  };

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

  // Smart recommendation algorithm using real weather + time data
  const getSmartRecommendation = () => {
    if (routes.length === 0) return null;
    
    // Use real-time context
    const isDark = timeContext.isDark;
    const isRushHour = timeContext.isRushHour;
    const isWeekend = timeContext.isWeekend;
    const currentTimeOfDay = timeContext.timeOfDay;
    
    // Use real weather data if available
    const isRaining = weather?.current.condition === 'rain' || 
                      weather?.current.condition === 'drizzle' ||
                      weather?.current.condition === 'thunderstorm';
    const isSnowing = weather?.current.condition === 'snow';
    const isHotWeather = weather ? weather.current.temp > 85 : 
                         (new Date().getMonth() >= 5 && new Date().getMonth() <= 8);
    const isColdWeather = weather ? weather.current.temp < 40 : false;
    const isWindy = weather ? weather.current.windSpeed > 15 : false;
    const hasWeatherAlerts = alerts.length > 0;
    const isMidDay = currentTimeOfDay === 'midday';
    const isLateNight = currentTimeOfDay === 'late-night';
    
    // Score each route
    const scoredRoutes = routes.map(route => {
      let score = 0;
      let reasons: string[] = [];
      
      // User preference weight (base score)
      const prefMap = { safe: 'safest', fast: 'fastest', comfy: 'comfortable' };
      if (route.type === prefMap[routePreference]) {
        score += 30;
        reasons.push('matches your preference');
      }
      
      // WEATHER-BASED SCORING (real-time data)
      
      // Rain/Snow: prioritize covered routes, penalize steep slopes
      if (isRaining || isSnowing) {
        // Prefer routes with more rest spots (shelter opportunities)
        score += route.comfort.restSpotCount * 10;
        if (route.comfort.restSpotCount >= 2) {
          reasons.push('has shelter spots');
        }
        // Prefer safer routes (less slippery conditions)
        if (route.safety.sidewalkCoverage === 'continuous') {
          score += 20;
          reasons.push('continuous sidewalks');
        }
        // Penalize fastest route (usually more exposed)
        if (route.type === 'fastest') {
          score -= 15;
        }
      }
      
      // Hot weather: prioritize shaded routes with rest spots
      if (isHotWeather) {
        const shadeScore = route.comfort.shadePercent || 0;
        score += shadeScore * 0.4; // Max +40 for 100% shade
        if (shadeScore >= 60) {
          reasons.push('good shade coverage');
        }
        // Bonus for rest spots (hydration/breaks)
        if (route.comfort.restSpotCount >= 2) {
          score += 20;
          reasons.push('rest stops available');
        }
        // Penalize longer routes in heat
        if (route.type === 'comfortable' || route.type === 'scenic') {
          score += 15; // Actually boost comfortable routes
        }
      }
      
      // Cold weather: prefer shorter, faster routes
      if (isColdWeather) {
        if (route.type === 'fastest') {
          score += 25;
          reasons.push('shorter exposure time');
        }
        // Penalize long scenic routes
        if (route.type === 'scenic') {
          score -= 10;
        }
      }
      
      // Windy: prefer sheltered routes
      if (isWindy) {
        // Comfortable routes tend to have more building cover
        if (route.type === 'comfortable') {
          score += 15;
          reasons.push('wind-protected');
        }
        // Scenic/open routes are more exposed
        if (route.type === 'scenic') {
          score -= 10;
        }
      }
      
      // TIME-BASED SCORING (real-time)
      
      // Dark hours: prioritize well-lit routes
      if (isDark) {
        if (route.safety.lightingLevel === 'well-lit') {
          score += 45;
          reasons.push('well-lit for dark hours');
        } else if (route.safety.lightingLevel === 'mixed') {
          score += 10;
        } else {
          score -= 20; // Penalize dark routes at night
        }
        if (route.nightFriendly) {
          score += 30;
          reasons.push('night-friendly');
        }
      }
      
      // Late night (1-5 AM): extra safety priority
      if (isLateNight) {
        if (route.type === 'safest') {
          score += 35;
          reasons.push('safest for late night');
        }
        // Strongly penalize scenic/isolated routes
        if (route.type === 'scenic') {
          score -= 25;
        }
      }
      
      // Rush hour: prefer routes with wider sidewalks
      if (isRushHour) {
        if (route.safety.sidewalkCoverage === 'continuous') {
          score += 20;
          reasons.push('wide sidewalks for rush hour');
        }
        // Penalize routes with many crossings during rush hour
        if (route.safety.crossingCount > 4) {
          score -= 10;
        }
      }
      
      // Midday sun: prioritize shade (especially in summer)
      if (isMidDay && weather && weather.current.temp > 75) {
        score += route.comfort.shadePercent * 0.3;
        if (route.comfort.shadePercent >= 60) {
          reasons.push('shaded for midday sun');
        }
      }
      
      // Weekend: scenic routes more appealing
      if (isWeekend && !isDark && !isRaining && !isColdWeather) {
        if (route.type === 'scenic' || route.type === 'comfortable') {
          score += 15;
          reasons.push('nice for weekend stroll');
        }
      }
      
      // Safety bonuses (always apply)
      if (route.safety.sidewalkCoverage === 'continuous') {
        score += 15;
      }
      if (route.safety.crossingCount <= 3) {
        score += 10;
        reasons.push('fewer crossings');
      }
      
      // Slight penalty for very long routes
      const avgDuration = routes.reduce((a, r) => a + r.duration, 0) / routes.length;
      if (route.duration > avgDuration * 1.3) {
        score -= 10;
      }
      
      return { route, score, reasons };
    });
    
    // Sort by score and get best
    scoredRoutes.sort((a, b) => b.score - a.score);
    const best = scoredRoutes[0];
    
    // Generate recommendation reason based on weather
    let reason = '';
    if (isRaining) {
      reason = '🌧️ Best for rainy weather';
    } else if (isSnowing) {
      reason = '❄️ Safest in snow';
    } else if (isHotWeather && best.reasons.includes('good shade coverage')) {
      reason = `☀️ Best for ${weather?.current.temp}°F heat`;
    } else if (isColdWeather && best.reasons.includes('shorter exposure time')) {
      reason = `🥶 Quickest in ${weather?.current.temp}°F cold`;
    } else if (isWindy && best.reasons.includes('wind-protected')) {
      reason = '💨 Wind-protected route';
    } else if (isDark && best.reasons.includes('well-lit for dark hours')) {
      reason = `🌙 Best for ${timeContext.displayTime} walk`;
    } else if (isLateNight && best.reasons.includes('safest for late night')) {
      reason = '🌙 Safest for late night';
    } else if (isRushHour && best.reasons.includes('wide sidewalks for rush hour')) {
      reason = '🚶 Best for rush hour';
    } else if (isWeekend && best.reasons.includes('nice for weekend stroll')) {
      reason = '🌳 Great for weekend walk';
    } else if (hasWeatherAlerts) {
      reason = `⚠️ ${alerts[0].title}`;
    } else if (best.reasons.includes('matches your preference')) {
      reason = '★ Recommended for you';
    } else if (weather?.current.condition === 'clear' && weather.current.temp >= 60 && weather.current.temp <= 80) {
      reason = '☀️ Great walking weather';
    } else {
      reason = '★ Best overall';
    }
    
    return { routeId: best.route.id, routeType: best.route.type, reason };
  };

  const smartRecommendation = getSmartRecommendation();

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Status bar */}
      <div className="h-11 bg-white"></div>

      {/* Route bar */}
      <div className="bg-white px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-1">
            <MapPin className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1 text-lg font-medium">Plan your route</div>
          <DropdownMenu
            trigger={
              <button className="p-1 hover:bg-gray-100 rounded">
                <MoreVertical className="w-5 h-5" />
              </button>
            }
          >
            <DropdownItem 
              icon={<RotateCcw className="w-4 h-4" />}
              onClick={() => {
                clearAll();
                const toast = document.createElement('div');
                toast.className = 'fixed bottom-20 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm z-50';
                toast.textContent = '✓ All cleared';
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 2000);
              }}
            >
              Clear all
            </DropdownItem>
            <DropdownDivider />
            {/* Route Preference Toggle */}
            <div className="px-3 py-2">
              <div className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                <Settings className="w-3 h-3" />
                Default route type
              </div>
              <div className="flex bg-gray-100 rounded-lg p-0.5 relative">
                {/* Animated background pill */}
                <div 
                  className="absolute top-0.5 bottom-0.5 bg-white rounded-md shadow-sm transition-all duration-200 ease-out"
                  style={{
                    width: 'calc(33.333% - 2px)',
                    left: routePreference === 'safe' ? '2px' : routePreference === 'fast' ? 'calc(33.333% + 1px)' : 'calc(66.666%)'
                  }}
                />
                {(['safe', 'fast', 'comfy'] as const).map((pref) => (
                  <button
                    key={pref}
                    onClick={() => {
                      setRoutePreference(pref);
                      localStorage.setItem('routePreference', pref);
                      // Auto-select the preferred route type if routes exist
                      const routeTypeMap = { safe: 'safest', fast: 'fastest', comfy: 'comfortable' };
                      const targetRoute = routes.find(r => r.type === routeTypeMap[pref]);
                      if (targetRoute) {
                        // Show toast
                        const toast = document.createElement('div');
                        toast.className = 'fixed bottom-20 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm z-50';
                        toast.textContent = `✓ Now showing ${pref === 'safe' ? 'safest' : pref === 'fast' ? 'fastest' : 'most comfortable'} route`;
                        document.body.appendChild(toast);
                        setTimeout(() => toast.remove(), 2000);
                      }
                    }}
                    className={`relative z-10 flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors duration-200 ${
                      routePreference === pref
                        ? 'text-blue-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {pref === 'safe' ? '🛡️ Safe' : pref === 'fast' ? '⚡ Fast' : '😊 Comfy'}
                  </button>
                ))}
              </div>
            </div>
            <DropdownDivider />
            <DropdownItem 
              icon={<Info className="w-4 h-4" />}
              onClick={() => {
                const toast = document.createElement('div');
                toast.className = 'fixed bottom-20 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-4 py-2.5 rounded-lg text-sm z-50 text-center';
                toast.innerHTML = '<strong>SafeRoute v1.0</strong><br/><span class="text-gray-300">Navigate with confidence</span><br/><span class="text-xs text-gray-400 mt-1 block">Made by Tian Xing</span>';
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 3000);
              }}
            >
              About SafeRoute
            </DropdownItem>
          </DropdownMenu>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex-1 space-y-2">
            <LocationSearch
              placeholder="Start location"
              value={origin}
              onChange={setOrigin}
              showCurrentLocation
            />
            <LocationSearch
              placeholder="Destination"
              value={destination}
              onChange={setDestination}
            />
          </div>
          <button
            onClick={() => {
              const temp = origin;
              setOrigin(destination);
              setDestination(temp);
            }}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            title="Swap start & end"
          >
            <ArrowUpDown className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Mode tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex items-center">
          <button 
            onClick={() => handleModeChange('driving-traffic')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 ${
              transportMode === 'driving-traffic' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500'
            }`}
          >
            <Car className="w-5 h-5" />
            <span>Drive</span>
          </button>
          <button 
            onClick={() => handleModeChange('walking')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 ${
              transportMode === 'walking' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500'
            }`}
          >
            <User className="w-5 h-5" />
            <span>Walk</span>
          </button>
          <button 
            onClick={() => handleModeChange('cycling')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 ${
              transportMode === 'cycling' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500'
            }`}
          >
            <Bike className="w-5 h-5" />
            <span>Bike</span>
          </button>
        </div>
      </div>

      {/* Map */}
      <div ref={mapContainer} className="h-40 bg-gray-200 relative">
        {!mapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
          </div>
        )}
      </div>

      {/* Weather & traffic info bar */}
      <div className="bg-gray-100 px-4 py-2 text-sm text-gray-600 flex items-center gap-1">
        {weather?.current.condition === 'rain' || weather?.current.condition === 'drizzle' ? (
          <CloudRain className="w-4 h-4" />
        ) : weather?.current.condition === 'snow' ? (
          <Snowflake className="w-4 h-4" />
        ) : weather?.current.condition === 'clouds' ? (
          <Cloud className="w-4 h-4" />
        ) : (
          <Sun className="w-4 h-4" />
        )}
        <span>{weather ? `${Math.round(weather.current.temp)}°F` : '72°F'}</span>
        <span> in </span>
        <span>{(() => {
          // Try to get city from origin or destination
          const loc = origin || destination;
          if (!loc) return 'New York City';
          // If name is "Current Location", extract city from address
          if (loc.name === 'Current Location' && loc.address) {
            const parts = loc.address.split(',');
            // Usually address format is "Street, City, State, Country" - get the city part
            return parts.length >= 2 ? parts[1]?.trim() : parts[0]?.trim();
          }
          return loc.name?.split(',')[0] || 'New York City';
        })()}</span>
        <span className="text-gray-400"> · </span>
        <span>{timeContext.isRushHour ? 'Rush hour, busier sidewalks' : timeContext.timeOfDay === 'late-night' ? 'Late night, quieter streets' : 'Normal traffic'}</span>
      </div>

      {/* Route cards */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin mr-2" />
            <span className="text-gray-600">Finding best routes...</span>
          </div>
        )}

        {error && (
          <div className={`p-3 rounded-lg text-center text-sm ${
            error.startsWith('Note:') 
              ? 'bg-amber-50 text-amber-700' 
              : 'bg-red-50 text-red-600'
          }`}>
            {error}
          </div>
        )}

        {!isLoading && routes.length === 0 && !error?.startsWith('Note:') && (
          <div className="text-center text-gray-500 py-8">
            Enter start and destination to see routes
          </div>
        )}

        {!isLoading && [...routes]
          .sort((a, b) => {
            // Put recommended route first
            if (smartRecommendation?.routeId === a.id) return -1;
            if (smartRecommendation?.routeId === b.id) return 1;
            return 0;
          })
          .map((route) => {
            const isRecommended = smartRecommendation?.routeId === route.id;
            return (
              <RouteCard
                key={route.id}
                route={route.type}
                title={route.title}
                time={formatDuration(route.duration)}
                details={`${formatDistance(route.distance)} · ${route.safety.crossings}`}
                nightFriendly={route.nightFriendly}
                safety={{
                  lightingLevel: route.safety.lightingLevel,
                  crossingCount: route.safety.crossingCount,
                  sidewalkCoverage: route.safety.sidewalkCoverage,
                }}
                comfort={{
                  shadePercent: route.comfort.shadePercent,
                  restSpotCount: route.comfort.restSpotCount,
                }}
                recommended={isRecommended}
                recommendationReason={isRecommended ? smartRecommendation?.reason : undefined}
                onClick={() => onRouteSelect(route.type)}
              />
            );
          })}

        {routes.length > 0 && (
          <div className="text-center text-gray-500 py-4 text-sm">
            {transportMode === 'driving-traffic' 
              ? 'Tap a route to see driving details'
              : transportMode === 'cycling'
                ? 'Tap a route to see cycling-friendly details'
                : 'Tap a route to see walking-friendly details'}
          </div>
        )}
      </div>
    </div>
  );
}
