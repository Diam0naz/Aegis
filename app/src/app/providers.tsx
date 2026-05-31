"use client";

import { WalletContextProvider } from "@/components/WalletAdapter";

export function Providers({ children }: { children: React.ReactNode }) {
  return <WalletContextProvider>{children}</WalletContextProvider>;
}
