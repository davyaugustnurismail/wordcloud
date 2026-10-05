import type { Server, Socket } from "socket.io";
import type { SessionRecord } from "../sessions";
import type { ClientRole, ClientToServerEvents, ServerToClientEvents } from "./events";

export type SocketData = {
  session: SessionRecord;
  role: ClientRole;
  deviceId: string | null;
  ip: string;
};

type ServerSideEvents = Record<string, never>;

export type RealtimeServer = Server<ClientToServerEvents, ServerToClientEvents, ServerSideEvents, SocketData>;
export type RealtimeSocket = Socket<ClientToServerEvents, ServerToClientEvents, ServerSideEvents, SocketData>;
