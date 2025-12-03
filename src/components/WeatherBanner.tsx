import { Cloud, CloudRain, Sun, Snowflake, AlertTriangle, Loader2 } from 'lucide-react';
import { useWeather, WeatherCondition } from '../context/WeatherContext';

interface WeatherBannerProps {
  compact?: boolean;
}

export default function WeatherBanner({ compact = false }: WeatherBannerProps) {
  const { weather, timeContext, isLoading, alerts } = useWeather();

  if (isLoading) {
    return (
      <div className="bg-blue-50 px-4 py-2 flex items-center gap-2 text-sm text-blue-600">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Loading weather...</span>
      </div>
    );
  }

  if (!weather) {
    return null;
  }

  const hasAlert = alerts.length > 0;
  const topAlert = alerts[0];

  // Get background color based on condition/alerts
  const getBgColor = () => {
    if (topAlert?.severity === 'red') return 'bg-red-50';
    if (topAlert?.severity === 'orange') return 'bg-orange-50';
    if (topAlert?.severity === 'yellow') return 'bg-amber-50';
    
    switch (weather.current.condition) {
      case 'rain':
      case 'drizzle':
        return 'bg-blue-50';
      case 'snow':
        return 'bg-slate-100';
      case 'thunderstorm':
        return 'bg-purple-50';
      default:
        return 'bg-emerald-50';
    }
  };

  const getTextColor = () => {
    if (topAlert?.severity === 'red') return 'text-red-700';
    if (topAlert?.severity === 'orange') return 'text-orange-700';
    if (topAlert?.severity === 'yellow') return 'text-amber-700';
    
    switch (weather.current.condition) {
      case 'rain':
      case 'drizzle':
        return 'text-blue-700';
      case 'snow':
        return 'text-slate-700';
      case 'thunderstorm':
        return 'text-purple-700';
      default:
        return 'text-emerald-700';
    }
  };

  const WeatherIcon = getWeatherIconComponent(weather.current.condition);

  // Get time-based context message
  const getTimeMessage = () => {
    if (timeContext.isDark) {
      return timeContext.sunsetTime ? `🌙 Dark (sunset ${timeContext.sunsetTime})` : '🌙 After dark';
    }
    if (timeContext.isRushHour) {
      return '🚶 Rush hour—busier sidewalks';
    }
    if (timeContext.timeOfDay === 'early-morning') {
      return timeContext.sunriseTime ? `🌅 Sunrise ${timeContext.sunriseTime}` : '🌅 Early morning';
    }
    if (timeContext.timeOfDay === 'midday' && weather.current.temp > 80) {
      return '☀️ Peak sun—seek shade';
    }
    if (timeContext.timeOfDay === 'evening') {
      return timeContext.sunsetTime ? `🌆 Sunset ${timeContext.sunsetTime}` : '🌆 Evening';
    }
    return null;
  };

  const timeMessage = getTimeMessage();

  // Get minimal message without emoji (icon is already shown)
  const getMinimalMessage = () => {
    if (hasAlert) return topAlert.message;
    if (timeMessage) return timeMessage.replace(/^[\u{1F300}-\u{1F9FF}]\s*/u, ''); // Strip leading emoji
    
    const { current } = weather;
    if (current.condition === 'rain' || current.condition === 'drizzle') {
      return 'Covered routes prioritized';
    }
    if (current.condition === 'snow') {
      return 'Watch for slippery surfaces';
    }
    if (current.temp > 90) {
      return 'Heat advisory—stay hydrated';
    }
    if (current.temp < 32) {
      return 'Cold—prefer shorter routes';
    }
    if (current.condition === 'clear' && current.temp >= 60 && current.temp <= 80) {
      return 'Great walking weather';
    }
    return current.description;
  };

  if (compact) {
    return (
      <div className={`${getBgColor()} px-4 py-2 flex items-center gap-2 text-sm ${getTextColor()}`}>
        {hasAlert && topAlert.severity !== 'yellow' ? (
          <AlertTriangle className="w-4 h-4" />
        ) : (
          <WeatherIcon className="w-4 h-4" />
        )}
        <span className="font-medium">{weather.current.temp}°F</span>
        <span className="opacity-75">·</span>
        <span className="flex-1 truncate">{getMinimalMessage()}</span>
      </div>
    );
  }

  return (
    <div className={`${getBgColor()} px-4 py-3`}>
      {/* Main weather info */}
      <div className={`flex items-center gap-3 ${getTextColor()}`}>
        <div className="flex items-center gap-2">
          <WeatherIcon className="w-5 h-5" />
          <span className="text-2xl font-semibold">{weather.current.temp}°F</span>
        </div>
        <div className="flex-1">
          <div className="text-sm capitalize">{weather.current.description}</div>
          <div className="text-xs opacity-75">
            Feels like {weather.current.feelsLike}°F · Wind {weather.current.windSpeed} mph
          </div>
        </div>
      </div>

      {/* Alert banner if present */}
      {hasAlert && (
        <div className={`mt-2 flex items-start gap-2 text-sm ${
          topAlert.severity === 'red' ? 'text-red-700' :
          topAlert.severity === 'orange' ? 'text-orange-700' :
          'text-amber-700'
        }`}>
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <span className="font-medium">{topAlert.icon} {topAlert.title}: </span>
            <span>{topAlert.message}</span>
          </div>
        </div>
      )}

      {/* Hourly forecast preview */}
      {weather.hourly.length > 0 && (
        <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
          {weather.hourly.slice(0, 6).map((hour, i) => (
            <div key={i} className="flex flex-col items-center text-xs min-w-[40px]">
              <span className="text-gray-500">
                {i === 0 ? 'Now' : hour.time.toLocaleTimeString('en-US', { hour: 'numeric' })}
              </span>
              <span className="my-1">{getHourlyIcon(hour.condition)}</span>
              <span className={getTextColor()}>{hour.temp}°</span>
              {hour.precipProbability > 20 && (
                <span className="text-blue-500">{hour.precipProbability}%</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function getWeatherIconComponent(condition: WeatherCondition) {
  switch (condition) {
    case 'rain':
    case 'drizzle':
      return CloudRain;
    case 'snow':
      return Snowflake;
    case 'clear':
      return Sun;
    case 'thunderstorm':
      return CloudRain;
    case 'fog':
    case 'mist':
      return Cloud;
    default:
      return Cloud;
  }
}

function getHourlyIcon(condition: WeatherCondition): string {
  switch (condition) {
    case 'clear':
      return '☀️';
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
