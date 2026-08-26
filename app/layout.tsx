import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-plus-jakarta",
});

export const metadata: Metadata = {
  title: "LAN Chat — Real-Time Local Network Messaging",
  description: "Temporary, private, zero-account real-time chat for devices on the same Wi-Fi network.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#070b14",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark h-full ${plusJakartaSans.variable}`}>
      <body className="h-full bg-[#070b14] text-slate-100 font-sans antialiased overflow-hidden select-none">
        {children}
      </body>
    </html>
  );
}
