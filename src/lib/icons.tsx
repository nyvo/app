/**
 * Central icon barrel. Every icon used in the app is re-exported from here
 * so consumers always import from a single path (`@/lib/icons`). This makes
 * it easy to:
 *   1. Audit which icons the app actually uses.
 *   2. Swap the icon kit in one place without touching call sites.
 *
 * Today the barrel is backed by lucide-react. Do not introduce a second
 * kit — if lucide is missing an icon, add a wrapped custom SVG here
 * (see `Facebook`, `Linkedin`, `Twitter` below — lucide removed brand
 * marks in recent versions so we inline them).
 */
import * as React from "react"

type BrandIconProps = React.SVGAttributes<SVGElement>

export function Facebook({ className, ...rest }: BrandIconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
         className={className} {...rest}>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  )
}

export function Linkedin({ className, ...rest }: BrandIconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
         className={className} {...rest}>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  )
}

export function Twitter({ className, ...rest }: BrandIconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
         className={className} {...rest}>
      <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
    </svg>
  )
}

export {
  AlertCircle,
  AlertTriangle,
  Archive,
  ArrowLeft,
  ArrowRight,
  ArrowRightLeft,
  ArrowUpRight,
  Bell,
  BookOpen,
  Building,
  Calendar,
  CalendarDays,
  CalendarPlus,
  CalendarX,
  Check,
  CheckCheck,
  CheckCircle,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  CircleAlert,
  CircleCheck,
  Clock,
  Clock3,
  CreditCard,
  DoorOpen,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Filter,
  Heart,
  HelpCircle,
  Home,
  Image,
  ImageIcon,
  ImagePlus,
  Inbox,
  Infinity,
  Info,
  Layers,
  Leaf,
  Link,
  Loader2,
  Lock,
  LogOut,
  Mail,
  MapPin,
  MapPinPlus,
  MessageCircle,
  MessageSquare,
  MoreHorizontal,
  PanelLeft,
  Paperclip,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Repeat,
  Search,
  Send,
  Settings,
  Share2,
  Shield,
  Smartphone,
  Smile,
  Star,
  StickyNote,
  Trash2,
  TriangleAlert,
  Undo2,
  User,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
  X,
  XCircle,
} from "lucide-react"

export type { LucideIcon } from "lucide-react"
