import { ArrowLeft, TreeDeciduous, TrafficCone, Mountain, Coffee, Building } from 'lucide-react';
import type { RouteType } from '../App';

interface StepByStepProps {
  routeType: RouteType;
  onBack: () => void;
}

const stepData = {
  safest: [
    {
      icon: TreeDeciduous,
      distance: '300 m',
      instruction: 'Walk 300 m along Washington Sq N',
      description: 'Tree-lined street, mostly shaded'
    },
    {
      icon: TrafficCone,
      distance: '—',
      instruction: 'Cross 5th Ave at crosswalk',
      description: 'Busy intersection with traffic lights'
    },
    {
      icon: Building,
      distance: '400 m',
      instruction: 'Continue 400 m on quieter side street',
      description: 'Well lit, low traffic'
    },
    {
      icon: Mountain,
      distance: '150 m',
      instruction: 'Climb a short hill (150 m)',
      description: 'Moderate slope, sidewalk on right side'
    },
    {
      icon: Coffee,
      distance: '—',
      instruction: 'Bench + café on your right',
      description: 'Optional rest spot if you are tired'
    },
    {
      icon: Building,
      distance: '250 m',
      instruction: 'Final 250 m to NYU Bobst Library',
      description: 'Flat, wide sidewalk'
    }
  ],
  fastest: [
    {
      icon: Building,
      distance: '400 m',
      instruction: 'Walk 400 m along Broadway',
      description: 'Busy avenue with moderate traffic'
    },
    {
      icon: TrafficCone,
      distance: '—',
      instruction: 'Cross at major intersection',
      description: 'High traffic, wait for signal'
    },
    {
      icon: Building,
      distance: '500 m',
      instruction: 'Continue 500 m on main road',
      description: 'Minimal shade, some darker sections at night'
    },
    {
      icon: TrafficCone,
      distance: '—',
      instruction: 'Cross final intersection',
      description: 'Busy crossing with pedestrian signal'
    },
    {
      icon: Building,
      distance: '200 m',
      instruction: 'Final 200 m to NYU Bobst Library',
      description: 'Direct path, well maintained sidewalk'
    }
  ],
  comfortable: [
    {
      icon: TreeDeciduous,
      distance: '350 m',
      instruction: 'Walk 350 m through Washington Square Park',
      description: 'Tree-covered path, benches available'
    },
    {
      icon: Coffee,
      distance: '—',
      instruction: 'Coffee shop and seating area',
      description: 'Optional rest stop with shade'
    },
    {
      icon: TreeDeciduous,
      distance: '450 m',
      instruction: 'Continue 450 m on tree-lined street',
      description: 'Maximum shade, gentle slope'
    },
    {
      icon: Coffee,
      distance: '—',
      instruction: 'Park bench rest area',
      description: 'Shaded seating, water fountain nearby'
    },
    {
      icon: Building,
      distance: '300 m',
      instruction: 'Final 300 m to NYU Bobst Library',
      description: 'Wide sidewalk, covered walkway section'
    }
  ]
};

export default function StepByStep({ routeType, onBack }: StepByStepProps) {
  const steps = stepData[routeType];
  const routeInfo = {
    safest: 'Safest route · 21 min · 1.5 km',
    fastest: 'Fastest route · 18 min · 1.3 km',
    comfortable: 'Most Comfortable route · 20 min · 1.4 km'
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3 mb-1">
          <button onClick={onBack} className="p-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>Step-by-step preview</div>
        </div>
        <div className="text-gray-600 ml-11">{routeInfo[routeType]}</div>
      </div>

      {/* Steps list */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-4 space-y-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={index} className="flex gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1 pt-1">
                  {step.distance !== '—' && (
                    <div className="text-blue-600 mb-1">{step.distance}</div>
                  )}
                  <div className="mb-1">{step.instruction}</div>
                  <div className="text-gray-600">{step.description}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom note */}
        <div className="px-4 pb-6 text-center text-gray-500">
          Notes are based on crowdsourced walking data.
        </div>
      </div>
    </div>
  );
}
