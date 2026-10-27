/** Ícones do módulo — mesmo traço Hugeicons do kit (ver ui/icons.tsx). */
import { makeIcon } from "@/components/ui/icons";
import {
  ArrowDown02Icon,
  ArrowTurnBackwardIcon,
  ArrowUp02Icon,
  ClipboardIcon,
  SignatureIcon,
} from "@hugeicons/core-free-icons";

export const IconClipboard = makeIcon(ClipboardIcon, "IconClipboard");
export const IconSignature = makeIcon(SignatureIcon, "IconSignature");
export const IconArrowUp = makeIcon(ArrowUp02Icon, "IconArrowUp");
export const IconArrowDown = makeIcon(ArrowDown02Icon, "IconArrowDown");
export const IconUndo = makeIcon(ArrowTurnBackwardIcon, "IconUndo");
