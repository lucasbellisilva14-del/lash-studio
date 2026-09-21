"use server";

import { signOut } from "@/lib/auth";

/** Encerra a sessão e volta pro login — usado no menu Mais e na sidebar. */
export async function sairDaConta(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
