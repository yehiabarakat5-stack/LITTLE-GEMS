import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useVisitRequestAlertPrefs, useVisitRequestAudioUnlock } from "@/hooks/useVisitRequestAlerts";
import { useVisitRequests, type VisitRequest } from "@/hooks/useVisitRequests";
import { supabase } from "@/integrations/supabase/client";
import {
  VISIT_REQUEST_ALARM_CHANNEL,
  VISIT_REQUEST_ALERT_BRANCH_ID,
  VISIT_REQUEST_ALERT_BRAND,
  isTodoVisitRequest,
  isVisitRequestAlarmPlaying,
  newestNewVisitRequest,
  startVisitRequestAlarm,
  stopVisitRequestAlarm,
  todoVisitRequests,
  visitRequestAlarmBanner,
  visitRequestAlarmPayload,
  visitRequestNewToast,
  visitRequestTabTitle,
  type VisitRequestAlarmMessage,
  type VisitRequestAlarmPayload,
} from "@/lib/visitRequestAlerts";

const EMPTY: VisitRequest[] = [];

/** Tab title, toast, looping alarm + banner, and realtime refresh. Mount once in the dashboard shell. */
export default function VisitRequestAlertHost() {
  const { session, loading } = useAuth();
  const canSee = !loading && !!session;
  const branchId = VISIT_REQUEST_ALERT_BRANCH_ID;
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data, isFetched } = useVisitRequests(canSee ? branchId : null);
  const rows = data ?? EMPTY;
  const open = todoVisitRequests(rows);
  const seenIds = useRef<Set<string> | null>(null);
  const { prefs } = useVisitRequestAlertPrefs();
  const { unlocked, unlock } = useVisitRequestAudioUnlock();
  const [ringing, setRinging] = useState<VisitRequestAlarmPayload | null>(null);
  const prefsRef = useRef(prefs);
  const unlockedRef = useRef(unlocked);
  const ringingRef = useRef(ringing);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  prefsRef.current = prefs;
  unlockedRef.current = unlocked;
  ringingRef.current = ringing;

  const clearBannerTimer = () => {
    if (bannerTimer.current) {
      clearTimeout(bannerTimer.current);
      bannerTimer.current = null;
    }
  };

  const postAlarm = useCallback((msg: VisitRequestAlarmMessage) => {
    try {
      channelRef.current?.postMessage(msg);
    } catch {
      /* ignore */
    }
  }, []);

  const silence = useCallback(
    (broadcast: boolean) => {
      stopVisitRequestAlarm({ silent: true });
      clearBannerTimer();
      setRinging(null);
      if (broadcast) postAlarm({ type: "stop" });
    },
    [postAlarm],
  );

  const beginRing = useCallback(
    (row: VisitRequestAlarmPayload, fromPeer: boolean) => {
      stopVisitRequestAlarm({ silent: true });
      clearBannerTimer();
      setRinging(row);
      const p = prefsRef.current;
      const ms = p.durationSec * 1000;
      const finish = () => silence(!fromPeer);
      if (p.enabled && unlockedRef.current) {
        const played = startVisitRequestAlarm({
          volume: p.volume,
          durationMs: ms,
          style: p.style,
          onEnded: finish,
        });
        if (!played) bannerTimer.current = setTimeout(finish, ms);
      } else {
        bannerTimer.current = setTimeout(finish, ms);
      }
      if (!fromPeer) postAlarm({ type: "start", request: visitRequestAlarmPayload(row) });
    },
    [postAlarm, silence],
  );

  useEffect(() => {
    seenIds.current = null;
  }, [branchId]);

  useEffect(() => {
    if (!canSee) {
      document.title = VISIT_REQUEST_ALERT_BRAND;
      return;
    }
    document.title = visitRequestTabTitle(open.length);
    return () => {
      document.title = VISIT_REQUEST_ALERT_BRAND;
    };
  }, [canSee, open.length]);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const bc = new BroadcastChannel(VISIT_REQUEST_ALARM_CHANNEL);
    channelRef.current = bc;
    bc.onmessage = (event: MessageEvent<VisitRequestAlarmMessage>) => {
      const msg = event.data;
      if (!msg || typeof msg !== "object") return;
      if (msg.type === "stop") silence(false);
      if (msg.type === "start" && msg.request) beginRing(msg.request, true);
    };
    return () => {
      bc.close();
      channelRef.current = null;
    };
  }, [beginRing, silence]);

  useEffect(() => {
    if (!canSee || !isFetched) return;
    if (seenIds.current === null) {
      seenIds.current = new Set(rows.map((row) => row.id));
      return;
    }
    const newest = newestNewVisitRequest(rows, seenIds.current);
    for (const row of rows) {
      if (row.status === "new" && !seenIds.current.has(row.id)) {
        toast.message(visitRequestNewToast(row.contact_name));
      }
      seenIds.current.add(row.id);
    }
    if (newest && prefsRef.current.enabled) beginRing(visitRequestAlarmPayload(newest), false);
  }, [beginRing, canSee, isFetched, rows]);

  useEffect(() => {
    if (!ringing) return;
    const stillTodo = rows.some((row) => row.id === ringing.id && isTodoVisitRequest(row.status));
    if (!stillTodo) silence(true);
  }, [ringing, rows, silence]);

  useEffect(() => {
    if (!prefs.enabled && ringingRef.current) silence(true);
  }, [prefs.enabled, silence]);

  const wasUnlocked = useRef(unlocked);
  useEffect(() => {
    const justUnlocked = unlocked && !wasUnlocked.current;
    wasUnlocked.current = unlocked;
    const current = ringingRef.current;
    if (!justUnlocked || !prefs.enabled || !current || isVisitRequestAlarmPlaying()) return;
    clearBannerTimer();
    stopVisitRequestAlarm({ silent: true });
    const ms = prefs.durationSec * 1000;
    const played = startVisitRequestAlarm({
      volume: prefs.volume,
      durationMs: ms,
      style: prefs.style,
      onEnded: () => silence(true),
    });
    if (!played) bannerTimer.current = setTimeout(() => silence(true), ms);
  }, [unlocked, prefs.enabled, prefs.durationSec, prefs.volume, prefs.style, silence]);

  useEffect(() => {
    if (!canSee || !branchId) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = supabase as any;
    const channel = client
      .channel(`visit-requests-${branchId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "visit_requests", filter: `branch_id=eq.${branchId}` },
        () => {
          void qc.invalidateQueries({ queryKey: ["visit-requests", branchId] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [canSee, branchId, qc]);

  useEffect(
    () => () => {
      stopVisitRequestAlarm({ silent: true });
      clearBannerTimer();
    },
    [],
  );

  if (!canSee) return null;

  const showUnlock = prefs.enabled && !unlocked;

  return (
    <>
      {showUnlock ? (
        <div
          className="flex flex-wrap items-center justify-between gap-2 border-b bg-amber-50 px-3 py-2 text-sm text-amber-950 md:px-8"
          data-testid="visit-request-enable-sound"
        >
          <span>Browsers block audio until you click once.</span>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              void (async () => {
                const ok = await unlock();
                const row = ringingRef.current;
                const p = prefsRef.current;
                if (!ok || !row || !p.enabled) return;
                startVisitRequestAlarm({
                  volume: p.volume,
                  durationMs: p.durationSec * 1000,
                  style: p.style,
                  onEnded: () => silence(true),
                });
              })();
            }}
          >
            Enable sound alerts
          </Button>
        </div>
      ) : null}
      {ringing ? (
        <div
          className="flex flex-wrap items-center justify-between gap-2 bg-red-600 px-3 py-2 text-sm text-white md:px-8"
          data-testid="visit-request-alarm-banner"
          role="alert"
        >
          <span className="font-medium">{visitRequestAlarmBanner(ringing)}</span>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              data-testid="visit-request-alarm-open"
              onClick={() => {
                const id = ringing.id;
                silence(true);
                navigate(`/visit-requests?request=${id}`);
              }}
            >
              Open
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-white/70 bg-transparent text-white hover:bg-white/10 hover:text-white"
              data-testid="visit-request-alarm-stop"
              onClick={() => silence(true)}
            >
              Stop sound
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
