import { ArrowLeft, MoreVertical, Car, Train, User, Bike } from 'lucide-react';
import RouteCard from './RouteCard';

interface RoutesListProps {
  onRouteSelect: (route: 'fastest' | 'safest' | 'comfortable') => void;
}

export default function RoutesList({ onRouteSelect }: RoutesListProps) {
  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Status bar */}
      <div className="h-11 bg-white"></div>

      {/* Route bar */}
      <div className="bg-white px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <button className="p-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div>Home → NYU Bobst Library</div>
            <div className="text-gray-500">Today · Depart now</div>
          </div>
          <button className="p-1">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mode tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex items-center">
          <button className="flex-1 flex items-center justify-center gap-2 py-3 text-gray-500">
            <Car className="w-5 h-5" />
            <span>Drive</span>
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 py-3 text-gray-500">
            <Train className="w-5 h-5" />
            <span>Transit</span>
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 py-3 border-b-2 border-blue-600 text-blue-600">
            <User className="w-5 h-5" />
            <span>Walk</span>
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 py-3 text-gray-500">
            <Bike className="w-5 h-5" />
            <span>Bike</span>
          </button>
        </div>
      </div>

      {/* Map strip */}
      <div className="h-32 bg-gradient-to-br from-blue-50 to-green-50 relative overflow-hidden">
        <svg className="w-full h-full" viewBox="0 0 390 128">
          {/* Simple route lines */}
          <path d="M 40 100 Q 100 80, 150 70 T 300 50" stroke="#3B82F6" strokeWidth="3" fill="none" opacity="0.6" />
          <path d="M 40 100 Q 120 60, 200 45 T 350 40" stroke="#10B981" strokeWidth="3" fill="none" opacity="0.6" />
          <path d="M 40 100 Q 110 70, 180 55 T 320 45" stroke="#8B5CF6" strokeWidth="3" fill="none" opacity="0.6" />
          {/* Start marker */}
          <circle cx="40" cy="100" r="6" fill="#DC2626" />
          {/* End markers */}
          <circle cx="300" cy="50" r="6" fill="#059669" />
          <circle cx="350" cy="40" r="6" fill="#059669" />
          <circle cx="320" cy="45" r="6" fill="#059669" />
        </svg>
      </div>

      {/* Route cards */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <RouteCard
          route="fastest"
          title="Route A · Fastest"
          time="18 min"
          details="1.3 km · Some hills"
          tags={['Avg safety', 'Medium comfort']}
          hint="Uses main roads with moderate traffic."
          onClick={() => onRouteSelect('fastest')}
        />
        
        <RouteCard
          route="safest"
          title="Route B · Safest"
          time="21 min"
          details="1.5 km · Well lit · Continuous sidewalks"
          tags={['High safety', 'Night friendly']}
          hint="Avoids large intersections and darker side streets."
          recommended
          onClick={() => onRouteSelect('safest')}
        />
        
        <RouteCard
          route="comfortable"
          title="Route C · Most Comfortable"
          time="20 min"
          details="1.4 km · Shaded · Benches on the way"
          tags={['Comfort', 'Shade']}
          hint="Tree-lined streets with rest spots."
          onClick={() => onRouteSelect('comfortable')}
        />

        <div className="text-center text-gray-500 py-4">
          Tap a route to see walking-friendly details.
        </div>
      </div>
    </div>
  );
}
