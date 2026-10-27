/** Ícones do módulo — mesmo traço Hugeicons do kit (ver ui/icons.tsx). */
import { makeIcon } from "@/components/ui/icons";
import { DropletIcon, MinusSignIcon, RulerIcon } from "@hugeicons/core-free-icons";

export const IconMinus = makeIcon(MinusSignIcon, "IconMinus");
export const IconDrop = makeIcon(DropletIcon, "IconDrop");
export const IconRuler = makeIcon(RulerIcon, "IconRuler");
