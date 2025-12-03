import { useState } from 'react';
import RoutesList from './components/RoutesList';
import RoutePreview from './components/RoutePreview';
import StepByStep from './components/StepByStep';
import Navigation from './components/Navigation';
import { useRoute } from './context/RouteContext';

export type PageType = 'list' | 'preview' | 'steps' | 'navigation';

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('list');
  const { selectedRoute, selectRoute, routes } = useRoute();

  const handleRouteSelect = (routeType: 'fastest' | 'safest' | 'comfortable' | 'scenic') => {
    const route = routes.find(r => r.type === routeType);
    if (route) {
      selectRoute(route);
      setCurrentPage('preview');
    }
  };

  const handleBack = () => {
    if (currentPage === 'navigation') {
      setCurrentPage('steps');
    } else if (currentPage === 'steps') {
      setCurrentPage('preview');
    } else if (currentPage === 'preview') {
      setCurrentPage('list');
    }
  };

  const handleStepByStep = () => {
    setCurrentPage('steps');
  };

  const handleStartNavigation = () => {
    setCurrentPage('navigation');
  };

  return (
    <div className="h-[100dvh] md:min-h-screen bg-gray-100 md:flex md:items-center md:justify-center">
      <div className="w-full md:max-w-[390px] h-[100dvh] md:h-[844px] bg-white relative overflow-hidden md:shadow-xl md:rounded-[40px]">
        {currentPage === 'list' && (
          <RoutesList onRouteSelect={handleRouteSelect} />
        )}
        {currentPage === 'preview' && selectedRoute && (
          <RoutePreview 
            onBack={handleBack}
            onStepByStep={handleStepByStep}
            onStartNavigation={handleStartNavigation}
          />
        )}
        {currentPage === 'steps' && selectedRoute && (
          <StepByStep 
            onBack={handleBack}
            onStartNavigation={handleStartNavigation}
          />
        )}
        {currentPage === 'navigation' && selectedRoute && (
          <Navigation 
            onBack={handleBack}
          />
        )}
      </div>
    </div>
  );
}
