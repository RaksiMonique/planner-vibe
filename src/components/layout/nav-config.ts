import type { LucideIcon } from 'lucide-react';
import type { ModuleKey } from '@/db/schema';
import {
  Activity,
  Calendar,
  CalendarFold,
  CalendarRange,
  ChartColumn,
  BookMarked,
  BookOpen,
  Briefcase,
  CalendarClock,
  CalendarDays,
  ChartPie,
  Clapperboard,
  Clock,
  Dumbbell,
  FileText,
  FolderKanban,
  Gift,
  GraduationCap,
  HandHeart,
  Images,
  LayoutDashboard,
  ListChecks,
  Mountain,
  NotebookPen,
  Orbit,
  PiggyBank,
  Quote,
  Repeat,
  RotateCcw,
  Settings,
  ShieldAlert,
  ShoppingBasket,
  Smile,
  Sparkles,
  Target,
  UtensilsCrossed,
} from 'lucide-react';

/** The release that is currently being built. Items from later releases render as "soon". */
export const CURRENT_RELEASE = 5;

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Release in which the page ships (instructions.md, Build order). */
  release: number;

  /** Settings module that hides this item when switched off. */
  module?: ModuleKey;
};

export type NavGroup = { label: string; items: NavItem[] };

// Mirrors instructions.md 2.3, Primary navigation.
export const navGroups: NavGroup[] = [
  {
    label: 'Dashboard',
    items: [
      { label: 'Today', href: '/dashboard', icon: LayoutDashboard, release: 0 },
      { label: 'This week', href: '/week', icon: CalendarRange, release: 2, module: 'planning' },
      { label: 'Monthly overview', href: '/month', icon: Calendar, release: 2, module: 'planning' },
      { label: 'Quarter', href: '/quarter', icon: CalendarFold, release: 5, module: 'planning' },
      { label: 'Year', href: '/year', icon: Orbit, release: 5, module: 'planning' },
      { label: 'Lifelong', href: '/lifelong', icon: Mountain, release: 5, module: 'life-segments' },
    ],
  },
  {
    label: 'Planning',
    items: [
      { label: 'Calendar', href: '/calendar', icon: CalendarDays, release: 1, module: 'planning' },
      { label: 'Time blocking', href: '/time', icon: Clock, release: 2, module: 'time' },
      {
        label: 'Time analytics',
        href: '/time/analytics',
        icon: ChartColumn,
        release: 5,
        module: 'time',
      },
      { label: 'Routines', href: '/routines', icon: Repeat, release: 2, module: 'routines' },
      { label: 'Tasks', href: '/tasks', icon: ListChecks, release: 1, module: 'planning' },
    ],
  },
  {
    label: 'Life Segments',
    items: [
      { label: 'Segments', href: '/segments', icon: ChartPie, release: 1, module: 'life-segments' },
      { label: 'Goals', href: '/goals', icon: Target, release: 1, module: 'life-segments' },
      {
        label: 'Projects',
        href: '/projects',
        icon: FolderKanban,
        release: 1,
        module: 'life-segments',
      },
    ],
  },
  {
    label: 'Faith and Learning',
    items: [
      { label: 'Bible study', href: '/bible', icon: BookOpen, release: 3, module: 'faith' },
      { label: 'Prayer', href: '/prayer', icon: HandHeart, release: 3, module: 'faith' },
      { label: 'Study planner', href: '/study', icon: GraduationCap, release: 3, module: 'study' },
      { label: 'Reading', href: '/media/reading', icon: BookMarked, release: 3, module: 'media' },
    ],
  },
  {
    label: 'Wellness',
    items: [
      { label: 'Habits', href: '/habits', icon: Activity, release: 2, module: 'habits' },
      {
        label: 'Mood and energy',
        href: '/wellness/mood',
        icon: Smile,
        release: 4,
        module: 'wellness',
      },
      {
        label: 'Self-care',
        href: '/wellness/self-care',
        icon: Sparkles,
        release: 4,
        module: 'wellness',
      },
      {
        label: 'Fitness',
        href: '/wellness/fitness',
        icon: Dumbbell,
        release: 4,
        module: 'wellness',
      },
      {
        label: 'Wellness journal',
        href: '/wellness/journal',
        icon: NotebookPen,
        release: 4,
        module: 'wellness',
      },
    ],
  },
  {
    label: 'Lifestyle',
    items: [
      { label: 'Meals', href: '/meals', icon: UtensilsCrossed, release: 4, module: 'meals' },
      { label: 'Groceries', href: '/groceries', icon: ShoppingBasket, release: 4, module: 'meals' },
      { label: 'Media', href: '/media', icon: Clapperboard, release: 4, module: 'media' },
      { label: 'Gifts', href: '/gifts', icon: Gift, release: 4, module: 'gifts' },
      {
        label: 'Vision boards',
        href: '/vision-boards',
        icon: Images,
        release: 4,
        module: 'vision-boards',
      },
    ],
  },
  {
    label: 'Work',
    items: [
      {
        label: 'Job calendar',
        href: '/work/calendar',
        icon: CalendarClock,
        release: 5,
        module: 'work',
      },
      {
        label: 'Work projects',
        href: '/work/projects',
        icon: Briefcase,
        release: 5,
        module: 'work',
      },
    ],
  },
  {
    label: 'Reviews and Reflection',
    items: [
      { label: 'Journal', href: '/journal', icon: NotebookPen, release: 3, module: 'journal' },
      { label: 'Reviews', href: '/reviews', icon: RotateCcw, release: 3, module: 'reviews' },
    ],
  },
  {
    label: 'Resources',
    items: [
      { label: 'Notes', href: '/notes', icon: FileText, release: 3, module: 'notes' },
      { label: 'Quotes', href: '/notes/quotes', icon: Quote, release: 3, module: 'notes' },
      {
        label: 'Financial snapshot',
        href: '/finance',
        icon: PiggyBank,
        release: 5,
        module: 'finance',
      },
      {
        label: 'Important information',
        href: '/important',
        icon: ShieldAlert,
        release: 4,
        module: 'important-info',
      },
    ],
  },
  {
    label: 'Settings',
    items: [{ label: 'Settings', href: '/settings', icon: Settings, release: 1 }],
  },
];
