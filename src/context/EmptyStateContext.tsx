import React, { createContext, useContext, useState, ReactNode } from 'react';

interface EmptyStateContextType {
  showEmptyState: boolean;
  toggleEmptyState: () => void;
  setEmptyState: (value: boolean) => void;
}

const EmptyStateContext = createContext<EmptyStateContextType | undefined>(undefined);

export const EmptyStateProvider = ({ children }: { children: ReactNode }) => {
  const [showEmptyState, setShowEmptyState] = useState(false);

  const toggleEmptyState = () => {
    setShowEmptyState((prev) => !prev);
  };

  const setEmptyState = (value: boolean) => {
    setShowEmptyState(value);
  };

  return (
    <EmptyStateContext.Provider value={{ showEmptyState, toggleEmptyState, setEmptyState }}>
      {children}
    </EmptyStateContext.Provider>
  );
};

export const useEmptyState = () => {
  const context = useContext(EmptyStateContext);
  if (context === undefined) {
    throw new Error('useEmptyState must be used within an EmptyStateProvider');
  }
  return context;
};

