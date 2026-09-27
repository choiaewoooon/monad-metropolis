"use client";

import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";
import { Top } from "@/components/Top";
import { PLACES } from "@/lib/config";
import { balanceOf, fmt } from "@/lib/kirogi";

/** The shop's side: show a QR, watch the balance, say "Paid" the moment it lands. */
export default function Shop() {
  const [placeId, setPlaceId] = useState("westwood-market");
  const [amount, setAmount] = useState("86.40");
  const [qr, setQr] = useState("");
  const [paid, setPaid] = useState<{ amount: number; ms: number } | null>(null);
  const shown = useRef<{ at: number; balance: bigint } | null>(null);
  const place = PLACES.find((p) => p.id === placeId)!;

  useEffect(() => {
    const data = `kirogi:pay?to=${place.address}&amount=${amount}&name=${encodeURIComponent(place.name)}`;
    QRCode.toDataURL(data, { margin: 1, width: 520, color: { dark: "#08090c", light: "#f2f4f7" } }).then(setQr);
    setPaid(null);
    shown.current = null;
    balanceOf(place.address).then((b) => (shown.current = { at: performance.now(), balance: b })).catch(() => {});
  }, [place, amount]);

  useEffect(() => {
    const t = setInterval(async () => {
      if (!shown.current || paid) return;
      const b = await balanceOf(place.address).catch(() => null);
      if (b !== null && b > shown.current.balance) {
        setPaid({ amount: Number(b - shown.current.balance) / 1e6, ms: performance.now() - shown.current.at });
      }
    }, 300);
    return () => clearInterval(t);
  }, [place, paid]);

  return (
    <>
      <Top left={<select value={placeId} onChange={(e) => setPlaceId(e.target.value)} aria-label="Shop"
        style={{ background: "transparent", color: "var(--dim)", border: 0, font: "inherit" }}>
        {PLACES.filter((p) => p.category).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>} />
      <div className="pad">
        {paid ? (
          <>
            <h1 className="display d1" style={{ marginTop: 18 }}>Paid.</h1>
            <div className="card verdict ok" style={{ marginTop: 20 }}>
              <div className="pill ok"><span className="dot" />{fmt(paid.amount)} received<span className="note">settled</span></div>
              <p className="lede" style={{ fontSize: 14 }}>In your account now — no batch, no settlement day.</p>
            </div>
          </>
        ) : (
          <>
            <h1 className="display d1" style={{ marginTop: 18 }}>Scan to pay</h1>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 12 }}>
              <span className="display" style={{ fontSize: 30 }}>$</span>
              <input className="input-amount display" style={{ fontSize: 30 }} inputMode="decimal" value={amount}
                aria-label="Amount" onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} />
            </div>
            {qr && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt={`QR code to pay ${place.name}`} style={{ width: "100%", borderRadius: 18, marginTop: 18 }} />
            )}
            <p className="mono" style={{ marginTop: 10 }}>{place.name} · {place.kind} · waiting for payment</p>
          </>
        )}
      </div>
      <div className="grow" />
      {paid && <button className="btn" onClick={() => { setPaid(null); shown.current = null; setAmount((a) => a); balanceOf(place.address).then((b) => (shown.current = { at: performance.now(), balance: b })); }}>New sale</button>}
    </>
  );
}
