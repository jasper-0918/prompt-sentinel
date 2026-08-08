import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Prompt Sentinel — explainable prompt-injection detection",
  description:
    "Paste a prompt and see whether it is an injection or jailbreak attempt, with the exact evidence that fired. Runs entirely in your browser.",
};

/**
 * Applies the dark class before first paint, so there is no flash of the wrong
 * theme. Honours ?theme=dark or ?theme=light when present, which is how the
 * portfolio embeds this page inside a dark host, and otherwise follows the
 * visitor's own system preference.
 */
const THEME_SCRIPT = `(function(){try{
var p=new URLSearchParams(location.search).get('theme');
var dark=p?p==='dark':matchMedia('(prefers-color-scheme: dark)').matches;
if(dark)document.documentElement.classList.add('dark');
}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body
        className={`${inter.variable} ${mono.variable} bg-neutral-50 font-sans text-neutral-900 antialiased dark:bg-neutral-900 dark:text-neutral-100`}
      >
        {children}
      </body>
    </html>
  );
}
