import { ThemeToggle } from "@/components/theme-toggle";

export default function CrewLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg">
      <header className="flex items-center justify-end px-[18px] py-3.5 sm:px-8 sm:py-4">
        <ThemeToggle />
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
