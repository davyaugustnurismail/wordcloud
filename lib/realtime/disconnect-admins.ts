import { adminRoom } from "./rooms";
import { getIO } from "./server";

export async function disconnectSessionAdmins(sessionId: string): Promise<void> {
  const sockets = await getIO().in(adminRoom(sessionId)).fetchSockets();
  for (const socket of sockets) {
    if (socket.data.role === "admin") socket.disconnect(true);
  }
}
