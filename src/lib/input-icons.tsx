/**
 * Sanctioned exception to the Hugeicons barrel (`@/lib/icons`): icons that
 * render INSIDE form fields — input adornments, picker/trigger leading
 * icons, password toggles — come from lucide-react. The Hugeicons glyphs
 * don't sit right at field sizes (user decision, 2026-07-18).
 *
 * Use this module ONLY for icons inside inputs/pickers. Everything else
 * imports from `@/lib/icons`. Do not grow this list beyond what fields need.
 */
export { Calendar, Clock, Eye, EyeOff, MapPin, Search } from "lucide-react"
