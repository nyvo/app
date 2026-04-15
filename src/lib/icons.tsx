import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  AlertCircleIcon,
  Alert02Icon,
  Archive01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowDataTransferHorizontalIcon,
  ArrowUpRight01Icon,
  Money01Icon,
  Notification01Icon,
  BookOpen01Icon,
  Building01Icon,
  Calendar01Icon,
  Calendar02Icon,
  Calendar03Icon,
  CalendarAdd01Icon,
  CalendarRemove01Icon,
  Tick01Icon,
  TickDouble01Icon,
  CheckmarkCircle01Icon,
  CheckmarkCircle02Icon,
  ArrowDown01Icon,
  ArrowDataTransferVerticalIcon,
  Clock01Icon,
  Clock03Icon,
  CreditCardIcon,
  DoorOpenIcon,
  LinkSquare01Icon,
  ViewIcon,
  ViewOffIcon,
  Facebook01Icon,
  File01Icon,
  FilterIcon,
  HelpCircleIcon,
  Home01Icon,
  Image01Icon,
  ImageNotFound01Icon,
  ImageAdd01Icon,
  InboxIcon,
  Infinity01Icon,
  InformationCircleIcon,
  LayerIcon,
  Leaf01Icon,
  Link01Icon,
  Linkedin01Icon,
  Loading03Icon,
  LockIcon,
  Logout01Icon,
  Mail01Icon,
  MapPinIcon,
  Message01Icon,
  Message02Icon,
  MoreHorizontalIcon,
  PanelLeftIcon,
  AttachmentIcon,
  Call02Icon,
  PlusSignIcon,
  ReloadIcon,
  RepeatIcon,
  Search01Icon,
  Sent02Icon,
  Setting07Icon,
  Share01Icon,
  Shield01Icon,
  SmartPhone01Icon,
  Happy01Icon,
  StickyNote01Icon,
  Delete02Icon,
  TwitterIcon,
  UndoIcon,
  User02Icon,
  UserCheck01Icon,
  UserAdd01Icon,
  UserGroupIcon,
  Cancel01Icon,
  CancelCircleIcon,
} from "@hugeicons/core-free-icons"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IconData = any

type IconProps = Omit<React.SVGAttributes<SVGElement>, "size"> & {
  size?: number
  strokeWidth?: number
  absoluteStrokeWidth?: boolean
}

export type LucideIcon = React.FC<IconProps>

function makeIcon(icon: IconData): LucideIcon {
  const Component: LucideIcon = ({ className, strokeWidth = 2, ...rest }) => (
    <HugeiconsIcon icon={icon} strokeWidth={strokeWidth} className={className} {...rest} />
  )
  return Component
}

export const AlertCircle = makeIcon(AlertCircleIcon)
export const AlertTriangle = makeIcon(Alert02Icon)
export const Archive = makeIcon(Archive01Icon)
export const ArrowLeft = makeIcon(ArrowLeft01Icon)
export const ArrowRight = makeIcon(ArrowRight01Icon)
export const ArrowRightLeft = makeIcon(ArrowDataTransferHorizontalIcon)
export const ArrowUpRight = makeIcon(ArrowUpRight01Icon)
export const Banknote = makeIcon(Money01Icon)
export const Bell = makeIcon(Notification01Icon)
export const BookOpen = makeIcon(BookOpen01Icon)
export const Building = makeIcon(Building01Icon)
export const Calendar = makeIcon(Calendar01Icon)
export const CalendarClock = makeIcon(Calendar02Icon)
export const CalendarDays = makeIcon(Calendar03Icon)
export const CalendarPlus = makeIcon(CalendarAdd01Icon)
export const CalendarX = makeIcon(CalendarRemove01Icon)
export const Check = makeIcon(Tick01Icon)
export const CheckCheck = makeIcon(TickDouble01Icon)
export const CheckCircle = makeIcon(CheckmarkCircle01Icon)
export const CheckCircle2 = makeIcon(CheckmarkCircle02Icon)
export const ChevronDown = makeIcon(ArrowDown01Icon)
export const ChevronLeft = makeIcon(ArrowLeft01Icon)
export const ChevronRight = makeIcon(ArrowRight01Icon)
export const ChevronsUpDown = makeIcon(ArrowDataTransferVerticalIcon)
export const CircleAlert = makeIcon(AlertCircleIcon)
export const CircleCheck = makeIcon(CheckmarkCircle01Icon)
export const Clock = makeIcon(Clock01Icon)
export const Clock3 = makeIcon(Clock03Icon)
export const CreditCard = makeIcon(CreditCardIcon)
export const DoorOpen = makeIcon(DoorOpenIcon)
export const ExternalLink = makeIcon(LinkSquare01Icon)
export const Eye = makeIcon(ViewIcon)
export const EyeOff = makeIcon(ViewOffIcon)
export const Facebook = makeIcon(Facebook01Icon)
export const FileText = makeIcon(File01Icon)
export const Filter = makeIcon(FilterIcon)
export const HelpCircle = makeIcon(HelpCircleIcon)
export const Home = makeIcon(Home01Icon)
export const Image = makeIcon(Image01Icon)
export const ImageIcon = makeIcon(Image01Icon)
export const ImageOff = makeIcon(ImageNotFound01Icon)
export const ImagePlus = makeIcon(ImageAdd01Icon)
export const Inbox = makeIcon(InboxIcon)
export const Infinity = makeIcon(Infinity01Icon)
export const Info = makeIcon(InformationCircleIcon)
export const Layers = makeIcon(LayerIcon)
export const Leaf = makeIcon(Leaf01Icon)
export const Link = makeIcon(Link01Icon)
export const Linkedin = makeIcon(Linkedin01Icon)
export const Loader2 = makeIcon(Loading03Icon)
export const Lock = makeIcon(LockIcon)
export const LogOut = makeIcon(Logout01Icon)
export const Mail = makeIcon(Mail01Icon)
export const MapPin = makeIcon(MapPinIcon)
export const MessageCircle = makeIcon(Message01Icon)
export const MessageSquare = makeIcon(Message02Icon)
export const MoreHorizontal = makeIcon(MoreHorizontalIcon)
export const PanelLeft = makeIcon(PanelLeftIcon)
export const Paperclip = makeIcon(AttachmentIcon)
export const Phone = makeIcon(Call02Icon)
export const Plus = makeIcon(PlusSignIcon)
export const RefreshCw = makeIcon(ReloadIcon)
export const Repeat = makeIcon(RepeatIcon)
export const Search = makeIcon(Search01Icon)
export const Send = makeIcon(Sent02Icon)
export const Settings = makeIcon(Setting07Icon)
export const Share2 = makeIcon(Share01Icon)
export const Shield = makeIcon(Shield01Icon)
export const Smartphone = makeIcon(SmartPhone01Icon)
export const Smile = makeIcon(Happy01Icon)
export const StickyNote = makeIcon(StickyNote01Icon)
export const Trash2 = makeIcon(Delete02Icon)
export const TriangleAlert = makeIcon(Alert02Icon)
export const Twitter = makeIcon(TwitterIcon)
export const Undo2 = makeIcon(UndoIcon)
export const User = makeIcon(User02Icon)
export const UserCheck = makeIcon(UserCheck01Icon)
export const UserPlus = makeIcon(UserAdd01Icon)
export const Users = makeIcon(UserGroupIcon)
export const X = makeIcon(Cancel01Icon)
export const XCircle = makeIcon(CancelCircleIcon)
