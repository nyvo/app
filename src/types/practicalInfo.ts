/**
 * Structured practical info stored as JSONB on courses.practical_info
 */

export type AudienceLevel =
  | 'BEGINNER'
  | 'ALL_LEVELS'
  | 'INTERMEDIATE'

export type EquipmentInfo =
  | 'EQUIPMENT_INCLUDED'
  | 'BRING_OWN_MAT'
  | 'LIMITED_EQUIPMENT'

export interface PracticalInfo {
  audience_level?: AudienceLevel | null
  equipment?: EquipmentInfo | null
  arrival_minutes_before?: number | null
  custom_bullets?: string[]
}
