import { brandCampusName } from "@/lib/brandDisplay";
import {
  VISIT_INTEREST_LABEL,
  type VisitRequestInterest,
  type VisitRequestStatus,
} from "@/hooks/useVisitRequests";

/** Little Gems — little-gems app alerts only for this campus. */
export const VISIT_REQUEST_ALERT_BRANCH_ID = "5a6cb25d-944f-448e-9666-ac58d7ba812b";
export const VISIT_REQUEST_ALERT_BRAND = brandCampusName("little_gems");

export const VISIT_REQUEST_TODO_STATUS: VisitRequestStatus = "new";
export const VISIT_REQUEST_WAIT_ALERT_MINUTES = 30;
export const VISIT_REQUEST_POLL_MS = 30_000;
export const VISIT_REQUEST_SOUND_MUTE_KEY = "visit-request-sound-muted";
export const VISIT_REQUEST_ALERT_PREFS_KEY = "visit-request-alert-prefs";
export const VISIT_REQUEST_ALERT_PREFS_EVENT = "visit-request-alert-prefs";
export const VISIT_REQUEST_AUDIO_OPT_IN_KEY = "visit-request-audio-enabled";
export const VISIT_REQUEST_AUDIO_EVENT = "visit-request-audio-unlocked";
export const VISIT_REQUEST_ALARM_CHANNEL = "lg-visit-request-alarm";
export const VISIT_REQUEST_ALARM_DEFAULT_DURATION_SEC = 60;
export const VISIT_REQUEST_ALARM_DEFAULT_VOLUME = 0.55;
export const VISIT_REQUEST_ALARM_MIN_DURATION_SEC = 10;
export const VISIT_REQUEST_ALARM_MAX_DURATION_SEC = 180;
export const VISIT_REQUEST_CHIME_REPEAT_MS = 10_000;
export const VISIT_REQUEST_SPEAK_TEXT = "New booking request";
export const VISIT_REQUEST_CHIME_GAIN = 0.72;
export const VISIT_REQUEST_AUDIO_START_OFFSET_SEC = 0.05;
export const VISIT_REQUEST_VOICE_URL = "/sounds/new-booking-request.m4a";

export type VisitRequestSoundStyle = "chime_voice" | "chime";

export type VisitRequestAlertPrefs = {
  enabled: boolean;
  volume: number;
  durationSec: number;
  style: VisitRequestSoundStyle;
};

export function isTodoVisitRequest(status: VisitRequestStatus | string | null | undefined) {
  return status === VISIT_REQUEST_TODO_STATUS;
}

export function todoVisitRequests<T extends { status: VisitRequestStatus | string }>(rows: T[]): T[] {
  return rows.filter((row) => isTodoVisitRequest(row.status));
}

export function visitRequestTabTitle(count: number, brand = VISIT_REQUEST_ALERT_BRAND) {
  if (count <= 0) return brand;
  return `(${count}) ${brand}`;
}

export function visitRequestWaitingMinutes(createdAt: string, nowMs = Date.now()) {
  const t = new Date(createdAt).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((nowMs - t) / 60_000));
}

export function isVisitRequestWaitingTooLong(createdAt: string, nowMs = Date.now()) {
  return visitRequestWaitingMinutes(createdAt, nowMs) >= VISIT_REQUEST_WAIT_ALERT_MINUTES;
}

export function visitRequestWaitingLabel(minutes: number) {
  return `Waiting ${minutes} min`;
}

export function visitRequestNewToast(name: string) {
  const who = name.trim() || "a client";
  return `New request from ${who}`;
}

export type VisitRequestNotice = {
  id: string;
  kind: "visit" | "assessment";
  contactName: string;
  pet: string;
  service: string;
  requestedAt: string;
  visitDate?: string | null;
};

export function visitRequestNotice(row: {
  id: string;
  contact_name: string;
  pet_name?: string | null;
  interest?: VisitRequestInterest | null;
  created_at: string;
}): VisitRequestNotice {
  return {
    id: row.id,
    kind: "visit",
    contactName: row.contact_name.trim() || "Client",
    pet: row.pet_name?.trim() || "Pet not given",
    service: row.interest ? VISIT_INTEREST_LABEL[row.interest] : "Visit",
    requestedAt: row.created_at,
  };
}

