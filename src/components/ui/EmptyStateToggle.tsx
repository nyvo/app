import { useEmptyState } from '@/contexts/EmptyStateContext';

const EmptyStateToggle = () => {
  const { showEmptyState, toggleEmptyState } = useEmptyState();

  return (
    <button
      onClick={toggleEmptyState}
      className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-medium shadow-lg transition-all hover:shadow-xl hover:scale-105 active:scale-95"
      title="Toggle empty state for testing"
    >
      <span className={`h-2 w-2 rounded-full ${showEmptyState ? 'bg-amber-500' : 'bg-emerald-500'}`} />
      {showEmptyState ? 'Tom' : 'Data'}
    </button>
  );
};

export default EmptyStateToggle;
