import Link from "next/link";
import { ArrowRightIcon, LockIcon, PhoneIcon, ScreenIcon } from "@/components/icons";

export default function LandingPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 pb-16 pt-14">
      <div className="flex w-full max-w-[1040px] flex-col gap-8">
        <h1 className="sr-only">Pilih peran device ini</h1>
        <div className="flex flex-wrap gap-5">
          <Link
            href="/create"
            className="flex min-h-[300px] min-w-0 flex-[1_1_340px] flex-col justify-between gap-6 rounded-[24px] bg-primary px-[34px] py-8 text-on-primary"
          >
            <div className="flex items-center justify-between">
              <ScreenIcon size={40} strokeWidth={1.8} />
              <ArrowRightIcon size={28} strokeWidth={2.2} />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="text-[32px] font-extrabold tracking-[-0.01em]">Create Session</div>
              <div className="text-base font-medium leading-normal">
                Jadikan layar ini photowall. Butuh password pembuat sesi.
              </div>
            </div>
          </Link>
          <Link
            href="/join"
            className="flex min-h-[300px] min-w-0 flex-[1_1_340px] flex-col justify-between gap-6 rounded-[24px] border border-line bg-surface px-[34px] py-8 text-fg"
          >
            <div className="flex items-center justify-between">
              <PhoneIcon size={40} strokeWidth={1.8} />
              <ArrowRightIcon size={28} strokeWidth={2.2} />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="text-[32px] font-extrabold tracking-[-0.01em]">Join Session</div>
              <div className="text-base font-medium leading-normal text-muted">
                Jadikan device ini tempat input kata. Cukup kode sesi 6 karakter.
              </div>
            </div>
          </Link>
        </div>
        <div className="flex items-center justify-center gap-2 text-[15px] text-muted">
          <LockIcon size={16} />
          <Link href="/masuk-admin" className="font-bold text-fg underline underline-offset-[3px]">
            Masuk admin
          </Link>
        </div>
      </div>
    </main>
  );
}
