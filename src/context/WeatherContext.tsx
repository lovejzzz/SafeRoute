import { createContext, useContext, useState, useCallback, useEffect, useMemo, ReactNode } from 'react';
import { useRoute } from './RouteContext';

// OpenWeatherMap API - Free tier: 1000 calls/day
const OPENWEATHER_API_KEY = ''; // User needs to add their API key

export type WeatherCondition = 'clear' | 'clouds' | 'rain' | 'snow' | 'fog' | 'thunderstorm' | 'drizzle' | 'mist';

export interface CurrentWeather {
  temp: number;           // °F
  feelsLike: number;      // °F (wind chill / heat index)
  condition: WeatherCondition;
  description: string;    // e.g., "light rain"
  icon: string;           // OpenWeatherMap icon code
  precipitation: number;  // mm in last hour
  humidity: number;       // %
  windSpeed: number;      // mph
  uvIndex: number;        // 0-11+
  visibility: number;     // meters
}

export interface HourlyForecast {
  time: Date;
  temp: number;
  condition: WeatherCondition;
  description: string;
  icon: string;
  precipProbability: number; // 0-100%
  precipitation: number;     // mm
}

export interface WeatherData {
  current: CurrentWeather;
  hourly: HourlyForecast[];
  lastUpdated: Date;
  locationName: string;
}

export interface WeatherAlert {
  severity: 'yellow' | 'orange' | 'red';
  title: string;
  message: string;
  icon: string;
}

export type TimeOfDay = 'early-morning' | 'morning' | 'midday' | 'afternoon' | 'evening' | 'night' | 'late-night';

export interface TimeContext {
  hour: number;
  minute: number;
  timeOfDay: TimeOfDay;
  isDark: boolean;           // Based on actual sunset/sunrise
  isRushHour: boolean;       // 7-9 AM or 5-7 PM weekdays
  isWeekend: boolean;
  displayTime: string;       // e.g., "4:53 PM"
  sunriseTime?: string;
  sunsetTime?: string;
}

interface WeatherContextType {
  weather: WeatherData | null;
  timeContext: TimeContext;
  isLoading: boolean;
  error: string | null;
  alerts: WeatherAlert[];
  fetchWeather: (lat: number, lng: number) => Promise<void>;
  getRouteWeatherTags: () => string[];
  getWeatherMessage: () => string;
}

const WeatherContext = createContext<WeatherContextType | null>(null);

export function useWeather() {
  const context = useContext(WeatherContext);
  if (!context) {
    throw new Error('useWeather must be used within a WeatherProvider');
  }
  return context;
}

interface WeatherProviderProps {
  children: ReactNode;
}

// Map OpenWeatherMap conditions to our simplified conditions
function mapCondition(weatherId: number): WeatherCondition {
  if (weatherId >= 200 && weatherId < 300) return 'thunderstorm';
  if (weatherId >= 300 && weatherId < 400) return 'drizzle';
  if (weatherId >= 500 && weatherId < 600) return 'rain';
  if (weatherId >= 600 && weatherId < 700) return 'snow';
  if (weatherId >= 700 && weatherId < 800) return 'fog'; // includes mist, haze, etc.
  if (weatherId === 800) return 'clear';
  return 'clouds';
}

// Convert Kelvin to Fahrenheit
function kelvinToFahrenheit(k: number): number {
  return Math.round((k - 273.15) * 9/5 + 32);
}

// Convert m/s to mph
function msToMph(ms: number): number {
  return Math.round(ms * 2.237);
}

// Calculate time of day from hour
function getTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 5 && hour < 7) return 'early-morning';
  if (hour >= 7 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 14) return 'midday';
  if (hour >= 14 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  if (hour >= 21 || hour < 1) return 'night';
  return 'late-night'; // 1 AM - 5 AM
}

