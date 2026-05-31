import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { Providers } from "./providers";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Aegis Protocol — On-Chain Prediction Markets",
  description:
    "Trade binary prediction markets powered by LMSR, settled on Solana. Permissionless, oracle-secured, and fully on-chain.",
  keywords: ["Solana", "prediction market", "DeFi", "LMSR", "oracle"],
  openGraph: {
    title: "Aegis Protocol",
    description: "On-chain prediction markets on Solana",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <Providers>
          <div className="page-wrapper">
            <Navbar />
            <main>{children}</main>
            <footer className="footer">
              Aegis Protocol · Solana Devnet ·{" "}
              <code>E7gRicDGM…XDsw</code>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
