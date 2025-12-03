import { useState } from 'react';
import RoutesList from './components/RoutesList';
import RoutePreview from './components/RoutePreview';
import StepByStep from './components/StepByStep';

export type RouteType = 'fastest' | 'safest' | 'comfortable';
export type PageType = 'list' | 'preview' | 'steps';

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('list');
  const [selectedRoute, setSelectedRoute] = useState<RouteType>('safest');

  const handleRouteSelect = (route: RouteType) => {
    setSelectedRoute(route);
    setCurrentPage('preview');
  };

  const handleBack = () => {
    if (currentPage === 'steps') {
      setCurrentPage('preview');
    } else if (currentPage === 'preview') {
      setCurrentPage('list');
    }
  };

  const handleStepByStep = () => {
    setCurrentPage('steps');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="w-full max-w-[390px] h-[844px] bg-white relative overflow-hidden shadow-xl">
        {currentPage === 'list' && (
          <RoutesList onRouteSelect={handleRouteSelect} />
        )}
        {currentPage === 'preview' && (
          <RoutePreview 
            routeType={selectedRoute}
            onBack={handleBack}
            onRouteChange={setSelectedRoute}
            onStepByStep={handleStepByStep}
          />
        )}
        {currentPage === 'steps' && (
          <StepByStep 
            routeType={selectedRoute}
            onBack={handleBack}
          />
        )}
      </div>
    </div>
  );
}
