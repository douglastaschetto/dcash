import { forwardRef, type CSSProperties } from 'react';
import type { LucideIcon, LucideProps } from 'lucide-react';
import { cn } from '@/lib/utils';

/*
 * Ícones do sistema. Ícones de conteúdo (dinheiro, casa, categorias, metas…) são
 * emojis coloridos; ícones de controle (setas, fechar, +/-, editar, lixeira, busca,
 * carregando, checkbox vazio…) continuam de linha do lucide para manter a usabilidade.
 * Os nomes são os mesmos do lucide-react: basta importar daqui em vez de 'lucide-react'.
 */

export type { LucideIcon, LucideProps };

/** Pixel size from a Tailwind height class (h-4, h-[18px]) when no `size` prop is given. */
function sizeFromClass(className?: string): number | undefined {
  if (!className) return undefined;
  const px = className.match(/(?:^|\s)h-\[(\d+(?:\.\d+)?)px\]/);
  if (px) return Number(px[1]);
  const tw = className.match(/(?:^|\s)h-(\d+(?:\.\d+)?)(?:\s|$)/);
  return tw ? Number(tw[1]) * 4 : undefined;
}

const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

function emoji(char: string, name: string): LucideIcon {
  const Icon = forwardRef<SVGSVGElement, LucideProps>(({ size, className, style, 'aria-label': ariaLabel, onClick }, ref) => {
    const px = typeof size === 'number' ? size : size ? Number(size) : sizeFromClass(className) ?? 24;
    const css: CSSProperties = { width: px, height: px, fontSize: px * 0.92, fontFamily: EMOJI_FONT, lineHeight: 1, ...style };
    return (
      <span
        ref={ref as unknown as React.Ref<HTMLSpanElement>}
        role={ariaLabel ? 'img' : undefined}
        aria-label={ariaLabel}
        aria-hidden={ariaLabel ? undefined : true}
        onClick={onClick as unknown as React.MouseEventHandler<HTMLSpanElement>}
        className={cn('inline-flex shrink-0 select-none items-center justify-center not-italic', className)}
        style={css}
      >
        {char}
      </span>
    );
  });
  Icon.displayName = `Emoji(${name})`;
  return Icon as unknown as LucideIcon;
}

/* ── Controles: ícones de linha ─────────────────────────────── */
export {
  AlignLeft,
  ArrowDown,
  ArrowDownLeft,
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowRightCircle,
  ArrowUp,
  ArrowUpRight,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Circle,
  CircleDot,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  Filter,
  Grid3x3,
  Hash,
  LayoutGrid,
  Link,
  Link2,
  List,
  Loader2,
  LogIn,
  LogOut,
  Menu,
  Minus,
  MoreHorizontal,
  MousePointerClick,
  Nfc,
  PanelLeftClose,
  PanelLeftOpen,
  Pause,
  PenLine,
  Pencil,
  Percent,
  Pin,
  PinOff,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Send,
  SendHorizontal,
  Share,
  SmilePlus,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Undo2,
  Upload,
  X,
  XCircle,
} from 'lucide-react';

