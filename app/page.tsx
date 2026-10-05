import { SocketStatus } from "@/components/socket-status";

export default function Home() {
  return (
    <main className="grid min-h-dvh place-items-center p-6">
      <SocketStatus />
    </main>
  );
}
