import { Check } from '@/lib/icons';
import type { PracticalInfo, EquipmentInfo } from '@/types/practicalInfo';

interface PracticalInfoSectionProps {
  info: PracticalInfo | null;
}

const EQUIPMENT_LABELS: Record<EquipmentInfo, string> = {
  EQUIPMENT_INCLUDED: 'Utstyr er inkludert',
  BRING_OWN_MAT: 'Ta med egen yogamatte',
  LIMITED_EQUIPMENT: 'Begrenset utstyr — ta med eget om du har',
};

/**
 * Praktisk info — muted-tinted card with a checklist. The one neutral chromatic
 * surface in the body cluster (instructor + sted are outlined), marking it as
 * the "actionable list to read before showing up". No heading; the checkmarks
 * self-identify the card.
 */
export function PracticalInfoSection({ info }: PracticalInfoSectionProps) {
  if (!info) return null;

  const items: string[] = [];
  if (info.equipment) items.push(EQUIPMENT_LABELS[info.equipment]);
  if (info.arrival_minutes_before && info.arrival_minutes_before > 0) {
    items.push(`Møt opp ${info.arrival_minutes_before} minutter før`);
  }
  for (const bullet of info.custom_bullets ?? []) {
    if (bullet.trim().length > 0) items.push(bullet);
  }
  if (items.length === 0) return null;

  return (
    <div className="rounded-lg bg-muted p-5 sm:p-6">
      <ul className="space-y-2.5">
        {items.map((value, i) => (
          <li key={i} className="flex items-start gap-2.5 text-[15px] text-foreground leading-relaxed">
            <Check className="size-3.5 mt-1 shrink-0 text-foreground-muted" strokeWidth={2} />
            <span>{value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
