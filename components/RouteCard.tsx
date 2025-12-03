import { Badge } from './ui/badge';

interface RouteCardProps {
  route: string;
  title: string;
  time: string;
  details: string;
  tags: string[];
  hint: string;
  recommended?: boolean;
  onClick: () => void;
}

export default function RouteCard({
  title,
  time,
  details,
  tags,
  hint,
  recommended,
  onClick
}: RouteCardProps) {
  return (
    <button 
      onClick={onClick}
      className="w-full bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:border-blue-400 transition-colors text-left"
    >
      {recommended && (
        <Badge variant="secondary" className="mb-2 bg-blue-100 text-blue-700">
          Recommended
        </Badge>
      )}
      <div className="flex items-start justify-between mb-2">
        <div>{title}</div>
        <div className="text-blue-600">{time}</div>
      </div>
      <div className="text-gray-600 mb-2">{details}</div>
      <div className="flex gap-2 mb-2 flex-wrap">
        {tags.map((tag, i) => (
          <span key={i} className="px-2 py-1 bg-gray-100 rounded text-gray-700">
            {tag}
          </span>
        ))}
      </div>
      <div className="text-gray-500">{hint}</div>
    </button>
  );
}