export function assessmentBookingNotice(row: {
  id: string;
  contact_name: string;
  pet_name?: string | null;
  created_at: string;
  visit_date?: string | null;
}): VisitRequestNotice {
  return {
    id: row.id,
    kind: "assessment",
    contactName: row.contact_name.trim() || "Client",
    pet: row.pet_name?.trim() || "Pet not given",
    service: "New assessment booking",
    requestedAt: row.created_at,
    visitDate: row.visit_date ?? null,
  };
}

export function visitRequestAlarmBanner(row: Parameters<typeof visitRequestNotice>[0]) {
  const n = visitRequestNotice(row);
  return `🔔 New request from ${n.contactName} — ${n.pet}, ${n.service}`;
}

export function assessmentBookingAlarmBanner(row: {
  contact_name: string;
  pet_name?: string | null;
}) {
  const who = row.contact_name.trim() || "Client";
  const pet = row.pet_name?.trim() || "Pet";
  return `🔔 New assessment booking from ${who} — ${pet}, New assessment booking`;
}

export function assessmentBookingNewToast(name: string) {
  const who = name.trim() || "a client";
  return `New assessment booking from ${who}`;
}

export function alertOpenPath(notice: Pick<VisitRequestNotice, "id" | "kind" | "visitDate">) {
  if (notice.kind === "assessment") {
    const date = notice.visitDate || "";
    const q = new URLSearchParams({ type: "assessment", booking: notice.id });
    if (date) q.set("date", date);
    return `/park?${q.toString()}`;
  }
  return `/visit-requests?request=${notice.id}`;
}

export function newestNewVisitRequest<T extends { id: string; status: string; created_at: string }>(
  rows: T[],
  seenIds: Set<string>,
): T | null {
  const fresh = rows.filter((row) => isTodoVisitRequest(row.status) && !seenIds.has(row.id));
  if (fresh.length === 0) return null;
  return fresh.reduce((latest, row) => (row.created_at >= latest.created_at ? row : latest));
}

export function newestNewAlertItem<T extends { id: string; created_at: string }>(
  rows: T[],
  seenIds: Set<string>,
): T | null {
  const fresh = rows.filter((row) => !seenIds.has(row.id));
  if (fresh.length === 0) return null;
  return fresh.reduce((latest, row) => (row.created_at >= latest.created_at ? row : latest));
}

export function parseVisitRequestSoundStyle(raw: unknown): VisitRequestSoundStyle {
  return raw === "chime" ? "chime" : "chime_voice";
}

export function defaultVisitRequestAlertPrefs(): VisitRequestAlertPrefs {
  return {
    enabled: true,
    volume: VISIT_REQUEST_ALARM_DEFAULT_VOLUME,
    durationSec: VISIT_REQUEST_ALARM_DEFAULT_DURATION_SEC,
    style: "chime_voice",
  };
}

export function clampVisitRequestAlertVolume(value: number) {
  if (!Number.isFinite(value)) return VISIT_REQUEST_ALARM_DEFAULT_VOLUME;
  return Math.min(1, Math.max(0, value));
}

export function clampVisitRequestAlertDurationSec(value: number) {
  if (!Number.isFinite(value)) return VISIT_REQUEST_ALARM_DEFAULT_DURATION_SEC;
  return Math.min(
    VISIT_REQUEST_ALARM_MAX_DURATION_SEC,
    Math.max(VISIT_REQUEST_ALARM_MIN_DURATION_SEC, Math.round(value)),
  );
}

export function parseVisitRequestAlertPrefs(raw: unknown): VisitRequestAlertPrefs {
  const fallback = defaultVisitRequestAlertPrefs();
  if (!raw || typeof raw !== "object") return fallback;
  const o = raw as Record<string, unknown>;
  return {
    enabled: o.enabled === undefined ? fallback.enabled : Boolean(o.enabled),
    volume: clampVisitRequestAlertVolume(typeof o.volume === "number" ? o.volume : fallback.volume),
    durationSec: clampVisitRequestAlertDurationSec(
      typeof o.durationSec === "number" ? o.durationSec : fallback.durationSec,
    ),
    style: parseVisitRequestSoundStyle(o.style),
  };
}

export function readVisitRequestAlertPrefs(): VisitRequestAlertPrefs {
  const fallback = defaultVisitRequestAlertPrefs();
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(VISIT_REQUEST_ALERT_PREFS_KEY);
    if (raw) return parseVisitRequestAlertPrefs(JSON.parse(raw));
    if (window.localStorage.getItem(VISIT_REQUEST_SOUND_MUTE_KEY) === "1") {
      return { ...fallback, enabled: false };
    }
  } catch {
    /* ignore */
  }
  return fallback;
}

