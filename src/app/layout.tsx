import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@uploadthing/react/styles.css";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Summerhacks | Make a page together",
  description:
    "Open a shared page, invite your people, and make something memorable together.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <ClerkProvider
          appearance={{
            cssLayerName: "clerk",
            variables: {
              borderRadius: "0.9rem",
              colorBackground: "#fffaf4",
              colorBorder: "rgba(52, 36, 27, 0.16)",
              colorForeground: "#241a14",
              colorInput: "#fffdf9",
              colorInputForeground: "#241a14",
              colorMutedForeground: "#7b726b",
              colorNeutral: "#3b2418",
              colorPrimary: "#3b2418",
              colorPrimaryForeground: "#fffaf4",
              fontFamily: "var(--font-geist-sans)",
            },
          }}
        >
          <div className="app-frame">{children}</div>
        </ClerkProvider>
      </body>
    </html>
  );
}
