import { BellOff } from "lucide-react";
import { useVisitRequestAlertPrefs, useVisitRequestAudioUnlock } from "@/hooks/useVisitRequestAlerts";
import { useAuth } from "@/contexts/AuthContext";

/** Shown in the top bar when the alarm cannot play (settings off or audio not unlocked this session). */
export default function VisitRequestMutedBell() {
  const { session, loading } = useAuth();
  const canSee = !loading && !!session;
  const { prefs, setPrefs } = useVisitRequestAlertPrefs();
  const { unlocked, unlock } = useVisitRequestAudioUnlock();

  if (!canSee) return null;
  if (prefs.enabled && unlocked) return null;

  return (
    <button
      type="button"
      className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      aria-label="Enable sound alerts"
      data-testid="visit-request-muted-bell"
      onClick={() => {
        if (!prefs.enabled) setPrefs({ ...prefs, enabled: true });
        void unlock();
      }}
    >
      <BellOff className="h-4 w-4" />
    </button>
  );
}