export function writeVisitRequestAlertPrefs(prefs: VisitRequestAlertPrefs) {
  const next = parseVisitRequestAlertPrefs(prefs);
  if (typeof window === "undefined") return next;
  try {
    window.localStorage.setItem(VISIT_REQUEST_ALERT_PREFS_KEY, JSON.stringify(next));
    window.localStorage.setItem(VISIT_REQUEST_SOUND_MUTE_KEY, next.enabled ? "0" : "1");
  } catch {
    /* ignore quota / private mode */
  }
  window.dispatchEvent(new Event(VISIT_REQUEST_ALERT_PREFS_EVENT));
  return next;
}

export function hasVisitRequestAudioOptIn() {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(VISIT_REQUEST_AUDIO_OPT_IN_KEY) === "1";
  } catch {
    return false;
  }
}

export type VisitRequestAlarmPayload = {
  id: string;
  kind: "visit" | "assessment";
  contact_name: string;
  pet_name: string | null;
  interest: VisitRequestInterest | null;
  created_at: string;
  visit_date?: string | null;
};

export type VisitRequestAlarmMessage =
  | { type: "start"; request: VisitRequestAlarmPayload }
  | { type: "stop" };

export function visitRequestAlarmPayload(row: {
  id: string;
  contact_name: string;
  pet_name: string | null;
  interest?: VisitRequestInterest | null;
  created_at: string;
}): VisitRequestAlarmPayload {
  return {
    id: row.id,
    kind: "visit",
    contact_name: row.contact_name,
    pet_name: row.pet_name,
    interest: row.interest ?? null,
    created_at: row.created_at,
  };
}

export function assessmentAlarmPayload(row: {
  id: string;
  contact_name: string;
  pet_name: string | null;
  created_at: string;
  visit_date?: string | null;
}): VisitRequestAlarmPayload {
  return {
    id: row.id,
    kind: "assessment",
    contact_name: row.contact_name,
    pet_name: row.pet_name,
    interest: null,
    created_at: row.created_at,
    visit_date: row.visit_date ?? null,
  };
}

export function alarmBannerForPayload(row: VisitRequestAlarmPayload) {
  if (row.kind === "assessment") {
    return assessmentBookingAlarmBanner(row);
  }
  return visitRequestAlarmBanner({
    id: row.id,
    contact_name: row.contact_name,
    pet_name: row.pet_name,
    interest: row.interest,
    created_at: row.created_at,
  });
}

type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };

let audioCtx: AudioContext | null = null;
let chimeNodes: Array<{ osc: OscillatorNode; gain: GainNode }> = [];
let voiceSource: AudioBufferSourceNode | null = null;
let voiceGain: GainNode | null = null;
let voiceBuffer: AudioBuffer | null = null;
let voiceEl: HTMLAudioElement | null = null;
let cycleTimer: ReturnType<typeof setInterval> | null = null;
let speakTimer: ReturnType<typeof setTimeout> | null = null;
let alarmStopTimer: ReturnType<typeof setTimeout> | null = null;
let alarmEnded: (() => void) | null = null;
let alarmPlaying = false;
let activeStyle: VisitRequestSoundStyle = "chime_voice";
let activeVolume = VISIT_REQUEST_ALARM_DEFAULT_VOLUME;

function audioContextCtor() {
  if (typeof window === "undefined") return null;
  const w = window as AudioWindow;
  return w.AudioContext || w.webkitAudioContext || null;
}

/** Existing unlocked context only — never create one outside a user gesture. */
export function getVisitRequestAudioContext() {
  if (audioCtx && audioCtx.state !== "closed") return audioCtx;
  return null;
}

export function isVisitRequestAudioUnlocked() {
  return audioCtx?.state === "running";
}

export function isVisitRequestAlarmPlaying() {
  return alarmPlaying;
}

function markAudioOptIn() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(VISIT_REQUEST_AUDIO_OPT_IN_KEY, "1");
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(VISIT_REQUEST_AUDIO_EVENT));
}

async function primeVoiceClip(ctx: AudioContext) {
  if (typeof window === "undefined") return;
  if (!voiceEl) {
    voiceEl = new Audio(VISIT_REQUEST_VOICE_URL);
    voiceEl.preload = "auto";
  }
  voiceEl.volume = 0.01;
  try {
    await voiceEl.play();
  } catch {
    /* autoplay may still fail; BufferSource is the main path */
  }
  voiceEl.pause();
  try {
    voiceEl.currentTime = 0;
  } catch {
    /* ignore */
  }
  if (!voiceBuffer) {
    try {
      const res = await fetch(VISIT_REQUEST_VOICE_URL);
      const bytes = await res.arrayBuffer();
      voiceBuffer = await ctx.decodeAudioData(bytes.slice(0));
    } catch {
      /* HTML audio / speech fallback */
    }
  }
}

