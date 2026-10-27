/**
 * Ícones do LashOS — Hugeicons (traço arredondado 1.5, licença MIT).
 * API estável: <IconCalendar width={18} height={18} className="..." />.
 * Para um ícone novo, importe o glifo de @hugeicons/core-free-icons e use makeIcon.
 */
import type { SVGProps } from "react";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  Add01Icon,
  Alert02Icon,
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowUp01Icon,
  ArrowUpRight01Icon,
  Award01Icon,
  Calculator01Icon,
  Calendar03Icon,
  CalendarAdd01Icon,
  CalendarRemove02Icon,
  Call02Icon,
  Camera01Icon,
  Cancel01Icon,
  ChartHistogramIcon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  Coins01Icon,
  Copy01Icon,
  CreditCardIcon,
  CustomerSupportIcon,
  DashboardCircleIcon,
  Delete02Icon,
  Download01Icon,
  FilterHorizontalIcon,
  GiftIcon,
  HelpCircleIcon,
  Idea01Icon,
  InformationCircleIcon,
  Link01Icon,
  Location01Icon,
  Logout03Icon,
  Mail01Icon,
  Message01Icon,
  Money03Icon,
  MoreHorizontalIcon,
  Mortarboard01Icon,
  Note01Icon,
  Notification03Icon,
  PackageIcon,
  PencilEdit02Icon,
  PercentCircleIcon,
  PlusSignIcon,
  RefreshIcon,
  ScissorIcon,
  Search01Icon,
  Settings01Icon,
  Share08Icon,
  SparklesIcon,
  SquareLock02Icon,
  StarIcon,
  Store01Icon,
  Tick02Icon,
  TaskDone01Icon,
  Upload01Icon,
  UserAdd01Icon,
  UserGroupIcon,
  UserMultiple02Icon,
  ViewIcon,
  ViewOffIcon,
  Wallet01Icon,
  WhatsappIcon,
} from "@hugeicons/core-free-icons";

export type IconProps = Omit<SVGProps<SVGSVGElement>, "ref">;

/** Transforma um glifo do Hugeicons num componente com a API dos ícones do app. */
export function makeIcon(glyph: IconSvgElement, name: string) {
  function Icon({ width, height, strokeWidth, ...rest }: IconProps) {
    return (
      <HugeiconsIcon
        icon={glyph}
        size={width ?? height ?? 20}
        strokeWidth={strokeWidth === undefined ? undefined : Number(strokeWidth)}
        aria-hidden
        {...rest}
      />
    );
  }
  Icon.displayName = name;
  return Icon;
}

// Navegação
export const IconHome = makeIcon(DashboardCircleIcon, "IconHome");
export const IconCalendar = makeIcon(Calendar03Icon, "IconCalendar");
export const IconUsers = makeIcon(UserGroupIcon, "IconUsers");
export const IconChat = makeIcon(Message01Icon, "IconChat");
export const IconMoney = makeIcon(Money03Icon, "IconMoney");
export const IconWallet = makeIcon(Wallet01Icon, "IconWallet");
export const IconMore = makeIcon(MoreHorizontalIcon, "IconMore");
export const IconChart = makeIcon(ChartHistogramIcon, "IconChart");
export const IconBox = makeIcon(PackageIcon, "IconBox");
export const IconSettings = makeIcon(Settings01Icon, "IconSettings");
export const IconScissors = makeIcon(ScissorIcon, "IconScissors");
export const IconTrophy = makeIcon(Award01Icon, "IconTrophy");
export const IconCalculator = makeIcon(Calculator01Icon, "IconCalculator");
export const IconHelp = makeIcon(HelpCircleIcon, "IconHelp");
export const IconSupport = makeIcon(CustomerSupportIcon, "IconSupport");
export const IconNote = makeIcon(Note01Icon, "IconNote");
export const IconStore = makeIcon(Store01Icon, "IconStore");
export const IconTeam = makeIcon(UserMultiple02Icon, "IconTeam");

// Ações
export const IconPlus = makeIcon(PlusSignIcon, "IconPlus");
export const IconPlusCircle = makeIcon(Add01Icon, "IconPlusCircle");
export const IconEdit = makeIcon(PencilEdit02Icon, "IconEdit");
export const IconTrash = makeIcon(Delete02Icon, "IconTrash");
export const IconCopy = makeIcon(Copy01Icon, "IconCopy");
export const IconLink = makeIcon(Link01Icon, "IconLink");
export const IconShare = makeIcon(Share08Icon, "IconShare");
export const IconUpload = makeIcon(Upload01Icon, "IconUpload");
export const IconDownload = makeIcon(Download01Icon, "IconDownload");
export const IconSearch = makeIcon(Search01Icon, "IconSearch");
export const IconFilter = makeIcon(FilterHorizontalIcon, "IconFilter");
export const IconRefresh = makeIcon(RefreshIcon, "IconRefresh");
export const IconLogout = makeIcon(Logout03Icon, "IconLogout");
export const IconUserAdd = makeIcon(UserAdd01Icon, "IconUserAdd");
export const IconCalendarAdd = makeIcon(CalendarAdd01Icon, "IconCalendarAdd");
export const IconCalendarX = makeIcon(CalendarRemove02Icon, "IconCalendarX");
export const IconExternal = makeIcon(ArrowUpRight01Icon, "IconExternal");

// Setas
export const IconChevronRight = makeIcon(ArrowRight01Icon, "IconChevronRight");
export const IconChevronLeft = makeIcon(ArrowLeft01Icon, "IconChevronLeft");
export const IconChevronDown = makeIcon(ArrowDown01Icon, "IconChevronDown");
export const IconChevronUp = makeIcon(ArrowUp01Icon, "IconChevronUp");

// Estado e informação
export const IconCheck = makeIcon(Tick02Icon, "IconCheck");
export const IconCheckCircle = makeIcon(CheckmarkCircle02Icon, "IconCheckCircle");
export const IconX = makeIcon(Cancel01Icon, "IconX");
export const IconAlert = makeIcon(Alert02Icon, "IconAlert");
export const IconInfo = makeIcon(InformationCircleIcon, "IconInfo");
export const IconBulb = makeIcon(Idea01Icon, "IconBulb");
export const IconClock = makeIcon(Clock01Icon, "IconClock");
export const IconBell = makeIcon(Notification03Icon, "IconBell");
export const IconLock = makeIcon(SquareLock02Icon, "IconLock");
export const IconEye = makeIcon(ViewIcon, "IconEye");
export const IconEyeOff = makeIcon(ViewOffIcon, "IconEyeOff");
export const IconSparkles = makeIcon(SparklesIcon, "IconSparkles");
export const IconStar = makeIcon(StarIcon, "IconStar");
export const IconTaskDone = makeIcon(TaskDone01Icon, "IconTaskDone");
export const IconTutorial = makeIcon(Mortarboard01Icon, "IconTutorial");

// Conteúdo
export const IconCamera = makeIcon(Camera01Icon, "IconCamera");
export const IconWhatsApp = makeIcon(WhatsappIcon, "IconWhatsApp");
export const IconGift = makeIcon(GiftIcon, "IconGift");
export const IconPhone = makeIcon(Call02Icon, "IconPhone");
export const IconMail = makeIcon(Mail01Icon, "IconMail");
export const IconLocation = makeIcon(Location01Icon, "IconLocation");
export const IconCard = makeIcon(CreditCardIcon, "IconCard");
export const IconCoins = makeIcon(Coins01Icon, "IconCoins");
export const IconPercent = makeIcon(PercentCircleIcon, "IconPercent");
