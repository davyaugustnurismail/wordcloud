import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon, LockIcon, PhoneIcon, ScreenIcon } from "@/components/icons";
import { loadSession } from "@/lib/session-page";
import { sessionRef } from "@/lib/sessions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sesi" };

const cardBase =
  "group flex min-h-[260px] min-w-0 flex-[1_1_280px] flex-col justify-between gap-6 rounded-[24px] px-[30px] py-7 transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring";

const arrowClass = "transition-transform duration-150 group-hover:translate-x-1";

export default async function SessionLandingPage({ params }: { params: Promise<{ ref: string }> }) {
  const session = await loadSession((await params).ref);
  const base = `/${sessionRef(session)}`;

  return (
    <main className="flex flex-1 items-center justify-center px-6 pb-16 pt-8">
      <div className="flex w-full max-w-[1040px] flex-col gap-8">
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-bold uppercase tracking-[0.06em] text-muted">
            {session.state.ended ? "Sesi sudah berakhir" : "Sesi"}
          </span>
          <h1 className="m-0 break-words text-[32px] font-extrabold tracking-[-0.02em] md:text-5xl md:leading-[1.05]">
            {session.name}
          </h1>
          <p className="m-0 text-base leading-normal text-muted md:text-lg">Pilih halaman yang mau dibuka di device ini.</p>
        </div>
        <div className="flex flex-wrap gap-5">
          <Link href={`${base}/display`} className={`${cardBase} bg-primary text-on-primary`}>
            <div className="flex items-center justify-between">
              <ScreenIcon size={40} strokeWidth={1.8} />
              <ArrowRightIcon size={28} strokeWidth={2.2} className={arrowClass} />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="text-[28px] font-extrabold tracking-[-0.01em]">Photowall</div>
              <div className="text-base font-medium leading-normal">Tampilkan word cloud di layar ini.</div>
            </div>
          </Link>
          <Link href={`${base}/input`} className={`${cardBase} border border-line bg-surface text-fg`}>
            <div className="flex items-center justify-between">
              <PhoneIcon size={40} strokeWidth={1.8} />
              <ArrowRightIcon size={28} strokeWidth={2.2} className={arrowClass} />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="text-[28px] font-extrabold tracking-[-0.01em]">Input kata</div>
              <div className="text-base font-medium leading-normal text-muted">Kirim kata ke photowall dari device ini.</div>
            </div>
          </Link>
          <Link href={`${base}/admin`} className={`${cardBase} border border-line bg-surface text-fg`}>
            <div className="flex items-center justify-between">
              <LockIcon size={40} strokeWidth={1.8} />
              <ArrowRightIcon size={28} strokeWidth={2.2} className={arrowClass} />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="text-[28px] font-extrabold tracking-[-0.01em]">Admin sesi</div>
              <div className="text-base font-medium leading-normal text-muted">Moderasi dan pengaturan. Butuh PIN admin.</div>
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}
