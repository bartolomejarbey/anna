import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "Anna — AI asistent finančního poradce",
  description:
    "Anna automatizuje schůzky finančního poradce: nasloucháním vytvoří přepis, extrakci dat a PDF nabídku pro zákazníka.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="cs"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="bg-bg-primary text-text-primary min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
