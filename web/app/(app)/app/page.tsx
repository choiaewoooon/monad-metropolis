"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAccounts } from "../../providers";

export default function Welcome() {
  const { accounts, signIn } = useAccounts();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function start(method: "passkey" | "device" = "passkey") {
    setBusy(true);
    try {
      if (!accounts) await signIn(method);
      router.push("/send");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="welcome-hero" role="img" aria-label="Wild geese arriving over a city at dawn">
        <div className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/kirogi-mark.png" alt="" />
          Kirogi
        </div>
      </div>
      <div className="pad" style={{ marginTop: -64, position: "relative", zIndex: 2 }}>
        <h1 className="display" style={{ fontSize: 32 }}>
          Sent abroad.
          <br />
          Spent as intended.
        </h1>
        <p className="lede">
          Send money to family abroad and choose what each dollar is for. Shops are paid, final, in about two seconds.
        </p>
      </div>
      <div className="grow" />
      {!accounts && (
        <button className="ghost" onClick={() => start("device")} disabled={busy}>Try the demo without Face ID</button>
      )}
      <button className="btn" onClick={() => start()} disabled={busy}>
        {busy ? <span className="spinner" /> : accounts ? "Continue" : "Get started with Face ID"}
      </button>
      <p className="mono" style={{ textAlign: "center", margin: "-8px 0 22px" }}>
        passkey · no seed phrase · no gas
      </p>
    </>
  );
}
