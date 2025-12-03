import { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, X, Search, Loader2 } from 'lucide-react';
import { useRoute, Location } from '../context/RouteContext';

interface LocationSearchProps {
  placeholder: string;
  value: Location | null;
  onChange: (location: Location | null) => void;
  showCurrentLocation?: boolean;
}

export default function LocationSearch({ 
  placeholder, 
  value, 
  onChange,
  showCurrentLocation = false 
}: LocationSearchProps) {
  const [query, setQuery] = useState(value?.name || '');
  const [results, setResults] = useState<Location[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isUserTyping, setIsUserTyping] = useState(false);
  const { searchLocation, getCurrentLocation } = useRoute();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsUserTyping(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Update query when value changes from outside (but not when user is typing)
  useEffect(() => {
    if (!isUserTyping) {
      setQuery(value?.name || '');
    }
  }, [value, isUserTyping]);

  // Search effect - only when user is actively typing
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (!isUserTyping || query.length < 2) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    timeoutRef.current = setTimeout(async () => {
      const locations = await searchLocation(query);
      setResults(locations);
      setIsSearching(false);
    }, 300);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [query, searchLocation, isUserTyping]);

  const handleSelect = (location: Location) => {
    onChange(location);
    setQuery(location.name);
    setIsUserTyping(false);
    setIsOpen(false);
    setResults([]);
  };

  const handleClear = () => {
    onChange(null);
    setQuery('');
    setIsUserTyping(false);
    setResults([]);
    inputRef.current?.focus();
  };

  const handleCurrentLocation = async () => {
    setIsGettingLocation(true);
    const location = await getCurrentLocation();
    if (location) {
      onChange(location);
      setQuery(location.name);
    }
    setIsGettingLocation(false);
    setIsUserTyping(false);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative flex items-center">
        <Search className="absolute left-3 w-4 h-4 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsUserTyping(true);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="w-full pl-9 pr-8 py-2.5 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {isSearching && (
          <Loader2 className="absolute right-3 w-4 h-4 text-gray-400 animate-spin" />
        )}
        {!isSearching && query && (
          <button 
            onClick={handleClear}
            className="absolute right-3 p-0.5 hover:bg-gray-200 rounded"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>

      {isOpen && (query.length >= 2 || showCurrentLocation) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-64 overflow-y-auto">
          {showCurrentLocation && (
            <button
              onClick={handleCurrentLocation}
              disabled={isGettingLocation}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left border-b border-gray-100"
            >
              {isGettingLocation ? (
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              ) : (
                <Navigation className="w-5 h-5 text-blue-600" />
              )}
              <span className="text-blue-600 font-medium">Use current location</span>
            </button>
          )}
          
          {results.map((location, index) => (
            <button
              key={index}
              onClick={() => handleSelect(location)}
              className="w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 text-left"
            >
              <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate">{location.name}</div>
                <div className="text-sm text-gray-500 truncate">{location.address}</div>
              </div>
            </button>
          ))}

          {query.length >= 2 && results.length === 0 && !isSearching && (
            <div className="px-4 py-3 text-gray-500 text-center">
              No locations found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