// Calculate full time context
function calculateTimeContext(sunriseTimestamp?: number, sunsetTimestamp?: number): TimeContext {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const dayOfWeek = now.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  
  // Rush hour: 7-9 AM or 5-7 PM on weekdays
  const isMorningRush = hour >= 7 && hour < 9;
  const isEveningRush = hour >= 17 && hour < 19;
  const isRushHour = !isWeekend && (isMorningRush || isEveningRush);
  
  // Calculate if it's dark based on sunrise/sunset or fallback to estimates
  let isDark: boolean;
  let sunriseTime: string | undefined;
  let sunsetTime: string | undefined;
  
  if (sunriseTimestamp && sunsetTimestamp) {
    const sunrise = new Date(sunriseTimestamp * 1000);
    const sunset = new Date(sunsetTimestamp * 1000);
    isDark = now < sunrise || now > sunset;
    sunriseTime = sunrise.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    sunsetTime = sunset.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  } else {
    // Fallback: assume dark before 6:30 AM or after 6 PM (adjustable by season)
    const month = now.getMonth();
    const isSummer = month >= 4 && month <= 8;
    const sunriseHour = isSummer ? 5.5 : 6.5;
    const sunsetHour = isSummer ? 20 : 17.5;
    const currentHourDecimal = hour + minute / 60;
    isDark = currentHourDecimal < sunriseHour || currentHourDecimal > sunsetHour;
  }
  
  return {
    hour,
    minute,
    timeOfDay: getTimeOfDay(hour),
    isDark,
    isRushHour,
    isWeekend,
    displayTime: now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    sunriseTime,
    sunsetTime,
  };
}

