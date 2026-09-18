import type { Metadata } from "next";
import { Manrope, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const sans = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
});

const serif = Source_Serif_4({
  variable: "--font-serif",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Eventos UNCA",
    template: "%s · Eventos UNCA",
  },
  description: "Inscripción, acreditación y certificados para eventos.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={sans.variable + " " + serif.variable}>
      <body>{children}</body>
    </html>
  );
}
