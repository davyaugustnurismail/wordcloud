import type { Metadata, Viewport } from "next";
import { Baloo_2, Fredoka, JetBrains_Mono, Plus_Jakarta_Sans, Poppins } from "next/font/google";
import "./globals.css";

const baloo = Baloo_2({ subsets: ["latin"], weight: "800", variable: "--font-baloo", display: "swap" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], weight: "700", variable: "--font-jetbrains", display: "swap" });
const poppins = Poppins({ subsets: ["latin"], weight: "800", variable: "--font-poppins", display: "swap" });
const fredoka = Fredoka({ subsets: ["latin"], weight: "700", variable: "--font-fredoka", display: "swap" });

export const metadata: Metadata = {
  title: "Wordcloud Photowall",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

const themeScript = `try{var t=localStorage.getItem("wc-theme");if(t==="light"||t==="dark"){document.documentElement.dataset.theme=t}}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="id"
      data-theme="dark"
      suppressHydrationWarning
      className={`${baloo.variable} ${jakarta.variable} ${jetbrains.variable} ${poppins.variable} ${fredoka.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
