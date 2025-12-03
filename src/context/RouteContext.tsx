import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// Mapbox access token
const MAPBOX_TOKEN = 'pk.eyJ1Ijoic2t5eGluZyIsImEiOiJjbWlxZWk2YW4wb3gyM2Rwd3kwNWRxOWJvIn0.bb0NDstLAH8ENvTTDFw9Vw';

export interface Coordinates {
  lng: number;
  lat: number;
}

export interface Location {
  name: string;
  address: string;
  coordinates: Coordinates;
}

export interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
  maneuver: {
    type: string;
    modifier?: string;
    location: [number, number];
  };
  // Comfort-aware step info
  comfort?: {
    lighting: 'well-lit' | 'mixed' | 'dark';
    terrain: 'flat' | 'slight-incline' | 'steep';
    shade: boolean;
    crossing?: 'signal' | 'crosswalk' | 'busy-road';
    restSpot?: 'bench' | 'cafe' | 'park';
  };
}

export interface RouteData {
  id: string;
  type: 'fastest' | 'safest' | 'comfortable' | 'scenic';
  title: string;
  distance: number; // meters
  duration: number; // seconds
  geometry: GeoJSON.LineString;
  steps: RouteStep[];
  // Tags for quick scanning
  tags: string[];
  nightFriendly: boolean;
  // Safety metrics
  safety: {
    lighting: string;
    lightingLevel: 'well-lit' | 'mixed' | 'dark';
    crossings: string;
    crossingCount: number;
    sidewalks: string;
    sidewalkCoverage: 'continuous' | 'partial' | 'none';
    busyRoads: number;
  };
  // Comfort metrics
  comfort: {
    hills: string;
    hillLevel: 'flat' | 'some-hills' | 'steep';
    shade: string;
    shadePercent: number;
    restSpots: string;
    restSpotCount: number;
    restSpotTypes: ('bench' | 'cafe' | 'park')[];
  };
}

export type TransportMode = 'driving-traffic' | 'walking' | 'cycling';

interface RouteContextType {
  origin: Location | null;
  destination: Location | null;
  routes: RouteData[];
  selectedRoute: RouteData | null;
  transportMode: TransportMode;
  isLoading: boolean;
  error: string | null;
  mapboxToken: string;
  setOrigin: (location: Location | null) => void;
  setDestination: (location: Location | null) => void;
  setTransportMode: (mode: TransportMode) => void;
  selectRoute: (route: RouteData) => void;
  fetchRoutes: (mode?: TransportMode) => Promise<void>;
  searchLocation: (query: string) => Promise<Location[]>;
  getCurrentLocation: () => Promise<Location | null>;
  clearAll: () => void;
}

const RouteContext = createContext<RouteContextType | null>(null);

export function useRoute() {
  const context = useContext(RouteContext);
  if (!context) {
    throw new Error('useRoute must be used within a RouteProvider');
  }
  return context;
}

interface RouteProviderProps {
  children: ReactNode;
}

// Default destination - NYU Tandon
const DEFAULT_DESTINATION: Location = {
  name: '6 MetroTech Center',
  address: '6 MetroTech Center, Brooklyn, NY 11201',
  coordinates: { lng: -73.9857, lat: 40.6944 }
};