/**
 * Create or reuse ONE AudioContext and resume it inside a click.
 * Also primes the recorded "New booking request" clip.
 */
export async function unlockVisitRequestAudio() {
  const Ctor = audioContextCtor();
  if (!Ctor) return false;
  if (!audioCtx || audioCtx.state === "closed") {
    audioCtx = new Ctor();
  }
  try {
    await audioCtx.resume();
  } catch {
    return false;
  }
  await primeVoiceClip(audioCtx);
  markAudioOptIn();
  return audioCtx.state === "running";
}

const FEMALE_VOICE = /female|samantha|victoria|karen|moira|tessa|zira|susan|fiona|kate|serena|salli|joanna|ivy|linda|hazel|google uk english female|google us english/i;

export function pickVisitRequestVoice<T extends { name: string; lang: string }>(voices: T[]): T | null {
  if (!voices.length) return null;
  const en = voices.filter((v) => /^en([-_]|$)/i.test(v.lang) || /english/i.test(v.name));
  const pool = en.length ? en : voices;
  const female = pool.find((v) => FEMALE_VOICE.test(v.name));
  const gb = pool.find((v) => /^en-GB/i.test(v.lang) && FEMALE_VOICE.test(v.name));
  return gb ?? female ?? pool[0] ?? null;
}

function stopChimeNodes() {
  for (const node of chimeNodes) {
    try {
      node.osc.stop();
    } catch {
      /* already stopped */
    }
    try {
      node.osc.disconnect();
    } catch {
      /* ignore */
    }
    try {
      node.gain.disconnect();
    } catch {
      /* ignore */
    }
  }
  chimeNodes = [];
}

function stopVoiceNodes() {
  try {
    voiceSource?.stop();
  } catch {
    /* ignore */
  }
  try {
    voiceSource?.disconnect();
  } catch {
    /* ignore */
  }
  try {
    voiceGain?.disconnect();
  } catch {
    /* ignore */
  }
  voiceSource = null;
  voiceGain = null;
  if (voiceEl) {
    voiceEl.pause();
    try {
      voiceEl.currentTime = 0;
    } catch {
      /* ignore */
    }
  }
}

function cancelSpeech() {
  if (speakTimer) {
    clearTimeout(speakTimer);
    speakTimer = null;
  }
  stopVoiceNodes();
  try {
    window.speechSynthesis?.cancel();
  } catch {
    /* ignore */
  }
}

function disconnectAlarmNodes() {
  if (cycleTimer) {
    clearInterval(cycleTimer);
    cycleTimer = null;
  }
  if (alarmStopTimer) {
    clearTimeout(alarmStopTimer);
    alarmStopTimer = null;
  }
  cancelSpeech();
  stopChimeNodes();
  alarmPlaying = false;
}

function chimePeak(volume: number) {
  return Math.max(0.05, clampVisitRequestAlertVolume(volume) * VISIT_REQUEST_CHIME_GAIN);
}

/** Soft 3-note reception chime on the unlocked context. Returns length in seconds. */
function scheduleVisitRequestChime(ctx: AudioContext, t0: number, volume: number) {
  stopChimeNodes();
  const peak = chimePeak(volume);
  const notes = [
    { freq: 392.0, at: 0, dur: 0.55 },
    { freq: 523.25, at: 0.26, dur: 0.55 },
    { freq: 659.25, at: 0.52, dur: 0.72 },
  ];
  for (const note of notes) {
    for (const type of ["sine", "triangle"] as const) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      const start = t0 + note.at;
      const stop = start + note.dur;
      const amp = type === "sine" ? peak : peak * 0.45;
      osc.frequency.setValueAtTime(note.freq, start);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(amp, start + 0.04);
      gain.gain.linearRampToValueAtTime(amp * 0.55, start + note.dur * 0.45);
      gain.gain.linearRampToValueAtTime(0, stop);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(stop + 0.02);
      chimeNodes.push({ osc, gain });
    }
  }
  return 1.28;
}

