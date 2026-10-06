import Link from "next/link";
import { ArrowRightIcon, LockIcon, PhoneIcon, ScreenIcon } from "@/components/icons";

const cardBase =
  "group flex min-h-[300px] min-w-0 flex-[1_1_340px] flex-col justify-between gap-6 rounded-[24px] px-[34px] py-8 transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring";

export default function LandingPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 pb-16 pt-8">
      <div className="flex w-full max-w-[1040px] flex-col gap-8">
        <h1 className="sr-only">Pilih peran device ini</h1>
        <div className="flex flex-wrap gap-5">
          <Link href="/create" className={`${cardBase} bg-primary text-on-primary`}>
            <div className="flex items-center justify-between">
              <ScreenIcon size={40} strokeWidth={1.8} />
              <ArrowRightIcon size={28} strokeWidth={2.2} className="transition-transform duration-150 group-hover:translate-x-1" />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="text-[32px] font-extrabold tracking-[-0.01em]">Create Session</div>
              <div className="text-base font-medium leading-normal">
                Jadikan layar ini photowall. Butuh password pembuat sesi.
              </div>
            </div>
          </Link>
          <Link href="/join" className={`${cardBase} border border-line bg-surface text-fg`}>
            <div className="flex items-center justify-between">
              <PhoneIcon size={40} strokeWidth={1.8} />
              <ArrowRightIcon size={28} strokeWidth={2.2} className="transition-transform duration-150 group-hover:translate-x-1" />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="text-[32px] font-extrabold tracking-[-0.01em]">Join Session</div>
              <div className="text-base font-medium leading-normal text-muted">
                Jadikan device ini tempat input kata. Cukup kode sesi 6 karakter.
              </div>
            </div>
          </Link>
        </div>
        <div className="flex justify-center">
          <Link
            href="/masuk-admin"
            className="flex h-12 items-center gap-2.5 rounded-full border border-line bg-surface px-5 text-[15px] font-bold text-fg"
          >
            <LockIcon size={16} />
            Masuk sebagai admin sesi
          </Link>
        </div>
      </div>
    </main>
  );
}
