import type { Metadata } from "next";
import localFont from "next/font/local";
import { Instrument_Serif, JetBrains_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

// Geist is bundled locally by create-next-app
const geist = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist",
  weight: "100 900",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-instrument-serif",
  weight: "400",
  style: ["normal", "italic"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Reach — Creator Marketplace",
  description: "Escrow-secured influencer marketplace for the Indian market",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geist.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#0B0B0F",
              color: "#fff",
              borderRadius: "12px",
              fontSize: "14px",
            },
            success: { iconTheme: { primary: "#1B9C5A", secondary: "#fff" } },
            error:   { iconTheme: { primary: "#FF4118", secondary: "#fff" } },
          }}
        />
        {children}
      </body>
    </html>
  );
}
