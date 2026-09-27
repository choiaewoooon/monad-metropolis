"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { restore, signIn as doSignIn, signOut as doSignOut, type Accounts } from "@/lib/accounts";

type Ctx = { accounts: Accounts | null; ready: boolean; signIn: (method?: "passkey" | "device") => Promise<Accounts>; signOut: () => void };
const AccountsContext = createContext<Ctx | null>(null);

export function Providers({ children }: { children: React.ReactNode }) {
  const [accounts, setAccounts] = useState<Accounts | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setAccounts(restore());
    setReady(true);
  }, []);

  const signIn = useCallback(async (method: "passkey" | "device" = "passkey") => {
    const a = await doSignIn(method);
    setAccounts(a);
    return a;
  }, []);
  const signOut = useCallback(() => {
    doSignOut();
    setAccounts(null);
  }, []);

  return <AccountsContext.Provider value={{ accounts, ready, signIn, signOut }}>{children}</AccountsContext.Provider>;
}

export function useAccounts() {
  const c = useContext(AccountsContext);
  if (!c) throw new Error("useAccounts outside Providers");
  return c;
}