/* ── Conteúdo: emojis ───────────────────────────────────────── */
export const Activity = emoji('🏃', 'Activity');
export const AlertCircle = emoji('❗', 'AlertCircle');
export const AlertOctagon = emoji('🚨', 'AlertOctagon');
export const AlertTriangle = emoji('⚠️', 'AlertTriangle');
export const Apple = emoji('🍎', 'Apple');
export const Archive = emoji('🗃️', 'Archive');
export const ArchiveRestore = emoji('📤', 'ArchiveRestore');
export const ArrowDownCircle = emoji('💸', 'ArrowDownCircle');
export const ArrowLeftRight = emoji('🔄', 'ArrowLeftRight');
export const ArrowUpCircle = emoji('💰', 'ArrowUpCircle');
export const Award = emoji('🏅', 'Award');
export const Baby = emoji('👶', 'Baby');
export const BadgeDollarSign = emoji('💲', 'BadgeDollarSign');
export const Banknote = emoji('💵', 'Banknote');
export const BarChart2 = emoji('📊', 'BarChart2');
export const BarChart3 = emoji('📊', 'BarChart3');
export const Beef = emoji('🥩', 'Beef');
export const Bell = emoji('🔔', 'Bell');
export const BellOff = emoji('🔕', 'BellOff');
export const BellRing = emoji('🔔', 'BellRing');
export const Bike = emoji('🚲', 'Bike');
export const Bird = emoji('🐦', 'Bird');
export const Bitcoin = emoji('🪙', 'Bitcoin');
export const Bone = emoji('🦴', 'Bone');
export const Book = emoji('📕', 'Book');
export const BookOpen = emoji('📖', 'BookOpen');
export const Bookmark = emoji('🔖', 'Bookmark');
export const Bot = emoji('🤖', 'Bot');
export const BotMessageSquare = emoji('🤖', 'BotMessageSquare');
export const Brain = emoji('🧠', 'Brain');
export const Briefcase = emoji('💼', 'Briefcase');
export const Building = emoji('🏢', 'Building');
export const Building2 = emoji('🏦', 'Building2');
export const Bus = emoji('🚌', 'Bus');
export const Cake = emoji('🎂', 'Cake');
export const Calculator = emoji('🧮', 'Calculator');
export const Calendar = emoji('📅', 'Calendar');
export const CalendarCheck = emoji('🗓️', 'CalendarCheck');
export const CalendarClock = emoji('⏰', 'CalendarClock');
export const CalendarDays = emoji('📆', 'CalendarDays');
export const CalendarHeart = emoji('💝', 'CalendarHeart');
export const CalendarPlus = emoji('📅', 'CalendarPlus');
export const Camera = emoji('📷', 'Camera');
export const Car = emoji('🚗', 'Car');
export const CheckCircle2 = emoji('✅', 'CheckCircle2');
export const CheckSquare = emoji('☑️', 'CheckSquare');
export const ChefHat = emoji('🧑‍🍳', 'ChefHat');
export const CircleDollarSign = emoji('🪙', 'CircleDollarSign');
export const Clapperboard = emoji('🎬', 'Clapperboard');
export const ClipboardList = emoji('📋', 'ClipboardList');
export const Clock = emoji('🕒', 'Clock');
export const Cloud = emoji('☁️', 'Cloud');
export const Code = emoji('💻', 'Code');
export const Coffee = emoji('☕', 'Coffee');
export const Coins = emoji('🪙', 'Coins');
export const Cpu = emoji('🖥️', 'Cpu');
export const CreditCard = emoji('💳', 'CreditCard');
export const Crown = emoji('👑', 'Crown');
export const Dice5 = emoji('🎲', 'Dice5');
export const DollarSign = emoji('💲', 'DollarSign');
export const Droplets = emoji('💧', 'Droplets');
export const Dumbbell = emoji('🏋️', 'Dumbbell');
export const FileText = emoji('📄', 'FileText');
export const FileUp = emoji('📤', 'FileUp');
export const Fish = emoji('🐟', 'Fish');
export const Flag = emoji('🚩', 'Flag');
export const Flame = emoji('🔥', 'Flame');
export const FlaskConical = emoji('🧪', 'FlaskConical');
export const Folder = emoji('📁', 'Folder');
export const Footprints = emoji('👣', 'Footprints');
export const Fuel = emoji('⛽', 'Fuel');
export const Gamepad2 = emoji('🎮', 'Gamepad2');
export const Gauge = emoji('⏱️', 'Gauge');
export const Gem = emoji('💎', 'Gem');
export const Gift = emoji('🎁', 'Gift');
export const GlassWater = emoji('🥤', 'GlassWater');
export const Glasses = emoji('👓', 'Glasses');
export const Globe = emoji('🌐', 'Globe');
export const GraduationCap = emoji('🎓', 'GraduationCap');
export const Hammer = emoji('🔨', 'Hammer');
export const Hand = emoji('✋', 'Hand');
export const HandCoins = emoji('🤑', 'HandCoins');
export const Handshake = emoji('🤝', 'Handshake');
export const HardDrive = emoji('💽', 'HardDrive');
export const Headphones = emoji('🎧', 'Headphones');
export const Heart = emoji('❤️', 'Heart');
export const HeartPulse = emoji('💓', 'HeartPulse');
export const HelpCircle = emoji('❓', 'HelpCircle');
export const Home = emoji('🏠', 'Home');
export const Hospital = emoji('🏥', 'Hospital');
export const Hourglass = emoji('⏳', 'Hourglass');
export const House = emoji('🏡', 'House');
export const Image = emoji('🖼️', 'Image');
export const ImageIcon = emoji('🖼️', 'ImageIcon');
export const Inbox = emoji('📥', 'Inbox');
export const Infinity = emoji('♾️', 'Infinity');
export const Info = emoji('ℹ️', 'Info');
export const Key = emoji('🔑', 'Key');
export const Landmark = emoji('🏛️', 'Landmark');
export const Languages = emoji('🗣️', 'Languages');
export const Laptop = emoji('💻', 'Laptop');
export const Layers = emoji('🗂️', 'Layers');
export const LayoutDashboard = emoji('🧭', 'LayoutDashboard');
export const Leaf = emoji('🍃', 'Leaf');
export const Library = emoji('📚', 'Library');
export const Lightbulb = emoji('💡', 'Lightbulb');
export const LineChart = emoji('📈', 'LineChart');
export const ListChecks = emoji('📝', 'ListChecks');
export const ListTodo = emoji('📝', 'ListTodo');
export const Lock = emoji('🔒', 'Lock');
export const Mail = emoji('✉️', 'Mail');
export const MessageCircle = emoji('💬', 'MessageCircle');
export const MessageSquare = emoji('💬', 'MessageSquare');
export const Monitor = emoji('🖥️', 'Monitor');
export const Moon = emoji('🌙', 'Moon');
export const Music = emoji('🎵', 'Music');
export const Navigation = emoji('🧭', 'Navigation');
export const Package = emoji('📦', 'Package');
export const Palette = emoji('🎨', 'Palette');
export const ParkingCircle = emoji('🅿️', 'ParkingCircle');
export const PartyPopper = emoji('🎉', 'PartyPopper');
export const PawPrint = emoji('🐾', 'PawPrint');
export const PenTool = emoji('✒️', 'PenTool');
export const Phone = emoji('📞', 'Phone');
export const PieChart = emoji('🥧', 'PieChart');
export const PiggyBank = emoji('🐷', 'PiggyBank');
export const Pill = emoji('💊', 'Pill');
export const Pizza = emoji('🍕', 'Pizza');
export const Plane = emoji('✈️', 'Plane');
export const Plug = emoji('🔌', 'Plug');
export const Printer = emoji('🖨️', 'Printer');
export const Rabbit = emoji('🐰', 'Rabbit');
export const Radar = emoji('📡', 'Radar');
export const Receipt = emoji('🧾', 'Receipt');
export const Repeat = emoji('🔁', 'Repeat');
export const Rocket = emoji('🚀', 'Rocket');
export const Sandwich = emoji('🥪', 'Sandwich');
export const School = emoji('🏫', 'School');
export const Scissors = emoji('✂️', 'Scissors');
export const Server = emoji('🗄️', 'Server');
export const Settings2 = emoji('⚙️', 'Settings2');
export const Shield = emoji('🛡️', 'Shield');
export const ShieldCheck = emoji('🛡️', 'ShieldCheck');
export const Ship = emoji('🚢', 'Ship');
export const Shirt = emoji('👕', 'Shirt');
export const ShoppingBag = emoji('🛍️', 'ShoppingBag');
export const ShoppingBasket = emoji('🧺', 'ShoppingBasket');
export const ShoppingCart = emoji('🛒', 'ShoppingCart');
export const Smartphone = emoji('📱', 'Smartphone');
export const Soup = emoji('🍲', 'Soup');
export const Sparkles = emoji('✨', 'Sparkles');
export const Sprout = emoji('🌱', 'Sprout');
export const Star = emoji('⭐', 'Star');
export const Stethoscope = emoji('🩺', 'Stethoscope');
export const StickyNote = emoji('🗒️', 'StickyNote');
export const Store = emoji('🏪', 'Store');
export const Sun = emoji('☀️', 'Sun');
export const Swords = emoji('⚔️', 'Swords');
export const Tablet = emoji('📱', 'Tablet');
export const Tag = emoji('🏷️', 'Tag');
export const Target = emoji('🎯', 'Target');
export const Tent = emoji('⛺', 'Tent');
export const Thermometer = emoji('🌡️', 'Thermometer');
export const Ticket = emoji('🎟️', 'Ticket');
export const TrendingDown = emoji('📉', 'TrendingDown');
export const TrendingUp = emoji('📈', 'TrendingUp');
export const Trophy = emoji('🏆', 'Trophy');
export const Train = emoji('🚆', 'Train');
export const Truck = emoji('🚚', 'Truck');
export const Tv = emoji('📺', 'Tv');
export const Tv2 = emoji('📺', 'Tv2');
export const Umbrella = emoji('☂️', 'Umbrella');
export const User = emoji('👤', 'User');
export const UserCircle = emoji('👤', 'UserCircle');
export const Users = emoji('👨‍👩‍👧', 'Users');
export const UtensilsCrossed = emoji('🍽️', 'UtensilsCrossed');
export const Vault = emoji('🔐', 'Vault');
export const Wallet = emoji('👛', 'Wallet');
export const Wand2 = emoji('🪄', 'Wand2');
export const Watch = emoji('⌚', 'Watch');
export const Wifi = emoji('📶', 'Wifi');
export const Wine = emoji('🍷', 'Wine');
export const Wrench = emoji('🔧', 'Wrench');
export const Zap = emoji('⚡', 'Zap');
