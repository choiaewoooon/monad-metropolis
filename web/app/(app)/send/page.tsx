"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Top, useSignedIn } from "@/components/Top";
import { DEMO_FUND, placeById, PURPOSE_ICON, purposeId, txUrl, type Purpose } from "@/lib/config";
import { CountUp, Crossing, Icon } from "@/components/Motion";
import { balanceOf, fmt, relay, signSend, toUnits, type Part, type RelayResult } from "@/lib/kirogi";
import { short } from "@/lib/util";

type Row = { purpose: Purpose; label: string; rule: 0 | 1; payee?: string; note: string; amount: number };

const DEFAULT_ROWS: Row[] = [
  { purpose: "TUITION", label: "Tuition", rule: 1, payee: "westwood-academy", note: "Westwood Academy only", amount: 6 },
  { purpose: "RENT", label: "Rent", rule: 1, payee: "landlord", note: "your landlord only", amount: 2.5 },
  { purpose: "GROCERIES", label: "Groceries", rule: 0, note: "grocery stores", amount: 1.5 },
];
const STEP = 0.5;

export default function Send() {
  const accounts = useSignedIn();
  const [step, setStep] = useState<"amount" | "earmark" | "sending" | "done">("amount");
  const [amount, setAmount] = useState(String(DEMO_FUND));
  const [rows, setRows] = useState<Row[]>(DEFAULT_ROWS);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [result, setResult] = useState<RelayResult | null>(null);
  const [err, setErr] = useState("");

  const total = Number(amount || 0);
  const assigned = rows.reduce((s, r) => s + r.amount, 0);

  const funding = useRef(false);
  useEffect(() => {
    if (!accounts || funding.current) return;
    funding.current = true;
    (async () => {
      let b = await balanceOf(accounts.you.address);
      if (b < toUnits(DEMO_FUND)) {
        await relay("fund", { to: accounts.you.address }); // demo dollars: official testnet USDC from the float
        b = await balanceOf(accounts.you.address);
      }
      setBalance(b);
    })().catch((e) => setErr(String(e.message ?? e).includes("DEMO_FLOAT_EMPTY")
      ? "Demo dollars are out for the moment. The demo runs on official testnet USDC from Circle's faucet — try again shortly."
      : String(e.message ?? e)));
  }, [accounts]);

  // keep the split proportional when the total changes
  useEffect(() => {
    if (!total) return;
    const base = DEFAULT_ROWS.reduce((s, r) => s + r.amount, 0);
    const next = DEFAULT_ROWS.map((r) => ({ ...r, amount: Math.round((r.amount / base) * total * 2) / 2 }));
    next[next.length - 1].amount = Math.round((next[next.length - 1].amount + total - next.reduce((s, r) => s + r.amount, 0)) * 100) / 100;
    setRows(next);
  }, [total]);

  const press = (k: string) =>
    setAmount((a) => (k === "⌫" ? a.slice(0, -1) : (a + k).replace(/^0+(?=\d)/, "").slice(0, 4)));

  const nudge = (i: number, d: number) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, amount: Math.max(0, r.amount + d) } : r)));

  const parts: Part[] = useMemo(
    () =>
      rows.filter((r) => r.amount > 0).map((r) => ({
        purpose: purposeId(r.purpose),
        amount: toUnits(r.amount),
        rule: r.rule,
        payees: r.payee ? [placeById(r.payee)!.address] : [],
      })),
    [rows],
  );

  async function send() {
    if (!accounts) return;
    setErr("");
    setStep("sending");
    try {
      const signed = await signSend(accounts.you, accounts.family.address, parts, BigInt(30 * 24 * 3600));
      const r = await relay("send", signed);
      setResult(r);
      setStep("done");
    } catch (e) {
      setErr((e as Error).message);
      setStep("earmark");
    }
  }

  if (!accounts) return null;

  if (step === "amount")
    return (
      <>
        <Top left={<><span className="dot home" />To Jiwoo</>} />
        <div className="pad">
          <h1 className="display d1" style={{ marginTop: 18 }}>How much<br />goes to Jiwoo?</h1>
          <div className="figure" style={{ marginTop: 30 }}>{Number(amount || 0).toLocaleString("en-US")}<small>USD</small></div>
          <dl className="card kv" style={{ marginTop: 22, padding: "14px 16px" }}>
            <dt>Jiwoo receives</dt><dd className="home">{fmt(total)}</dd>
            <dt>Your balance</dt><dd>{balance === null ? "…" : <CountUp value={Number(balance) / 1e6} format={(n) => fmt(n)} />}</dd>
            <dt>Arrives</dt><dd>in seconds</dd>
          </dl>
          {err && <p className="error">{err}</p>}
        </div>
        <div className="grow" />
        <div className="keys">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map((k) => (
            <button key={k || "blank"} onClick={() => k && press(k)} aria-label={k === "⌫" ? "Delete" : k} disabled={!k}>{k}</button>
          ))}
        </div>
        <button className="btn" style={{ marginTop: 8 }} disabled={!total || balance === null || toUnits(total) > balance}
          onClick={() => setStep("earmark")}>Continue</button>
      </>
    );

  if (step === "earmark")
    return (
      <>
        <Top left={<button onClick={() => setStep("amount")}>Back</button>} />
        <div className="pad">
          <h1 className="display d1" style={{ marginTop: 18 }}>What is it for?</h1>
          <p className="lede">Jiwoo can spend each part only where you allow.</p>
          <div className="ruled" style={{ marginTop: 20 }}>
            {rows.map((r, i) => (
              <div key={r.purpose}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="row-icon" style={{ fontSize: 16 }}><Icon src={PURPOSE_ICON[r.label]} size={30} />{r.label}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <button className="nudge" aria-label={`Less for ${r.label}`} onClick={() => nudge(i, -STEP)}>−</button>
                    <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em", minWidth: 72, textAlign: "right" }}>{fmt(r.amount)}</span>
                    <button className="nudge" aria-label={`More for ${r.label}`} onClick={() => nudge(i, STEP)}>+</button>
                  </span>
                </div>
                <div className="mono" style={{ marginTop: 5 }}>{r.note}</div>
                <div className="track"><i style={{ width: `${total ? Math.min(100, (r.amount / total) * 100) : 0}%` }} /></div>
              </div>
            ))}
          </div>
          <p className="mono" style={{ marginTop: 14, color: assigned === total ? "var(--faint)" : "var(--home)" }}>
            {Math.abs(assigned - total) < 0.001 ? "Unspent after 30 days comes back to you." : `${fmt(total - assigned)} not assigned yet`}
          </p>
          {err && <p className="error">{err}</p>}
        </div>
        <div className="grow" />
        <button className="btn" disabled={Math.abs(assigned - total) > 0.001} onClick={send}>Send {fmt(total, false)}</button>
      </>
    );

  if (step === "sending")
    return (
      <>
        <Top left={<span className="stepper">Sending on Monad</span>} />
        <div className="pad" style={{ marginTop: 18 }}>
          <h1 className="display d1">Sending to Jiwoo…</h1>
          <p className="lede">Signed with your passkey. Kirogi pays the network fee.</p>
          <Crossing from="You" to="Jiwoo" />
        </div>
      </>
    );

  return (
    <>
      <Top left={<><span className="dot home" />To Jiwoo</>} />
      <div className="pad">
        <h1 className="display d1" style={{ marginTop: 18 }}>Jiwoo has it.</h1>
        <div className="card verdict ok" style={{ marginTop: 20 }}>
          <div className="pill ok"><span className="dot" />Arrived<span className="note">{((result?.ms ?? 0) / 1000).toFixed(1)} s</span></div>
          <dl className="kv" style={{ marginTop: 14 }}>
            {rows.filter((r) => r.amount).map((r) => (
              <FragmentRow key={r.purpose} k={r.label} v={fmt(r.amount)} />
            ))}
            <dt>Block</dt><dd className="mono">{Number(result?.block ?? 0).toLocaleString("en-US")}</dd>
            <dt>Tx</dt>
            <dd className="mono" data-tx={result?.hash} data-ok="1">{result && (txUrl(result.hash)
              ? <a href={txUrl(result.hash)} target="_blank" rel="noreferrer">{short(result.hash)}</a>
              : short(result.hash))}</dd>
          </dl>
        </div>
      </div>
      <div className="grow" />
      <Link className="ghost" href="/activity">See activity</Link>
      <Link className="btn" href="/family">Switch to Jiwoo&apos;s phone</Link>
    </>
  );
}

function FragmentRow({ k, v }: { k: string; v: string }) {
  return (<><dt>{k}</dt><dd>{v}</dd></>);
}
