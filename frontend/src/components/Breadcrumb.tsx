import { ChevronRight, Home } from 'lucide-react';
import { Folder } from '../types';

interface BreadcrumbProps {
  breadcrumb: Folder[];
  onNavigate: (folderId?: string) => void;
}

const Breadcrumb = ({ breadcrumb, onNavigate }: BreadcrumbProps) => {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-600 overflow-x-auto">
      <button
        onClick={() => onNavigate()}
        className="flex items-center gap-1 hover:text-blue-600 transition-colors"
      >
        <Home size={16} />
        <span>Home</span>
      </button>

      {breadcrumb.map((folder, index) => (
        <div key={folder.id} className="flex items-center gap-2">
          <ChevronRight size={16} className="text-gray-400" />
          <button
            onClick={() => onNavigate(folder.id)}
            className={`hover:text-blue-600 transition-colors truncate max-w-[150px] ${
              index === breadcrumb.length - 1 ? 'font-semibold text-gray-900' : ''
            }`}
            title={folder.name}
          >
            {folder.name}
          </button>
        </div>
      ))}
    </div>
  );
};

export default Breadcrumb;
