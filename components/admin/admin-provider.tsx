"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { connectRealtime, type RealtimeClient } from "@/lib/realtime/client";
import type { AdminAck, AdminEntryDto, ControlAction, PresencePayload, SessionState } from "@/lib/realtime/events";
import type { SessionSettings } from "@/lib/settings";

const ACK_TIMEOUT_MS = 5000;

type AckEmitter = {
  timeout(ms: number): {
    emit(event: string, payload: unknown, callback: (error: Error | null, ack?: AdminAck) => void): void;
  };
};

export type AdminActions = {
  approve: (ids: string[]) => Promise<AdminAck>;
  reject: (id: string) => Promise<AdminAck>;
  hide: (id: string) => Promise<AdminAck>;
  restore: (id: string) => Promise<AdminAck>;
  edit: (id: string, text: string) => Promise<AdminAck>;
  setMode: (mode: SessionSettings["moderationMode"]) => Promise<AdminAck>;
  control: (action: ControlAction) => Promise<AdminAck>;
};

type AdminContextValue = {
  code: string;
  name: string;
  connected: boolean;
  ready: boolean;
  settings: SessionSettings;
  state: SessionState;
  presence: PresencePayload;
  entries: AdminEntryDto[];
  deviceLabels: ReadonlyMap<string, string>;
  clearConfirm: boolean;
  setClearConfirm: (open: boolean) => void;
  actions: AdminActions;
};

const AdminContext = createContext<AdminContextValue | null>(null);

function sortKey(entry: AdminEntryDto): number {
  return entry.shownAt ?? entry.createdAt;
}

function compareEntries(a: AdminEntryDto, b: AdminEntryDto): number {
  return sortKey(b) - sortKey(a) || (a.id < b.id ? 1 : -1);
}

function upsertEntry(list: AdminEntryDto[], entry: AdminEntryDto): AdminEntryDto[] {
  return [...list.filter((existing) => existing.id !== entry.id), entry].sort(compareEntries);
}

export function useAdmin(): AdminContextValue {
  const value = useContext(AdminContext);
  if (!value) throw new Error("useAdmin harus dipakai di dalam AdminProvider");
  return value;
}

type Props = {
  code: string;
  name: string;
  initialSettings: SessionSettings;
  initialState: SessionState;
  children: ReactNode;
};

export function AdminProvider({ code, name, initialSettings, initialState, children }: Props) {
  const router = useRouter();
  const [connected, setConnected] = useState(false);
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState(initialSettings);
  const [state, setState] = useState(initialState);
  const [presence, setPresence] = useState<PresencePayload>({ display: 0, input: 0, admin: 0 });
  const [entries, setEntries] = useState<AdminEntryDto[]>([]);
  const [clearConfirm, setClearConfirm] = useState(false);
  const socketRef = useRef<RealtimeClient | null>(null);

  useEffect(() => {
    const socket = connectRealtime({ code, role: "admin" });
    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", (error) => {
      setConnected(false);
      if (error.message === "unauthorized") router.replace(`/masuk-admin?kode=${code}`);
    });
    socket.on("admin:snapshot", (snapshot) => {
      setSettings(snapshot.settings);
      setState(snapshot.state);
      setEntries([...snapshot.entries].sort(compareEntries));
      setReady(true);
    });
    socket.on("admin:entry", (entry) => setEntries((current) => upsertEntry(current, entry)));
    socket.on("session:state", setState);
    socket.on("settings:update", setSettings);
    socket.on("presence", setPresence);

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [code, router]);

  const emit = useCallback((event: string, payload: unknown): Promise<AdminAck> => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) return Promise.resolve({ ok: false, reason: "error" });
    const emitter = socket as unknown as AckEmitter;
    return new Promise((resolve) => {
      emitter.timeout(ACK_TIMEOUT_MS).emit(event, payload, (error, ack) => {
        resolve(error || !ack ? { ok: false, reason: "error" } : ack);
      });
    });
  }, []);

  const actions = useMemo<AdminActions>(
    () => ({
      approve: (ids) => emit("entry:approve", { ids }),
      reject: (id) => emit("entry:reject", { id }),
      hide: (id) => emit("entry:hide", { id }),
      restore: (id) => emit("entry:restore", { id }),
      edit: (id, text) => emit("entry:edit", { id, text }),
      setMode: (mode) => emit("moderation:set", { mode }),
      control: (action) => emit("session:control", { action }),
    }),
    [emit],
  );

  const deviceLabels = useMemo(() => {
    const labels = new Map<string, string>();
    for (const entry of [...entries].sort((a, b) => a.createdAt - b.createdAt)) {
      if (entry.deviceId && !labels.has(entry.deviceId)) {
        labels.set(entry.deviceId, `Input-${labels.size + 1}`);
      }
    }
    return labels;
  }, [entries]);

  const value = useMemo<AdminContextValue>(
    () => ({
      code,
      name,
      connected,
      ready,
      settings,
      state,
      presence,
      entries,
      deviceLabels,
      clearConfirm,
      setClearConfirm,
      actions,
    }),
    [code, name, connected, ready, settings, state, presence, entries, deviceLabels, clearConfirm, actions],
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}
