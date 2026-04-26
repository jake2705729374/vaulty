import type { Metadata } from "next";
import { Geist, Geist_Mono, Sora, Inter } from "next/font/google";
import SessionProvider from "@/components/SessionProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Vaultly — Write Freely. Think Clearly. Grow Daily.",
  description: "Vaultly is your private, AI-powered journal. AES-256 encrypted, beautifully designed, and always just between you and your thoughts.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

// Minified blocking script — runs before React hydrates to prevent theme flash.
// Reads "journal-theme" and "journal-dark" from localStorage and sets
// data-theme / data-dark on <html> immediately.
const themeScript = `(function(){try{var t=localStorage.getItem('journal-theme')||'vault';var d=localStorage.getItem('journal-dark')||'system';var r=d==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):d;document.documentElement.setAttribute('data-theme',t);document.documentElement.setAttribute('data-dark',r);if(t==='custom'){try{var c=JSON.parse(localStorage.getItem('journal-theme-custom')||'{}');if(c.page)document.documentElement.style.setProperty('--color-page',c.page);if(c.accent)document.documentElement.style.setProperty('--color-accent',c.accent);}catch(e){}}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${sora.variable} ${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        {/* Blocking script — MUST be first child of body, before hydration */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <SessionProvider>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
