import type { PracticalInfo, AudienceLevel, EquipmentInfo } from '@/types/practicalInfo'

/** Norwegian labels for audience_level enum (used on public display) */
export const AUDIENCE_LEVEL_LABELS: Record<AudienceLevel, string> = {
  BEGINNER: 'Passer for nybegynnere',
  ALL_LEVELS: 'Passer for alle nivåer',
  INTERMEDIATE: 'Viderekommende',
}

/** Norwegian labels for equipment enum (used on public display) */
export const EQUIPMENT_LABELS: Record<EquipmentInfo, string> = {
  EQUIPMENT_INCLUDED: 'Alt nødvendig utstyr er inkludert',
  BRING_OWN_MAT: 'Ta med egen matte',
  LIMITED_EQUIPMENT: 'Begrenset utstyr \u2013 ta gjerne med eget',
}

/** Option arrays for form UI */
export const AUDIENCE_LEVEL_OPTIONS: { value: AudienceLevel; label: string }[] = [
  { value: 'ALL_LEVELS', label: 'Alle nivåer' },
  { value: 'BEGINNER', label: 'Nybegynner' },
  { value: 'INTERMEDIATE', label: 'Viderekommende' },
]

export const EQUIPMENT_OPTIONS: { value: EquipmentInfo; label: string }[] = [
  { value: 'EQUIPMENT_INCLUDED', label: 'Alt nødvendig utstyr er inkludert' },
  { value: 'BRING_OWN_MAT', label: 'Ta med egen matte' },
  { value: 'LIMITED_EQUIPMENT', label: 'Begrenset utstyr – ta gjerne med eget' },
]

/** Arrival time presets (minutes). 'none' = no special requirement */
export const ARRIVAL_NONE_VALUE = 'none'
export const ARRIVAL_PRESET_OPTIONS: { value: string; label: string }[] = [
  { value: ARRIVAL_NONE_VALUE, label: 'Ingen spesielle krav' },
  { value: '5', label: '5 minutter før' },
  { value: '10', label: '10 minutter før' },
  { value: '15', label: '15 minutter før' },
]

/** Default arrival minutes for new courses (empty = no special requirement) */
export const ARRIVAL_DEFAULT_MINUTES = ''

/** Example placeholders for custom bullet inputs */
export const CUSTOM_BULLET_PLACEHOLDERS = [
  'F.eks. Gi beskjed om eventuelle skader',
  'F.eks. Ta med varme klær til avspenning',
  'F.eks. Timen foregår hovedsakelig i stillhet',
]

/**
 * Convert PracticalInfo into a string[] of highlights
 * suitable for the CourseDescription component.
 * Order: level → equipment → arrival → custom bullets
 */
export function practicalInfoToHighlights(info: PracticalInfo | null | undefined): string[] {
  if (!info) return []
  const highlights: string[] = []

  if (info.audience_level) {
    highlights.push(AUDIENCE_LEVEL_LABELS[info.audience_level])
  }

  if (info.equipment) {
    highlights.push(EQUIPMENT_LABELS[info.equipment])
  }

  if (info.arrival_minutes_before && info.arrival_minutes_before > 0) {
    highlights.push(`Møt opp ${info.arrival_minutes_before} minutter før start`)
  }

  if (info.custom_bullets && info.custom_bullets.length > 0) {
    for (const bullet of info.custom_bullets) {
      const trimmed = bullet.trim()
      if (trimmed) {
        highlights.push(trimmed)
      }
    }
  }

  return highlights
}

/** Validation constants */
export const CUSTOM_BULLET_MAX_LENGTH = 60
export const CUSTOM_BULLETS_MAX_COUNT = 3
export const ARRIVAL_MINUTES_MIN = 0
export const ARRIVAL_MINUTES_MAX = 60