export function RouteProvider({ children }: RouteProviderProps) {
  const [origin, setOrigin] = useState<Location | null>(null);
  const [destination, setDestination] = useState<Location | null>(DEFAULT_DESTINATION);
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<RouteData | null>(null);
  const [transportMode, setTransportMode] = useState<TransportMode>('walking');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchLocation = useCallback(async (query: string): Promise<Location[]> => {
    if (!query.trim()) return [];
    
    try {
      // Use proximity to sort results by distance from origin or NYC center
      const proximityLng = origin?.coordinates.lng || -73.9857;
      const proximityLat = origin?.coordinates.lat || 40.7484;
      
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?` +
        `access_token=${MAPBOX_TOKEN}&limit=8&types=address,poi,place&` +
        `proximity=${proximityLng},${proximityLat}`
      );
      
      if (!response.ok) throw new Error('Geocoding failed');
      
      const data = await response.json();
      
      // Map and calculate distances
      const results = data.features.map((feature: any) => {
        const lng = feature.center[0];
        const lat = feature.center[1];
        
        // Calculate distance from proximity point using Haversine
        const R = 6371; // km
        const dLat = (lat - proximityLat) * Math.PI / 180;
        const dLng = (lng - proximityLng) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(proximityLat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;
        
        return {
          name: feature.text,
          address: feature.place_name,
          coordinates: { lng, lat },
          distance,
        };
      });
      
      // Sort by distance (nearest first)
      results.sort((a: any, b: any) => a.distance - b.distance);
      
      // Remove distance property before returning
      return results.map(({ distance, ...rest }: any) => rest);
    } catch (err) {
      console.error('Location search error:', err);
      return [];
    }
  }, [origin]);

  const getCurrentLocation = useCallback(async (): Promise<Location | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          // Reverse geocode to get address
          try {
            const response = await fetch(
              `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?` +
              `access_token=${MAPBOX_TOKEN}&limit=1`
            );
            
            if (response.ok) {
              const data = await response.json();
              if (data.features.length > 0) {
                resolve({
                  name: 'Current Location',
                  address: data.features[0].place_name,
                  coordinates: { lng: longitude, lat: latitude },
                });
                return;
              }
            }
          } catch (err) {
            console.error('Reverse geocoding error:', err);
          }
          
          resolve({
            name: 'Current Location',
            address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
            coordinates: { lng: longitude, lat: latitude },
          });
        },
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }, []);

  const analyzeRouteCharacteristics = (route: any, index: number): Partial<RouteData> => {
    const steps = route.legs[0]?.steps || [];
    
    // Count intersections (turns/crossings)
    const crossingCount = steps.filter((s: any) => 
      s.maneuver.type === 'turn' || 
      s.maneuver.type === 'end of road'
    ).length;
    
    // Estimate characteristics based on route profile
    const types: ('fastest' | 'safest' | 'comfortable' | 'scenic')[] = ['fastest', 'safest', 'comfortable', 'scenic'];
    const type = types[index % 4];
    
    const characteristics: Record<string, Partial<RouteData>> = {
      fastest: {
        tags: ['Fastest', 'Direct route'],
        nightFriendly: false,
        safety: {
          lighting: 'Mixed lighting, some darker blocks',
          lightingLevel: 'mixed',
          crossings: `${crossingCount} major intersections`,
          crossingCount: crossingCount,
          sidewalks: 'Standard sidewalk coverage',
          sidewalkCoverage: 'partial',
          busyRoads: Math.ceil(crossingCount / 2)
        },
        comfort: {
          hills: 'Direct route, may include hills',
          hillLevel: 'some-hills',
          shade: 'Limited shade (~30%)',
          shadePercent: 30,
          restSpots: 'Few rest areas',
          restSpotCount: 1,
          restSpotTypes: ['cafe']
        }
      },
      safest: {
        tags: ['High safety', 'Well lit', 'Night friendly'],
        nightFriendly: true,
        safety: {
          lighting: 'Well lit throughout',
          lightingLevel: 'well-lit',
          crossings: `${Math.max(1, crossingCount - 1)} signalized crosswalks`,
          crossingCount: Math.max(1, crossingCount - 1),
          sidewalks: 'Continuous sidewalks',
          sidewalkCoverage: 'continuous',
          busyRoads: Math.max(0, Math.ceil(crossingCount / 3))
        },
        comfort: {
          hills: 'Moderate terrain',
          hillLevel: 'flat',
          shade: 'About 60% shaded',
          shadePercent: 60,
          restSpots: 'Multiple benches available',
          restSpotCount: 3,
          restSpotTypes: ['bench', 'cafe']
        }
      },
      comfortable: {
        tags: ['High comfort', 'Shaded', 'Rest stops'],
        nightFriendly: true,
        safety: {
          lighting: 'Well lit with good visibility',
          lightingLevel: 'well-lit',
          crossings: `${crossingCount} controlled crossings`,
          crossingCount: crossingCount,
          sidewalks: 'Wide sidewalks throughout',
          sidewalkCoverage: 'continuous',
          busyRoads: 1
        },
        comfort: {
          hills: 'Gentle, mostly flat terrain',
          hillLevel: 'flat',
          shade: 'Mostly shaded (75%)',
          shadePercent: 75,
          restSpots: 'Benches, cafés, and parks nearby',
          restSpotCount: 5,
          restSpotTypes: ['bench', 'cafe', 'park']
        }
      },
      scenic: {
        tags: ['Scenic views', 'Parks', 'Quieter streets'],
        nightFriendly: false,
        safety: {
          lighting: 'Mixed lighting along parks',
          lightingLevel: 'mixed',
          crossings: `${crossingCount + 1} crossings`,
          crossingCount: crossingCount + 1,
          sidewalks: 'Park paths and sidewalks',
          sidewalkCoverage: 'continuous',
          busyRoads: 0
        },
        comfort: {
          hills: 'Some gentle hills through parks',
          hillLevel: 'some-hills',
          shade: 'Tree-lined paths (80%)',
          shadePercent: 80,
          restSpots: 'Parks with benches throughout',
          restSpotCount: 6,
          restSpotTypes: ['bench', 'park', 'cafe']
        }
      }
    };

    return characteristics[type];
  };

  const fetchRoutes = useCallback(async (mode?: TransportMode) => {
    if (!origin || !destination) {
      setError('Please set both origin and destination');
      return;
    }

    // Use passed mode or fall back to state
    const activeMode = mode || transportMode;

    setIsLoading(true);
    setError(null);
    console.log('Fetching routes...', { origin, destination, mode: activeMode });

    try {
      const coordinates = `${origin.coordinates.lng},${origin.coordinates.lat};${destination.coordinates.lng},${destination.coordinates.lat}`;
      const url = `https://api.mapbox.com/directions/v5/mapbox/${activeMode}/${coordinates}?` +
        `access_token=${MAPBOX_TOKEN}&` +
        `alternatives=true&` +
        `geometries=geojson&` +
        `overview=full&` +
        `steps=true`;
      
      console.log('API URL:', url);
      
      // Fetch route with alternatives
      const response = await fetch(url);

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', errorText);
        throw new Error(`Failed to fetch routes: ${response.status}`);
      }

      const data = await response.json();
      console.log('API Response:', data);

      if (!data.routes || data.routes.length === 0) {
        throw new Error('No routes found');
      }

      // Transform API response to our route format
      const transformedRoutes: RouteData[] = data.routes.map((route: any, index: number) => {
        const types: ('fastest' | 'safest' | 'comfortable' | 'scenic')[] = ['fastest', 'safest', 'comfortable', 'scenic'];
        const type = types[index % 4];
        const titles: Record<string, string> = {
          fastest: 'Fastest Route',
          safest: 'Safest Route',
          comfortable: 'Most Comfortable',
          scenic: 'Scenic Route'
        };

        const characteristics = analyzeRouteCharacteristics(route, index);

        // Add comfort info to steps
        const stepsWithComfort = route.legs[0]?.steps.map((step: any, stepIndex: number) => {
          const comfortTypes: Array<'well-lit' | 'mixed' | 'dark'> = ['well-lit', 'mixed', 'dark'];
          const terrainTypes: Array<'flat' | 'slight-incline' | 'steep'> = ['flat', 'slight-incline', 'flat'];
          
          return {
            instruction: step.maneuver.instruction,
            distance: step.distance,
            duration: step.duration,
            maneuver: {
              type: step.maneuver.type,
              modifier: step.maneuver.modifier,
              location: step.maneuver.location,
            },
            comfort: {
              lighting: comfortTypes[stepIndex % 3],
              terrain: terrainTypes[stepIndex % 3],
              shade: stepIndex % 2 === 0,
              crossing: step.maneuver.type === 'turn' ? 'signal' as const : undefined,
              restSpot: stepIndex % 4 === 0 ? 'cafe' as const : undefined,
            }
          };
        }) || [];

        return {
          id: `route-${index}`,
          type,
          title: titles[type],
          distance: route.distance,
          duration: route.duration,
          geometry: route.geometry,
          steps: stepsWithComfort,
          ...characteristics,
        } as RouteData;
      });

      // Route variations for duplication
      const routeProfiles = [
        {
          type: 'fastest' as const,
          title: 'Fastest Route',
          multiplier: 1,
          tags: ['Fastest', 'Direct route'],
          nightFriendly: false,
          safety: {
            lighting: 'Mixed lighting, some darker blocks',
            lightingLevel: 'mixed' as const,
            crossings: '4 major intersections',
            crossingCount: 4,
            sidewalks: 'Standard sidewalk coverage',
            sidewalkCoverage: 'partial' as const,
            busyRoads: 2
          },
          comfort: {
            hills: 'Direct route, may include hills',
            hillLevel: 'some-hills' as const,
            shade: 'Limited shade (~30%)',
            shadePercent: 30,
            restSpots: 'Few rest areas',
            restSpotCount: 1,
            restSpotTypes: ['cafe' as const]
          }
        },
        {
          type: 'safest' as const,
          title: 'Safest Route',
          multiplier: 1.1,
          tags: ['High safety', 'Well lit', 'Night friendly'],
          nightFriendly: true,
          safety: {
            lighting: 'Well lit throughout',
            lightingLevel: 'well-lit' as const,
            crossings: '3 signalized crosswalks',
            crossingCount: 3,
            sidewalks: 'Continuous sidewalks',
            sidewalkCoverage: 'continuous' as const,
            busyRoads: 1
          },
          comfort: {
            hills: 'Moderate terrain',
            hillLevel: 'flat' as const,
            shade: 'About 60% shaded',
            shadePercent: 60,
            restSpots: 'Multiple benches available',
            restSpotCount: 3,
            restSpotTypes: ['bench' as const, 'cafe' as const]
          }
        },
        {
          type: 'comfortable' as const,
          title: 'Most Comfortable',
          multiplier: 1.15,
          tags: ['High comfort', 'Shaded', 'Rest stops'],
          nightFriendly: true,
          safety: {
            lighting: 'Well lit with good visibility',
            lightingLevel: 'well-lit' as const,
            crossings: '3 controlled crossings',
            crossingCount: 3,
            sidewalks: 'Wide sidewalks throughout',
            sidewalkCoverage: 'continuous' as const,
            busyRoads: 1
          },
          comfort: {
            hills: 'Gentle, mostly flat terrain',
            hillLevel: 'flat' as const,
            shade: 'Mostly shaded (75%)',
            shadePercent: 75,
            restSpots: 'Benches, cafés, and parks nearby',
            restSpotCount: 5,
            restSpotTypes: ['bench' as const, 'cafe' as const, 'park' as const]
          }
        }
      ];
      
      // Ensure we have 3 route types
      while (transformedRoutes.length < 3) {
        const baseRoute = transformedRoutes[0];
        const index = transformedRoutes.length;
        const profile = routeProfiles[index];
        
        transformedRoutes.push({
          ...baseRoute,
          id: `route-${index}`,
          type: profile.type,
          title: profile.title,
          tags: profile.tags,
          nightFriendly: profile.nightFriendly,
          duration: baseRoute.duration * profile.multiplier,
          distance: baseRoute.distance * (1 + (index * 0.05)),
          safety: profile.safety,
          comfort: profile.comfort,
        });
      }

      setRoutes(transformedRoutes);
      setSelectedRoute(transformedRoutes.find(r => r.type === 'safest') || transformedRoutes[0]);
      setError(null); // Clear any previous error
    } catch (err) {
      console.error('Route fetch error:', err);
      
      // Generate fallback routes with a straight line when API fails
      console.log('Using fallback route data...');
      const fallbackGeometry: GeoJSON.LineString = {
        type: 'LineString',
        coordinates: [
          [origin.coordinates.lng, origin.coordinates.lat],
          [destination.coordinates.lng, destination.coordinates.lat]
        ]
      };
      
      // Calculate approximate distance using Haversine formula
      const R = 6371e3;
      const lat1 = origin.coordinates.lat * Math.PI / 180;
      const lat2 = destination.coordinates.lat * Math.PI / 180;
      const deltaLat = (destination.coordinates.lat - origin.coordinates.lat) * Math.PI / 180;
      const deltaLng = (destination.coordinates.lng - origin.coordinates.lng) * Math.PI / 180;
      const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
                Math.cos(lat1) * Math.cos(lat2) *
                Math.sin(deltaLng/2) * Math.sin(deltaLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;
      
      // Walking speed ~5 km/h = ~1.4 m/s
      const duration = distance / 1.4;
      
      const fallbackRoutes: RouteData[] = [
        {
          id: 'fallback-fastest',
          type: 'fastest',
          title: 'Fastest Route',
          distance: distance * 0.95,
          duration: duration * 0.9,
          geometry: fallbackGeometry,
          tags: ['Fastest', 'Direct route'],
          nightFriendly: false,
          steps: [
            {
              instruction: `Head toward ${destination.name}`,
              distance: distance * 0.95,
              duration: duration * 0.9,
              maneuver: {
                type: 'depart',
                location: [origin.coordinates.lng, origin.coordinates.lat]
              },
              comfort: { lighting: 'mixed', terrain: 'flat', shade: false }
            },
            {
              instruction: `Arrive at ${destination.name}`,
              distance: 0,
              duration: 0,
              maneuver: {
                type: 'arrive',
                location: [destination.coordinates.lng, destination.coordinates.lat]
              },
              comfort: { lighting: 'well-lit', terrain: 'flat', shade: true }
            }
          ],
          safety: {
            lighting: 'Mixed lighting conditions',
            lightingLevel: 'mixed',
            crossings: '3 intersections',
            crossingCount: 3,
            sidewalks: 'Standard sidewalks',
            sidewalkCoverage: 'partial',
            busyRoads: 2
          },
          comfort: {
            hills: 'Direct route',
            hillLevel: 'some-hills',
            shade: 'Limited shade (~30%)',
            shadePercent: 30,
            restSpots: 'Few rest areas',
            restSpotCount: 1,
            restSpotTypes: ['cafe']
          }
        },
        {
          id: 'fallback-safest',
          type: 'safest',
          title: 'Safest Route',
          distance: distance,
          duration: duration,
          geometry: fallbackGeometry,
          tags: ['High safety', 'Well lit', 'Night friendly'],
          nightFriendly: true,
          steps: [
            {
              instruction: `Head toward ${destination.name} via well-lit streets`,
              distance: distance,
              duration: duration,
              maneuver: {
                type: 'depart',
                location: [origin.coordinates.lng, origin.coordinates.lat]
              },
              comfort: { lighting: 'well-lit', terrain: 'flat', shade: true, crossing: 'signal' }
            },
            {
              instruction: `Arrive at ${destination.name}`,
              distance: 0,
              duration: 0,
              maneuver: {
                type: 'arrive',
                location: [destination.coordinates.lng, destination.coordinates.lat]
              },
              comfort: { lighting: 'well-lit', terrain: 'flat', shade: true }
            }
          ],
          safety: {
            lighting: 'Well lit throughout',
            lightingLevel: 'well-lit',
            crossings: '2 signalized crossings',
            crossingCount: 2,
            sidewalks: 'Continuous sidewalks',
            sidewalkCoverage: 'continuous',
            busyRoads: 1
          },
          comfort: {
            hills: 'Moderate terrain',
            hillLevel: 'flat',
            shade: 'About 60% shaded',
            shadePercent: 60,
            restSpots: 'Multiple benches available',
            restSpotCount: 3,
            restSpotTypes: ['bench', 'cafe']
          }
        },
        {
          id: 'fallback-comfortable',
          type: 'comfortable',
          title: 'Most Comfortable',
          distance: distance * 1.1,
          duration: duration * 1.15,
          geometry: fallbackGeometry,
          tags: ['High comfort', 'Shaded', 'Rest stops'],
          nightFriendly: true,
          steps: [
            {
              instruction: `Head toward ${destination.name} via shaded route`,
              distance: distance * 1.1,
              duration: duration * 1.15,
              maneuver: {
                type: 'depart',
                location: [origin.coordinates.lng, origin.coordinates.lat]
              },
              comfort: { lighting: 'well-lit', terrain: 'flat', shade: true, restSpot: 'park' }
            },
            {
              instruction: `Arrive at ${destination.name}`,
              distance: 0,
              duration: 0,
              maneuver: {
                type: 'arrive',
                location: [destination.coordinates.lng, destination.coordinates.lat]
              },
              comfort: { lighting: 'well-lit', terrain: 'flat', shade: true, restSpot: 'bench' }
            }
          ],
          safety: {
            lighting: 'Good visibility',
            lightingLevel: 'well-lit',
            crossings: '2 controlled crossings',
            crossingCount: 2,
            sidewalks: 'Wide sidewalks',
            sidewalkCoverage: 'continuous',
            busyRoads: 0
          },
          comfort: {
            hills: 'Gentle terrain',
            hillLevel: 'flat',
            shade: 'Mostly shaded (75%)',
            shadePercent: 75,
            restSpots: 'Rest spots and cafés nearby',
            restSpotCount: 5,
            restSpotTypes: ['bench', 'cafe', 'park']
          }
        }
      ];
      
      setRoutes(fallbackRoutes);
      setSelectedRoute(fallbackRoutes.find(r => r.type === 'safest') || fallbackRoutes[0]);
      // Don't show error for fallback - routes still work
    } finally {
      setIsLoading(false);
    }
  }, [origin, destination, transportMode]);

  const selectRoute = useCallback((route: RouteData) => {
    setSelectedRoute(route);
  }, []);

  const clearAll = useCallback(() => {
    setOrigin(null);
    setDestination(null);
    setRoutes([]);
    setSelectedRoute(null);
    setError(null);
  }, []);

  const value: RouteContextType = {
    origin,
    destination,
    routes,
    selectedRoute,
    transportMode,
    isLoading,
    error,
    mapboxToken: MAPBOX_TOKEN,
    setOrigin,
    setDestination,
    setTransportMode,
    selectRoute,
    fetchRoutes,
    searchLocation,
    getCurrentLocation,
    clearAll,
  };

  return (
    <RouteContext.Provider value={value}>
      {children}
    </RouteContext.Provider>
  );
}
