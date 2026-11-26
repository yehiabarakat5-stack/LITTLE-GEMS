import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useVisitRequestAlertPrefs, useVisitRequestAudioUnlock } from "@/hooks/useVisitRequestAlerts";
import {
  clientAssessmentContactName,
  clientAssessmentPetName,
  useUnhandledClientAssessments,
} from "@/hooks/useClientAssessmentAlerts";
import { useVisitRequests, type VisitRequest } from "@/hooks/useVisitRequests";
import { supabase } from "@/integrations/supabase/client";
import {
  VISIT_REQUEST_ALARM_CHANNEL,
  VISIT_REQUEST_ALERT_BRANCH_ID,
  VISIT_REQUEST_ALERT_BRAND,
  alarmBannerForPayload,
  alertOpenPath,
  assessmentAlarmPayload,
  assessmentBookingNewToast,
  isTodoVisitRequest,
  isVisitRequestAlarmPlaying,
  newestNewAlertItem,
  newestNewVisitRequest,
  startVisitRequestAlarm,
  stopVisitRequestAlarm,
  todoVisitRequests,
  visitRequestAlarmPayload,
  visitRequestNewToast,
  visitRequestTabTitle,
  type VisitRequestAlarmMessage,
  type VisitRequestAlarmPayload,
} from "@/lib/visitRequestAlerts";

const EMPTY_VISITS: VisitRequest[] = [];

/** Tab title, toast, looping alarm + banner, and realtime refresh. Mount once in the dashboard shell. */
export default function VisitRequestAlertHost() {
  const { session, loading } = useAuth();
  const canSee = !loading && !!session;
  const branchId = VISIT_REQUEST_ALERT_BRANCH_ID;
  const qc = useQueryClient();
  const navigate = useNavigate();
  const visitsQuery = useVisitRequests(canSee ? branchId : null);
  const assessmentsQuery = useUnhandledClientAssessments(canSee ? branchId : null);
  const visitRows = visitsQuery.data ?? EMPTY_VISITS;
  const assessmentRows = assessmentsQuery.data ?? [];
  const openVisits = todoVisitRequests(visitRows);
  const openCount = openVisits.length + assessmentRows.length;
  const isFetched = visitsQuery.isFetched && assessmentsQuery.isFetched;
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

  const openAssessmentIds = useMemo(() => new Set(assessmentRows.map((r) => r.id)), [assessmentRows]);

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
      if (!fromPeer) postAlarm({ type: "start", request: row });
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
    document.title = visitRequestTabTitle(openCount);
    return () => {
      document.title = VISIT_REQUEST_ALERT_BRAND;
    };
  }, [canSee, openCount]);

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
    const allIds = [
      ...visitRows.map((r) => r.id),
      ...assessmentRows.map((r) => r.id),
    ];
    if (seenIds.current === null) {
      seenIds.current = new Set(allIds);
      return;
    }
    const newestVisit = newestNewVisitRequest(visitRows, seenIds.current);
    const newestAssessment = newestNewAlertItem(assessmentRows, seenIds.current);

    for (const row of visitRows) {
      if (row.status === "new" && !seenIds.current.has(row.id)) {
        toast.message(visitRequestNewToast(row.contact_name));
      }
      seenIds.current.add(row.id);
    }
    for (const row of assessmentRows) {
      if (!seenIds.current.has(row.id)) {
        toast.message(assessmentBookingNewToast(clientAssessmentContactName(row)));
      }
      seenIds.current.add(row.id);
    }

    if (!prefsRef.current.enabled) return;
    const candidates: VisitRequestAlarmPayload[] = [];
    if (newestVisit) {
      candidates.push(
        visitRequestAlarmPayload({
          id: newestVisit.id,
          contact_name: newestVisit.contact_name,
          pet_name: newestVisit.pet_name,
          interest: newestVisit.interest,
          created_at: newestVisit.created_at,
        }),
      );
    }
    if (newestAssessment) {
      candidates.push(
        assessmentAlarmPayload({
          id: newestAssessment.id,
          contact_name: clientAssessmentContactName(newestAssessment),
          pet_name: clientAssessmentPetName(newestAssessment),
          created_at: newestAssessment.created_at,
          visit_date: newestAssessment.visit_date,
        }),
      );
    }
    if (!candidates.length) return;
    const newest = candidates.reduce((a, b) => (a.created_at >= b.created_at ? a : b));
    beginRing(newest, false);
  }, [assessmentRows, beginRing, canSee, isFetched, visitRows]);

  useEffect(() => {
    if (!ringing) return;
    const stillOpen =
      ringing.kind === "assessment"
        ? openAssessmentIds.has(ringing.id)
        : visitRows.some((r) => r.id === ringing.id && isTodoVisitRequest(r.status));
    if (!stillOpen) silence(true);
  }, [openAssessmentIds, ringing, silence, visitRows]);

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
      .channel(`request-alerts-${branchId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "visit_requests", filter: `branch_id=eq.${branchId}` },
        () => {
          void qc.invalidateQueries({ queryKey: ["visit-requests", branchId] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "park_bookings", filter: `branch_id=eq.${branchId}` },
        () => {
          void qc.invalidateQueries({ queryKey: ["client-assessment-alerts", branchId] });
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
          <span className="font-medium">{alarmBannerForPayload(ringing)}</span>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              data-testid="visit-request-alarm-open"
              onClick={() => {
                const path = alertOpenPath({
                  id: ringing.id,
                  kind: ringing.kind,
                  visitDate: ringing.visit_date,
                });
                silence(true);
                navigate(path);
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
