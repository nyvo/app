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
 * "Praktisk info" — equipment, arrival time, custom bullets, rendered
 * as a checklist inside a tinted card. Audience level is intentionally
 * NOT rendered here since it duplicates `course.level` already in the
 * hero meta strip.
 */
export function PracticalInfoSection({ info }: PracticalInfoSectionProps) {
  if (!info) return null;

  const items: string[] = [];

  if (info.equipment) {
    items.push(EQUIPMENT_LABELS[info.equipment]);
  }
  if (info.arrival_minutes_before && info.arrival_minutes_before > 0) {
    items.push(`Møt opp ${info.arrival_minutes_before} minutter før`);
  }
  for (const bullet of info.custom_bullets ?? []) {
    if (bullet.trim().length > 0) items.push(bullet);
  }

  if (items.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-[11px] font-medium tracking-[0.14em] uppercase text-muted-foreground">
        Praktisk info
      </h2>

      <div className="max-w-2xl rounded-lg bg-sand px-5 py-4">
        <ul className="space-y-2.5">
          {items.map((value, i) => (
            <li key={i} className="flex items-start gap-2.5 text-base text-foreground leading-relaxed">
              <Check className="size-4 mt-1 shrink-0 text-sand-foreground" strokeWidth={2} />
              <span>{value}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