function speakVisitRequestFallback(volume: number) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const synth = window.speechSynthesis;
  const speak = () => {
    try {
      synth.cancel();
      try {
        synth.resume();
      } catch {
        /* ignore */
      }
      const utter = new SpeechSynthesisUtterance(VISIT_REQUEST_SPEAK_TEXT);
      utter.lang = "en-GB";
      utter.rate = 0.9;
      utter.pitch = 1;
      utter.volume = clampVisitRequestAlertVolume(volume);
      const voice = pickVisitRequestVoice(synth.getVoices());
      if (voice) utter.voice = voice;
      synth.speak(utter);
    } catch {
      /* ignore */
    }
  };
  if (synth.getVoices().length) {
    speak();
    return;
  }
  const done = () => {
    synth.removeEventListener("voiceschanged", done);
    speak();
  };
  synth.addEventListener("voiceschanged", done);
  window.setTimeout(done, 400);
}

function playRecordedVoice(ctx: AudioContext, when: number, volume: number) {
  const gainValue = clampVisitRequestAlertVolume(volume);
  if (voiceBuffer) {
    stopVoiceNodes();
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    src.buffer = voiceBuffer;
    gain.gain.setValueAtTime(gainValue, when);
    src.connect(gain);
    gain.connect(ctx.destination);
    src.start(Math.max(when, ctx.currentTime + VISIT_REQUEST_AUDIO_START_OFFSET_SEC));
    voiceSource = src;
    voiceGain = gain;
    return;
  }
  const delayMs = Math.max(0, (when - ctx.currentTime) * 1000);
  speakTimer = setTimeout(() => {
    speakTimer = null;
    if (voiceEl) {
      voiceEl.volume = gainValue;
      try {
        voiceEl.currentTime = 0;
      } catch {
        /* ignore */
      }
      void voiceEl.play().catch(() => speakVisitRequestFallback(volume));
      return;
    }
    speakVisitRequestFallback(volume);
  }, delayMs);
}

function playVisitRequestCycle() {
  const ctx = getVisitRequestAudioContext();
  if (!ctx || ctx.state !== "running") return;
  const t0 = ctx.currentTime + VISIT_REQUEST_AUDIO_START_OFFSET_SEC;
  const chimeSec = scheduleVisitRequestChime(ctx, t0, activeVolume);
  if (activeStyle !== "chime_voice") return;
  playRecordedVoice(ctx, t0 + chimeSec + 0.12, activeVolume);
}

/** Stop the chime/voice cycle. Does not broadcast to other tabs. */
export function stopVisitRequestAlarm(opts?: { silent?: boolean }) {
  disconnectAlarmNodes();
  const cb = alarmEnded;
  alarmEnded = null;
  if (!opts?.silent) cb?.();
}

/**
 * Play a calm chime (+ recorded voice) every ~10s until durationMs.
 * Uses the context unlocked in a click — does not create a new one.
 */
export function startVisitRequestAlarm(opts: {
  volume: number;
  durationMs: number;
  style?: VisitRequestSoundStyle;
  onEnded?: () => void;
}) {
  stopVisitRequestAlarm({ silent: true });
  alarmEnded = opts.onEnded ?? null;
  const ctx = getVisitRequestAudioContext();
  if (!ctx || ctx.state !== "running") return false;

  activeVolume = clampVisitRequestAlertVolume(opts.volume);
  activeStyle = parseVisitRequestSoundStyle(opts.style);
  alarmPlaying = true;
  const durationMs = Math.max(0, opts.durationMs);
  const startedAt = Date.now();
  const tick = () => {
    if (Date.now() - startedAt >= durationMs) {
      stopVisitRequestAlarm();
      return;
    }
    playVisitRequestCycle();
  };
  tick();
  cycleTimer = setInterval(tick, VISIT_REQUEST_CHIME_REPEAT_MS);
  alarmStopTimer = setTimeout(() => {
    stopVisitRequestAlarm();
  }, durationMs);
  return true;
}

/** One chime + voice. Call after unlock in the same click. */
export function playVisitRequestAlertPreview(opts: { volume: number; style?: VisitRequestSoundStyle }) {
  const ctx = getVisitRequestAudioContext();
  if (!ctx || ctx.state !== "running") return false;
  activeVolume = clampVisitRequestAlertVolume(opts.volume);
  activeStyle = parseVisitRequestSoundStyle(opts.style);
  playVisitRequestCycle();
  return true;
}

/** Resume the shared context then play chime → "New booking request" in one click. */
export async function unlockAndPlayVisitRequestPreview(opts: { volume: number; style?: VisitRequestSoundStyle }) {
  const ok = await unlockVisitRequestAudio();
  if (!ok) return false;
  return playVisitRequestAlertPreview(opts);
}
