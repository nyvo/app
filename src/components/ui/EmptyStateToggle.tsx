import { Eye, EyeOff } from 'lucide-react';
import { useEmptyState } from '@/context/EmptyStateContext';

const EmptyStateToggle = () => {
  const { showEmptyState, toggleEmptyState } = useEmptyState();

  return (
    <button
      onClick={toggleEmptyState}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 text-xxs font-medium text-muted-foreground shadow-lg hover:bg-surface-elevated hover:text-text-secondary hover:shadow-xl ios-ease active:scale-[0.95]"
      title={showEmptyState ? 'Show Data' : 'Show Empty State'}
    >
      {showEmptyState ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
      <span>{showEmptyState ? 'Data' : 'Tom'}</span>
    </button>
  );
};

export default EmptyStateToggle;
