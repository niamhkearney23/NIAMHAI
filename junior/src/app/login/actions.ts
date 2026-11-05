"use server";

import { redirect } from "next/navigation";
import { siteUrl } from "@/lib/env";
import { safeNext } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/server";

export interface LoginState {
  step: "email" | "code";
  email: string;
  next: string;
  error?: string;
  notice?: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function sendLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const next = safeNext(formData.get("next"));

  if (!EMAIL.test(email) || email.length > 254) {
    return { step: "email", email, next, error: "Enter a valid email address." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${siteUrl()}/auth/confirm`, shouldCreateUser: true },
  });

  if (error) {
    const wait = error.status === 429 || /rate|seconds/i.test(error.message);
    return {
      step: "email",
      email,
      next,
      error: wait ? "Too many attempts. Wait a minute and try again." : "Junior could not send the email. Try again.",
    };
  }
  return { step: "code", email, next };
}

export async function verifyCode(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const token = String(formData.get("code") ?? "").replace(/\s/g, "");
  const next = safeNext(formData.get("next"));

  if (!/^\d{6,10}$/.test(token)) {
    return { step: "code", email, next, error: "Enter the code from the email." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) {
    return { step: "code", email, next, error: "That code did not work. Check it, or send a new one." };
  }
  redirect(next);
}
