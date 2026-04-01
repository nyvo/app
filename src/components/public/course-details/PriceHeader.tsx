import React from 'react';

export interface PriceHeaderProps {
  label: string;
  step?: string;
}

/**
 * Card header — shows current step label (e.g. "Påmelding", "Betaling")
 */
export const PriceHeader: React.FC<PriceHeaderProps> = ({
  label,
  step,
}) => {
  return (
    <div className="flex justify-between items-center px-6 py-6 border-b border-zinc-200">
      <span className="text-sm font-medium text-text-primary">
        {label}
      </span>
      {step && (
        <span className="text-xs text-text-secondary">
          {step}
        </span>
      )}
    </div>
  );
};
