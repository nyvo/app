import { getShowEmptyState, toggleEmptyState } from '@/lib/utils';

const EmptyStateToggle = () => {
  if (!import.meta.env.DEV) return null;
  const showEmptyState = getShowEmptyState();

  return (
    <button
      onClick={toggleEmptyState}
      className="fixed bottom-4 right-4 z-50 flex h-8 items-center gap-2 rounded-full border border-border bg-background px-3 text-xs font-medium transition-colors duration-150 hover:bg-muted"
      title="Toggle empty state for testing"
    >
      <span className={`size-2 rounded-full ${showEmptyState ? 'bg-warning' : 'bg-success'}`} />
      {showEmptyState ? 'Tom' : 'Data'}
    </button>
  );
};

export { EmptyStateToggle };
