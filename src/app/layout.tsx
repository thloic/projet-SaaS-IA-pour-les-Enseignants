import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { ToastProvider } from "@/components/shared/ToastProvider";
import { ConfirmProvider } from "@/components/shared/ConfirmProvider";
import { ThemeProvider } from "@/components/shared/ThemeProvider";
import { AppLocaleProvider } from "@/features/i18n/AppLocaleProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "EducAssist",
  description: "Plan lessons, create quizzes, and write report card comments with AI.",
  icons: {
    icon: "/logosansbg.png",
    shortcut: "/logosansbg.png",
    apple: "/logosansbg.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable} dark h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('educassist-theme')||'dark';document.documentElement.classList.toggle('dark',t==='dark')}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <AppLocaleProvider>
            <ToastProvider>
              <ConfirmProvider>{children}</ConfirmProvider>
            </ToastProvider>
          </AppLocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
