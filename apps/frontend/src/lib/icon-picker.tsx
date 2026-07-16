'use client';

import { useState, useMemo, type CSSProperties } from 'react';
import {
  Search, X,
  Wallet, Banknote, CreditCard, TrendingUp, Landmark, Briefcase, BadgeDollarSign, HandCoins,
  DollarSign, CircleDollarSign, Trophy, Award, Star, Gift, Handshake, Building2, Users, Laptop,
  Smartphone, Store, UtensilsCrossed, Coffee, Pizza, Sandwich, Apple, ShoppingBasket, ShoppingCart,
  ChefHat, Soup, Beef, Wine, GlassWater, Car, Bus, Train, Plane, Bike, Fuel, ParkingCircle, Truck,
  Ship, Navigation, Home, Building, Plug, Droplets, Flame, Wifi, Phone, Tv, Wrench, Hammer, Key,
  Thermometer, HeartPulse, Stethoscope, Pill, Hospital, Dumbbell, Activity, Eye, SmilePlus, Leaf,
  Brain, Baby, GraduationCap, BookOpen, School, Library, PenTool, Monitor, FlaskConical, Calculator,
  Languages, Gamepad2, Clapperboard, Music, Camera, Ticket, Book, Palette, Tent, Umbrella, Tv2,
  Headphones, Dice5, Shirt, Scissors, Sparkles, Watch, Glasses, Footprints, ShoppingBag, PawPrint,
  Fish, Bird, Rabbit, Bone, PiggyBank, BarChart2, Shield, Lock, Vault, LineChart, Bitcoin, Coins,
  Target, Gem, Archive, Receipt, FileText, ShieldCheck, ClipboardList, ArrowLeftRight, Percent, Cpu,
  HardDrive, Cloud, Server, Bot, Code, Printer, Tablet, Tag, Folder, Bookmark, Bell, HelpCircle,
  MoreHorizontal, Infinity as InfinityIcon,
  type LucideIcon as LucideIconType,
} from 'lucide-react';
import { ICON_CATALOG, UNIQUE_ICONS, type IconCatalogEntry } from './icon-catalog';

type Props = {
  selected: string;
  onSelect: (name: string) => void;
};

// Next.js otimiza barrel imports do lucide-react e quebra lookup dinâmico
// (import * as LucideIcons + LucideIcons[name]). Por isso mapeamos explicitamente
// só os ícones usados no ICON_CATALOG.
const ICON_MAP: Record<string, LucideIconType> = {
  Wallet, Banknote, CreditCard, TrendingUp, Landmark, Briefcase, BadgeDollarSign, HandCoins,
  DollarSign, CircleDollarSign, Trophy, Award, Star, Gift, Handshake, Building2, Users, Laptop,
  Smartphone, Store, UtensilsCrossed, Coffee, Pizza, Sandwich, Apple, ShoppingBasket, ShoppingCart,
  ChefHat, Soup, Beef, Wine, GlassWater, Car, Bus, Train, Plane, Bike, Fuel, ParkingCircle, Truck,
  Ship, Navigation, Home, Building, Plug, Droplets, Flame, Wifi, Phone, Tv, Wrench, Hammer, Key,
  Thermometer, HeartPulse, Stethoscope, Pill, Hospital, Dumbbell, Activity, Eye, SmilePlus, Leaf,
  Brain, Baby, GraduationCap, BookOpen, School, Library, PenTool, Monitor, FlaskConical, Calculator,
  Languages, Gamepad2, Clapperboard, Music, Camera, Ticket, Book, Palette, Tent, Umbrella, Tv2,
  Headphones, Dice5, Shirt, Scissors, Sparkles, Watch, Glasses, Footprints, ShoppingBag, PawPrint,
  Fish, Bird, Rabbit, Bone, PiggyBank, BarChart2, Shield, Lock, Vault, LineChart, Bitcoin, Coins,
  Target, Gem, Archive, Receipt, FileText, ShieldCheck, ClipboardList, ArrowLeftRight, Percent, Cpu,
  HardDrive, Cloud, Server, Bot, Code, Printer, Tablet, Tag, Folder, Bookmark, Bell, HelpCircle,
  MoreHorizontal, Infinity: InfinityIcon,
};

/**
 * Renderiza qualquer ícone Lucide pelo nome do componente.
 * Fallback para HelpCircle se o nome não existir no ICON_MAP.
 */
export function LucideIcon({
  name,
  size = 20,
  className,
  style,
}: {
  name: string;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const IconComponent = ICON_MAP[name] ?? HelpCircle;
  return <IconComponent size={size} className={className} style={style} />;
}

export function IconPicker({ selected, onSelect }: Props) {
  const [search, setSearch] = useState('');
  const [section, setSection] = useState<string>('Todos');

  const filteredIcons = useMemo<IconCatalogEntry[]>(() => {
    const q = search.toLowerCase().trim();

    if (section !== 'Todos') {
      const cat = ICON_CATALOG.find((s) => s.section === section);
      const list = cat?.icons ?? [];
      return q ? list.filter((i) => i.label.toLowerCase().includes(q) || i.name.toLowerCase().includes(q)) : list;
    }

    if (q) {
      return UNIQUE_ICONS.filter(
        (i) => i.label.toLowerCase().includes(q) || i.name.toLowerCase().includes(q),
      );
    }

    return UNIQUE_ICONS;
  }, [search, section]);

  const sections = ['Todos', ...ICON_CATALOG.map((s) => s.section)];

  return (
    <div className="flex flex-col gap-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar ícone…"
          className="w-full rounded-xl border-2 border-slate-200 pl-9 pr-8 py-2 text-sm outline-none focus:border-emerald-400 transition"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Category tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {sections.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSection(s)}
            className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-semibold transition ${
              section === s
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Icon grid */}
      <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2">
        {filteredIcons.length === 0 && (
          <div className="col-span-8 py-8 text-center text-sm text-slate-400">
            Nenhum ícone encontrado.
          </div>
        )}
        {filteredIcons.map((icon) => (
          <button
            key={icon.name}
            type="button"
            title={icon.label}
            onClick={() => onSelect(icon.name)}
            className={`flex items-center justify-center h-9 w-9 rounded-lg transition ${
              selected === icon.name
                ? 'bg-emerald-100 ring-2 ring-emerald-500 scale-110'
                : 'hover:bg-slate-200 text-slate-700'
            }`}
          >
            <LucideIcon name={icon.name} size={18} />
          </button>
        ))}
      </div>

      <p className="text-xs text-slate-400 text-right">
        {filteredIcons.length} ícone{filteredIcons.length !== 1 ? 's' : ''}
      </p>
    </div>
  );
}
