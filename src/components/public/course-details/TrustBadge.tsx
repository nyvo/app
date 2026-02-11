import React from 'react';
import { ShieldCheck } from 'lucide-react';

/**
 * Trust badge displaying secure payment information
 * Shows payment method logos (Vipps, Visa, Mastercard)
 * Static component with no props
 */
export const TrustBadge: React.FC = () => {
  return (
    <div className="rounded-2xl bg-surface p-4">
      <div className="flex gap-3 mb-2">
        <ShieldCheck className="h-4 w-4 shrink-0 text-text-primary mt-0.5" />
        <div className="space-y-0.5">
          <p className="text-xs font-medium text-text-primary">Sikker betaling</p>
          <p className="text-xs text-text-secondary leading-relaxed">
            Vi aksepterer Vipps, Visa og Mastercard.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 pl-7 opacity-90">
        <img
          src="/badges/vipps.svg"
          alt="Vipps"
          className="h-5 w-auto"
          onError={(e) => {
            // Fallback if logos don't exist
            e.currentTarget.style.display = 'none';
          }}
        />
        <img
          src="/badges/visa.svg"
          alt="Visa"
          className="h-3 w-auto"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
        <img
          src="/badges/mastercard.svg"
          alt="Mastercard"
          className="h-5 w-auto"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      </div>
    </div>
  );
};
