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
    <div className="flex justify-between items-center px-6 py-6 border-b border-border">
      <span className="text-base font-medium text-foreground">
        {label}
      </span>
      {step && (
        <span className="text-xs font-medium tracking-wide text-muted-foreground">
          {step}
        </span>
      )}
    </div>
  );
};
