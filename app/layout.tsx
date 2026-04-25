import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Multiplikation",
  description: "Öva multiplikationstabellen 1–10 med adaptiv spaced repetition.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sv">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
