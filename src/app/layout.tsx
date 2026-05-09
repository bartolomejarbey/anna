import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="cs" className="h-full antialiased">
      <body className="bg-canvas text-primary min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
