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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${mono.variable} bg-neutral-50 font-sans text-neutral-900 antialiased dark:bg-neutral-900 dark:text-neutral-100`}
      >
        {children}
      </body>
    </html>
  );
}
