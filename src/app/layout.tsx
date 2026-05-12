import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
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
    <html lang="cs" className={`${inter.variable} h-full antialiased`}>
      <body className="bg-canvas text-primary min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
