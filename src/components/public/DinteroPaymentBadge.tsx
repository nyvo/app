import { cn } from '@/lib/utils';

/**
 * Openspot's Dintero account. The branding badge URL is keyed off this — we
 * use the platform account everywhere (landing, booking, checkout) so the
 * image is consistent regardless of which studio's storefront the user is on.
 * If we ever want per-studio badges (showing only methods that studio
 * enabled), we'd thread the seller's Dintero account ID through here.
 *
 * Note: Dintero CDN caches the SVG and updates ~1h after profile changes.
 *
 * Configured via VITE_DINTERO_ACCOUNT_ID; falls back to the sandbox account
 * (T-prefix) so dev/preview keeps working. Set the production account id
 * (P-prefix) in the deploy environment before go-live.
 */
const DINTERO_ACCOUNT_ID: string =
  import.meta.env.VITE_DINTERO_ACCOUNT_ID || 'T11116559';

interface DinteroPaymentBadgeProps {
  /** SVG source width. Higher = sharper at large display sizes; 600 is enough. */
  width?: number;
  /** Hex color WITHOUT the leading `#`. Defaults to our foreground (171717). */
  color?: string;
  /** `logomark` = logos only. `logomark-text` includes "Secure payment" copy. */
  variant?: 'logomark' | 'logomark-text';
  className?: string;
}

/**
 * Horizontal strip of supported payment-method logos, sourced live from
 * Dintero's branding CDN. Renders as an `<img>` so it scales cleanly with
 * CSS — set width on the wrapper, not the source. Display size in the page
 * controls the rendered size; the SVG handles the rasterisation.
 */
export function DinteroPaymentBadge({
  width = 600,
  color = '171717',
  variant = 'logomark',
  className,
}: DinteroPaymentBadgeProps) {
  const src = `https://checkout.dintero.com/v1/branding/accounts/${DINTERO_ACCOUNT_ID}/profiles/default/variant/${variant}/color/${color}/width/${width}/logos.svg`;
  return (
    <img
      src={src}
      alt="Vi tar Visa, Mastercard, Apple Pay, Google Pay, Vipps, Klarna og flere"
      className={cn('h-auto w-full select-none', className)}
      loading="lazy"
      draggable={false}
    />
  );
}
