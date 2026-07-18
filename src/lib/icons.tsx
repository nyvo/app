/**
 * Central icon barrel. Every icon used in the app is re-exported from here
 * so consumers always import from a single path (`@/lib/icons`). This makes
 * it easy to:
 *   1. Audit which icons the app actually uses.
 *   2. Swap the icon kit in one place without touching call sites.
 *
 * The barrel is backed by Hugeicons (`@hugeicons/core-free-icons`, stroke
 * rounded style). Export names keep their historical lucide names so call
 * sites never churn when the kit changes. Do not introduce a second kit —
 * if Hugeicons free is missing an icon, add a wrapped custom SVG here.
 *
 * One sanctioned exception: icons rendered INSIDE form fields come from
 * lucide-react via `@/lib/input-icons` (see that module's doc comment).
 *
 * All icons render at strokeWidth 1.75 (the sidebar convention) unless a
 * call site overrides it. Size defaults to 24px and is normally constrained
 * by Tailwind classes (`h-4 w-4`), which override the width/height attrs.
 */
import * as React from "react"
import {
  HugeiconsIcon,
  type HugeiconsIconProps,
  type IconSvgElement,
} from "@hugeicons/react"
import {
  Alert02Icon,
  AlertCircleIcon,
  Archive02Icon,
  ArchiveArrowUpIcon,
  ArrowDataTransferHorizontalIcon,
  ArrowDataTransferVerticalIcon,
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowLeft02Icon,
  ArrowMoveDownRightIcon,
  ArrowRight01Icon,
  ArrowRight02Icon,
  ArrowUp01Icon,
  ArrowUpRight01Icon,
  Attachment01Icon,
  BookOpen01Icon,
  Building02Icon,
  Calendar03Icon,
  Calendar04Icon,
  CalendarAdd01Icon,
  CalendarRemove01Icon,
  Call02Icon,
  Cancel01Icon,
  CancelCircleIcon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  Clock03Icon,
  Comment01Icon,
  ComputerIcon,
  Copy01Icon,
  CreditCardIcon,
  Delete02Icon,
  Door01Icon,
  Download01Icon,
  Facebook01Icon,
  FavouriteIcon,
  File01Icon,
  FilterIcon,
  HelpCircleIcon,
  Home01Icon,
  Image01Icon,
  ImageAdd01Icon,
  InboxIcon,
  InfinityIcon,
  InformationCircleIcon,
  Layers01Icon,
  Leaf01Icon,
  LeftToRightListBulletIcon,
  Link01Icon,
  LinkSquare01Icon,
  Linkedin01Icon,
  Loading03Icon,
  Location01Icon,
  LocationAdd01Icon,
  Logout03Icon,
  Mail01Icon,
  Message01Icon,
  MinusSignIcon,
  MoreHorizontalIcon,
  MoreVerticalIcon,
  NewTwitterIcon,
  Notification03Icon,
  PencilEdit02Icon,
  PlusSignIcon,
  Redo02Icon,
  RefreshIcon,
  RepeatIcon,
  Search01Icon,
  SentIcon,
  Settings01Icon,
  Settings02Icon,
  Share01Icon,
  Shield01Icon,
  SidebarLeftIcon,
  SmartPhone01Icon,
  SmileIcon,
  SparklesIcon,
  SquareLock02Icon,
  StarIcon,
  StickyNote02Icon,
  Ticket01Icon,
  Tick02Icon,
  TickDouble02Icon,
  UnfoldMoreIcon,
  Undo02Icon,
  Upload01Icon,
  UserAdd01Icon,
  UserCheck01Icon,
  UserIcon,
  UserMinus01Icon,
  UserMultiple02Icon,
  ViewIcon,
  ViewOffSlashIcon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons"

export type IconProps = Omit<HugeiconsIconProps, "icon" | "altIcon" | "ref">

/** Component type for props/arrays that hold an icon (was `LucideIcon`). */
export type IconComponent = React.ForwardRefExoticComponent<
  IconProps & React.RefAttributes<SVGSVGElement>
>

const DEFAULT_STROKE_WIDTH = 1.75

function createIcon(displayName: string, icon: IconSvgElement): IconComponent {
  const Icon = React.forwardRef<SVGSVGElement, IconProps>((props, ref) => (
    <HugeiconsIcon
      ref={ref}
      icon={icon}
      strokeWidth={DEFAULT_STROKE_WIDTH}
      {...props}
    />
  ))
  Icon.displayName = displayName
  return Icon
}

export const AlertCircle = createIcon("AlertCircle", AlertCircleIcon)
export const AlertTriangle = createIcon("AlertTriangle", Alert02Icon)
export const Archive = createIcon("Archive", Archive02Icon)
export const ArchiveRestore = createIcon("ArchiveRestore", ArchiveArrowUpIcon)
export const ArrowLeft = createIcon("ArrowLeft", ArrowLeft02Icon)
export const ArrowRight = createIcon("ArrowRight", ArrowRight02Icon)
export const ArrowRightLeft = createIcon("ArrowRightLeft", ArrowDataTransferHorizontalIcon)
export const ArrowUpDown = createIcon("ArrowUpDown", ArrowDataTransferVerticalIcon)
export const ArrowUpRight = createIcon("ArrowUpRight", ArrowUpRight01Icon)
export const Bell = createIcon("Bell", Notification03Icon)
export const BookOpen = createIcon("BookOpen", BookOpen01Icon)
export const Building = createIcon("Building", Building02Icon)
export const Calendar = createIcon("Calendar", Calendar03Icon)
export const CalendarDays = createIcon("CalendarDays", Calendar04Icon)
export const CalendarPlus = createIcon("CalendarPlus", CalendarAdd01Icon)
export const CalendarX = createIcon("CalendarX", CalendarRemove01Icon)
export const Check = createIcon("Check", Tick02Icon)
export const CheckCheck = createIcon("CheckCheck", TickDouble02Icon)
export const CheckCircle = createIcon("CheckCircle", CheckmarkCircle02Icon)
export const CheckCircle2 = createIcon("CheckCircle2", CheckmarkCircle02Icon)
export const ChevronDown = createIcon("ChevronDown", ArrowDown01Icon)
export const ChevronLeft = createIcon("ChevronLeft", ArrowLeft01Icon)
export const ChevronRight = createIcon("ChevronRight", ArrowRight01Icon)
export const ChevronUp = createIcon("ChevronUp", ArrowUp01Icon)
export const ChevronsUpDown = createIcon("ChevronsUpDown", UnfoldMoreIcon)
export const CornerDownRight = createIcon("CornerDownRight", ArrowMoveDownRightIcon)
export const Copy = createIcon("Copy", Copy01Icon)
export const CircleAlert = createIcon("CircleAlert", AlertCircleIcon)
export const CircleCheck = createIcon("CircleCheck", CheckmarkCircle02Icon)
export const Clock = createIcon("Clock", Clock01Icon)
export const Clock3 = createIcon("Clock3", Clock03Icon)
export const CreditCard = createIcon("CreditCard", CreditCardIcon)
export const DoorOpen = createIcon("DoorOpen", Door01Icon)
export const Download = createIcon("Download", Download01Icon)
export const ExternalLink = createIcon("ExternalLink", LinkSquare01Icon)
export const Eye = createIcon("Eye", ViewIcon)
export const EyeOff = createIcon("EyeOff", ViewOffSlashIcon)
export const Facebook = createIcon("Facebook", Facebook01Icon)
export const FileText = createIcon("FileText", File01Icon)
export const Filter = createIcon("Filter", FilterIcon)
export const Heart = createIcon("Heart", FavouriteIcon)
export const HelpCircle = createIcon("HelpCircle", HelpCircleIcon)
export const Home = createIcon("Home", Home01Icon)
export const Image = createIcon("Image", Image01Icon)
export const ImageIcon = Image
export const ImagePlus = createIcon("ImagePlus", ImageAdd01Icon)
export const Inbox = createIcon("Inbox", InboxIcon)
const InfinityGlyph = createIcon("Infinity", InfinityIcon)
export { InfinityGlyph as Infinity }
export const Info = createIcon("Info", InformationCircleIcon)
export const Layers = createIcon("Layers", Layers01Icon)
export const Leaf = createIcon("Leaf", Leaf01Icon)
export const Link = createIcon("Link", Link01Icon)
export const Linkedin = createIcon("Linkedin", Linkedin01Icon)
export const List = createIcon("List", LeftToRightListBulletIcon)
export const Loader2 = createIcon("Loader2", Loading03Icon)
export const Lock = createIcon("Lock", SquareLock02Icon)
export const LogOut = createIcon("LogOut", Logout03Icon)
export const Mail = createIcon("Mail", Mail01Icon)
export const MapPin = createIcon("MapPin", Location01Icon)
export const MapPinPlus = createIcon("MapPinPlus", LocationAdd01Icon)
export const MessageCircle = createIcon("MessageCircle", Message01Icon)
export const MessageSquare = createIcon("MessageSquare", Comment01Icon)
export const Minus = createIcon("Minus", MinusSignIcon)
export const Monitor = createIcon("Monitor", ComputerIcon)
export const MoreHorizontal = createIcon("MoreHorizontal", MoreHorizontalIcon)
export const MoreVertical = createIcon("MoreVertical", MoreVerticalIcon)
export const PanelLeft = createIcon("PanelLeft", SidebarLeftIcon)
export const Paperclip = createIcon("Paperclip", Attachment01Icon)
export const Pencil = createIcon("Pencil", PencilEdit02Icon)
export const Phone = createIcon("Phone", Call02Icon)
export const Plus = createIcon("Plus", PlusSignIcon)
export const Redo2 = createIcon("Redo2", Redo02Icon)
export const RefreshCw = createIcon("RefreshCw", RefreshIcon)
export const Repeat = createIcon("Repeat", RepeatIcon)
export const Search = createIcon("Search", Search01Icon)
export const Send = createIcon("Send", SentIcon)
export const Settings = createIcon("Settings", Settings01Icon)
export const Settings2 = createIcon("Settings2", Settings02Icon)
export const Share2 = createIcon("Share2", Share01Icon)
export const Shield = createIcon("Shield", Shield01Icon)
export const Smartphone = createIcon("Smartphone", SmartPhone01Icon)
export const Smile = createIcon("Smile", SmileIcon)
export const Sparkles = createIcon("Sparkles", SparklesIcon)
export const Star = createIcon("Star", StarIcon)
export const StickyNote = createIcon("StickyNote", StickyNote02Icon)
export const Ticket = createIcon("Ticket", Ticket01Icon)
export const Trash2 = createIcon("Trash2", Delete02Icon)
export const TriangleAlert = createIcon("TriangleAlert", Alert02Icon)
export const Twitter = createIcon("Twitter", NewTwitterIcon)
export const Undo2 = createIcon("Undo2", Undo02Icon)
export const Upload = createIcon("Upload", Upload01Icon)
export const User = createIcon("User", UserIcon)
export const UserCheck = createIcon("UserCheck", UserCheck01Icon)
export const UserMinus = createIcon("UserMinus", UserMinus01Icon)
export const UserPlus = createIcon("UserPlus", UserAdd01Icon)
export const Users = createIcon("Users", UserMultiple02Icon)
export const Wallet = createIcon("Wallet", Wallet01Icon)
export const X = createIcon("X", Cancel01Icon)
export const XCircle = createIcon("XCircle", CancelCircleIcon)
