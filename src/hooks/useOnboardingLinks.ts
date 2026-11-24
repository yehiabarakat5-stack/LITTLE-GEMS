/**
 * Staff create / list / cancel for client profile links (/join/:token).
 * Calls /api/onboarding-links (proxied to admin-essentials in production) with
 * Little Gems branch so assessment slots and branding stay LG.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type OnboardingStage = "assessment" | "membership" | "pet_profile";

export type OnboardingLink = {
  id: string;
  stage: OnboardingStage;
  status: "sent" | "opened" | "submitted" | "completed" | "expired" | "cancelled";
  url: string;
  ownerId: string | null;
  phone: string | null;
  contactName: string | null;
  conversationId: number | null;
  createdAt: string;
  expiresAt: string;
  openedAt: string | null;
  submittedAt: string | null;
  completedAt: string | null;
  result: Record<string, unknown> | null;
  lastError: string | null;
  prefill?: OnboardingPrefill;
};

export type OnboardingPrefill = {
  owner?: Record<string, string | null>;
  owner_id?: string | null;
  pets?: Array<{
    ref: string;
    id?: string | null;
    name?: string | null;
    species?: string | null;
    breed?: string | null;
    vaccinations?: Array<{ key: string | null; vaccine_name?: string | null; expiry_date?: string | null; source?: string }>;
    documents?: Array<{ path: string; name?: string; source?: string }>;
  }>;
  sources?: Record<string, string>;
  evidence?: Record<string, string>;
  conversation?: { id: number; messageCount: number; inboundCount: number; summary?: string | null } | null;
  notes?: string[];
};

export type CreateOnboardingLinkInput = {
  stage: OnboardingStage;
  ownerId?: string | null;
  phone?: string | null;
  conversationId?: number | null;
  branchCode?: string | null;
  contactName?: string | null;
};

export type CreateOnboardingLinkResult = {
  link: OnboardingLink;
  prefill: OnboardingPrefill;
  message: string;
};

/** Little Gems branch — assessment slots, Chatwoot, branding. */
export const LITTLE_GEMS_BRANCH_CODE = "little_gems";

/**
 * Optional absolute host for /api/onboarding-links (local → admin-essentials).
 * Production uses same-origin + vercel rewrite.
 */
function onboardingApiBase(): string {
  const raw = String(import.meta.env.VITE_ONBOARDING_API_BASE || "").trim();
  return raw.replace(/\/+$/, "");
}

function onboardingUrl(path: string): string {
  const base = onboardingApiBase();
  return base ? `${base}${path}` : path;
}

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function parse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string })?.error || `Request failed (${res.status})`);
  return data as T;
}

export const onboardingLinkKeys = {
  byOwner: (ownerId: string) => ["onboarding-links", "owner", ownerId] as const,
};

export function useOnboardingLinks(ownerId: string | null | undefined) {
  return useQuery({
    queryKey: onboardingLinkKeys.byOwner(ownerId || ""),
    enabled: !!ownerId,
    queryFn: async () => {
      const res = await fetch(onboardingUrl(`/api/onboarding-links?ownerId=${encodeURIComponent(ownerId || "")}`), {
        headers: await authHeaders(),
      });
      const data = await parse<{ links: OnboardingLink[] }>(res);
      return data.links;
    },
  });
}

export function useCreateOnboardingLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateOnboardingLinkInput) => {
      const res = await fetch(onboardingUrl("/api/onboarding-links"), {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({
          ...input,
          branchCode: input.branchCode || LITTLE_GEMS_BRANCH_CODE,
        }),
      });
      return parse<CreateOnboardingLinkResult>(res);
    },
    onSuccess: (data) => {
      if (data.link.ownerId) qc.invalidateQueries({ queryKey: onboardingLinkKeys.byOwner(data.link.ownerId) });
    },
  });
}

export function useCancelOnboardingLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(onboardingUrl("/api/onboarding-links"), {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ action: "cancel", id }),
      });
      return parse<{ link: OnboardingLink }>(res);
    },
    onSuccess: (data) => {
      if (data.link.ownerId) qc.invalidateQueries({ queryKey: onboardingLinkKeys.byOwner(data.link.ownerId) });
    },
  });
}