export function WeatherProvider({ children }: WeatherProviderProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<WeatherAlert[]>([]);
  const [sunTimes, setSunTimes] = useState<{ sunrise?: number; sunset?: number }>({});
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const { origin, destination } = useRoute();

  // Update time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  // Calculate time context using real-time and sun data
  const timeContext = useMemo(() => {
    return calculateTimeContext(sunTimes.sunrise, sunTimes.sunset);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTime, sunTimes.sunrise, sunTimes.sunset]);

  const generateAlerts = useCallback((data: WeatherData): WeatherAlert[] => {
    const newAlerts: WeatherAlert[] = [];
    const { current, hourly } = data;

    // Check for rain in next hour
    const rainSoon = hourly.slice(0, 2).find(h => 
      h.precipProbability > 50 || h.condition === 'rain' || h.condition === 'drizzle'
    );
    if (rainSoon && current.condition !== 'rain') {
      const minutes = Math.round((rainSoon.time.getTime() - Date.now()) / 60000);
      newAlerts.push({
        severity: 'yellow',
        title: 'Rain Expected',
        message: `Rain likely in ~${minutes} min—covered route recommended`,
        icon: '🌧️'
      });
    }

    // Thunderstorm warning
    if (current.condition === 'thunderstorm' || hourly.slice(0, 3).some(h => h.condition === 'thunderstorm')) {
      newAlerts.push({
        severity: 'red',
        title: 'Thunderstorm Warning',
        message: 'Consider postponing or taking transit',
        icon: '⛈️'
      });
    }

    // Heat advisory
    if (current.temp > 90 || current.feelsLike > 95) {
      newAlerts.push({
        severity: 'orange',
        title: 'Heat Advisory',
        message: 'Stay hydrated, take breaks in shade',
        icon: '🥵'
      });
    }

    // Cold warning
    if (current.temp < 32 || current.feelsLike < 25) {
      newAlerts.push({
        severity: 'orange',
        title: 'Cold Weather',
        message: 'Bundle up, prefer shorter or wind-protected routes',
        icon: '🥶'
      });
    }

    // High wind
    if (current.windSpeed > 20) {
      newAlerts.push({
        severity: 'yellow',
        title: 'Windy Conditions',
        message: 'Wind-protected routes recommended',
        icon: '💨'
      });
    }

    // Low visibility
    if (current.visibility < 1000) {
      newAlerts.push({
        severity: 'yellow',
        title: 'Low Visibility',
        message: 'Fog or mist—prefer well-lit main streets',
        icon: '🌫️'
      });
    }

    // Active rain/snow
    if (current.condition === 'rain' || current.condition === 'drizzle') {
      newAlerts.push({
        severity: 'yellow',
        title: 'Currently Raining',
        message: 'Covered walkways prioritized',
        icon: '☔'
      });
    }

    if (current.condition === 'snow') {
      newAlerts.push({
        severity: 'orange',
        title: 'Snow',
        message: 'Watch for slippery surfaces, avoid steep slopes',
        icon: '❄️'
      });
    }

    return newAlerts;
  }, []);

  const fetchWeather = useCallback(async (lat: number, lng: number) => {
    if (!OPENWEATHER_API_KEY) {
      // Use mock data if no API key
      console.warn('No OpenWeatherMap API key set. Using mock weather data.');
      const mockWeather: WeatherData = {
        current: {
          temp: 72,
          feelsLike: 70,
          condition: 'clear',
          description: 'clear sky',
          icon: '01d',
          precipitation: 0,
          humidity: 45,
          windSpeed: 8,
          uvIndex: 5,
          visibility: 10000
        },
        hourly: Array.from({ length: 12 }, (_, i) => ({
          time: new Date(Date.now() + i * 3600000),
          temp: 72 - i,
          condition: 'clear' as WeatherCondition,
          description: 'clear sky',
          icon: i < 6 ? '01d' : '01n',
          precipProbability: 10,
          precipitation: 0
        })),
        lastUpdated: new Date(),
        locationName: 'New York'
      };
      setWeather(mockWeather);
      setAlerts(generateAlerts(mockWeather));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch current weather + hourly forecast using One Call API 3.0
      const response = await fetch(
        `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lng}&exclude=minutely,daily&appid=${OPENWEATHER_API_KEY}`
      );

      if (!response.ok) {
        // Fall back to free current weather API if One Call fails
        const currentResponse = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${OPENWEATHER_API_KEY}`
        );
        
        if (!currentResponse.ok) {
          throw new Error('Weather API request failed');
        }

        const currentData = await currentResponse.json();
        
        const weatherData: WeatherData = {
          current: {
            temp: kelvinToFahrenheit(currentData.main.temp),
            feelsLike: kelvinToFahrenheit(currentData.main.feels_like),
            condition: mapCondition(currentData.weather[0].id),
            description: currentData.weather[0].description,
            icon: currentData.weather[0].icon,
            precipitation: currentData.rain?.['1h'] || currentData.snow?.['1h'] || 0,
            humidity: currentData.main.humidity,
            windSpeed: msToMph(currentData.wind.speed),
            uvIndex: 0, // Not available in basic API
            visibility: currentData.visibility || 10000
          },
          hourly: [], // Not available in basic API
          lastUpdated: new Date(),
          locationName: currentData.name
        };

        setWeather(weatherData);
        setAlerts(generateAlerts(weatherData));
        // Set sun times from basic API
        if (currentData.sys?.sunrise && currentData.sys?.sunset) {
          setSunTimes({ sunrise: currentData.sys.sunrise, sunset: currentData.sys.sunset });
        }
        return;
      }

      const data = await response.json();
      
      // Set sun times from One Call API
      if (data.current?.sunrise && data.current?.sunset) {
        setSunTimes({ sunrise: data.current.sunrise, sunset: data.current.sunset });
      }
      
      const weatherData: WeatherData = {
        current: {
          temp: kelvinToFahrenheit(data.current.temp),
          feelsLike: kelvinToFahrenheit(data.current.feels_like),
          condition: mapCondition(data.current.weather[0].id),
          description: data.current.weather[0].description,
          icon: data.current.weather[0].icon,
          precipitation: data.current.rain?.['1h'] || data.current.snow?.['1h'] || 0,
          humidity: data.current.humidity,
          windSpeed: msToMph(data.current.wind_speed),
          uvIndex: data.current.uvi || 0,
          visibility: data.current.visibility || 10000
        },
        hourly: data.hourly.slice(0, 12).map((hour: any) => ({
          time: new Date(hour.dt * 1000),
          temp: kelvinToFahrenheit(hour.temp),
          condition: mapCondition(hour.weather[0].id),
          description: hour.weather[0].description,
          icon: hour.weather[0].icon,
          precipProbability: Math.round((hour.pop || 0) * 100),
          precipitation: hour.rain?.['1h'] || hour.snow?.['1h'] || 0
        })),
        lastUpdated: new Date(),
        locationName: data.timezone.split('/').pop()?.replace('_', ' ') || 'Unknown'
      };

      setWeather(weatherData);
      setAlerts(generateAlerts(weatherData));
    } catch (err) {
      console.error('Weather fetch error:', err);
      setError('Failed to fetch weather data');
    } finally {
      setIsLoading(false);
    }
  }, [generateAlerts]);

  // Auto-fetch weather when origin changes
  useEffect(() => {
    const location = origin || destination;
    if (location) {
      fetchWeather(location.coordinates.lat, location.coordinates.lng);
    }
  }, [origin, destination, fetchWeather]);

  const getRouteWeatherTags = useCallback((): string[] => {
    if (!weather) return [];
    
    const tags: string[] = [];
    const { current } = weather;

    if (current.condition === 'rain' || current.condition === 'drizzle' || current.condition === 'snow') {
      tags.push('☂️ Covered routes preferred');
    }

    if (current.temp > 85 || current.uvIndex > 6) {
      tags.push('🌳 Shaded routes preferred');
    }

    if (current.windSpeed > 15) {
      tags.push('🏠 Wind-protected');
    }

    if (current.condition === 'clear' && current.temp >= 60 && current.temp <= 80) {
      tags.push('☀️ Great walking weather');
    }

    if (current.condition === 'fog' || current.visibility < 2000) {
      tags.push('🌫️ Low visibility');
    }

    return tags;
  }, [weather]);

  const getWeatherMessage = useCallback((): string => {
    if (!weather) return '';
    
    const { current, hourly } = weather;
    const icon = getWeatherIcon(current.condition, current.icon);
    
    // Check for incoming weather changes
    const nextHour = hourly[1];
    if (nextHour && nextHour.precipProbability > 60 && current.precipitation === 0) {
      return `${icon} ${current.temp}°F · Rain expected in ~1 hour`;
    }

    // Current condition messages
    if (current.condition === 'rain' || current.condition === 'drizzle') {
      return `${icon} ${current.temp}°F ${current.description} · Covered routes prioritized`;
    }

    if (current.condition === 'snow') {
      return `${icon} ${current.temp}°F Snow · Watch for slippery surfaces`;
    }

    if (current.temp > 90) {
      return `${icon} ${current.temp}°F · Heat advisory, stay hydrated`;
    }

    if (current.temp < 32) {
      return `${icon} ${current.temp}°F · Cold, prefer shorter routes`;
    }

    if (current.windSpeed > 20) {
      return `${icon} ${current.temp}°F · Windy, ${current.windSpeed} mph`;
    }

    // Default pleasant weather
    if (current.condition === 'clear') {
      return `${icon} ${current.temp}°F Clear · Great walking weather`;
    }

    return `${icon} ${current.temp}°F ${current.description}`;
  }, [weather]);

  const value: WeatherContextType = {
    weather,
    timeContext,
    isLoading,
    error,
    alerts,
    fetchWeather,
    getRouteWeatherTags,
    getWeatherMessage,
  };

  return (
    <WeatherContext.Provider value={value}>
      {children}
    </WeatherContext.Provider>
  );
}

// Helper to get emoji icon based on condition
function getWeatherIcon(condition: WeatherCondition, iconCode?: string): string {
  const isNight = iconCode?.includes('n');
  
  switch (condition) {
    case 'clear':
      return isNight ? '🌙' : '☀️';
    case 'clouds':
      return '☁️';
    case 'rain':
      return '🌧️';
    case 'drizzle':
      return '🌦️';
    case 'snow':
      return '❄️';
    case 'thunderstorm':
      return '⛈️';
    case 'fog':
    case 'mist':
      return '🌫️';
    default:
      return '🌤️';
  }
}
