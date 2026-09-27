"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Top, useSignedIn } from "@/components/Top";
import { labelOf, placeByAddress, txUrl } from "@/lib/config";
import { fmt, receiptsOfSender, relay, sentPockets, signAllow, type Pocket, type Receipt } from "@/lib/kirogi";
import { listRequests, removeRequest, type AllowRequest } from "@/lib/requests";
import { secs, short } from "@/lib/util";

type Item = { kind: "paid"; r: Receipt & { id: bigint }; purpose: string } | { kind: "sent"; total: bigint; at: bigint };

export default function Activity() {
  const accounts = useSignedIn();
  const [receipts, setReceipts] = useState<(Receipt & { id: bigint })[]>([]);
  const [pockets, setPockets] = useState<(Pocket & { id: bigint })[]>([]);
  const [requests, setRequests] = useState<AllowRequest[]>([]);
  const [allowed, setAllowed] = useState<{ name: string; hash: string; ms: number } | null>(null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    if (!accounts) return;
    const [r, p] = await Promise.all([receiptsOfSender(accounts.you.address), sentPockets(accounts.you.address)]);
    setReceipts(r);
    setPockets(p);
    setRequests(listRequests());
  }, [accounts]);

  useEffect(() => {
    load().catch((e) => setErr(e.message));
    const t = setInterval(() => load().catch(() => {}), 2500); // Monad blocks are 0.3 s; polling is plenty
    return () => clearInterval(t);
  }, [load]);

  async function allow(q: AllowRequest) {
    if (!accounts) return;
    setBusy(q.merchant); setErr("");
    try {
      const r = await relay("allow", await signAllow(accounts.you, BigInt(q.pocketId), q.merchant as `0x${string}`));
      removeRequest(q.pocketId, q.merchant);
      setAllowed({ name: q.name, hash: r.hash, ms: r.ms });
      await load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy("");
    }
  }

  if (!accounts) return null;

  const purposeOf = (id: bigint) => pockets.find((p) => p.id === id)?.purpose ?? "0x";
  const latest = [...receipts].sort((a, b) => Number(b.at - a.at))[0];
  const latestPlace = latest && placeByAddress(latest.merchant);

  // group pockets into transfers (same expiry = same send) for the "You sent" rows
  const sends = new Map<string, bigint>();
  for (const p of pockets) sends.set(p.expiry.toString(), (sends.get(p.expiry.toString()) ?? 0n) + p.funded);
  const items: Item[] = [
    ...receipts.map((r) => ({ kind: "paid" as const, r, purpose: purposeOf(r.pocketId) })),
    ...[...sends].map(([exp, total]) => ({ kind: "sent" as const, total, at: BigInt(exp) - BigInt(30 * 24 * 3600) })),
  ].sort((a, b) => Number((b.kind === "paid" ? b.r.at : b.at) - (a.kind === "paid" ? a.r.at : a.at)));

  const headline = latest
    ? `Jiwoo ${verb(labelOf(purposeOf(latest.pocketId)))}.`
    : pockets.length ? "Jiwoo has it." : "Nothing sent yet.";

  return (
    <>
      <Top left={<span>Activity</span>} />
      <div className="pad">
        <h1 className="display d1" style={{ marginTop: 18 }}>{headline}</h1>

        {requests.map((q) => (
          <div key={q.pocketId + q.merchant} className="card" style={{ marginTop: 16, padding: 16 }}>
            <div style={{ fontSize: 15 }}>Jiwoo asks to use <b style={{ fontWeight: 600 }}>{q.purpose}</b> at {q.name}.</div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button className="ghost" style={{ margin: 0, flex: 1, height: 42 }} onClick={() => { removeRequest(q.pocketId, q.merchant); setRequests(listRequests()); }}>Not now</button>
              <button className="btn" style={{ margin: 0, flex: 1, height: 42 }} disabled={busy === q.merchant} onClick={() => allow(q)}>
                {busy === q.merchant ? <span className="spinner" /> : "Allow"}
              </button>
            </div>
          </div>
        ))}

        {allowed && (
          <div className="card verdict ok" style={{ marginTop: 16 }}>
            <div className="pill ok"><span className="dot" />{allowed.name} allowed<span className="note">{secs(allowed.ms)}</span></div>
            <p className="mono" style={{ marginTop: 10 }}>
              {txUrl(allowed.hash) ? <a href={txUrl(allowed.hash)} target="_blank" rel="noreferrer">{short(allowed.hash)}</a> : short(allowed.hash)}
            </p>
          </div>
        )}

        {latest && latestPlace && (
          <div className="card verdict ok" style={{ marginTop: 18 }}>
            <div className="pill ok"><span className="dot" />Shop was paid<span className="note">on-chain</span></div>
            <dl className="kv" style={{ marginTop: 14 }}>
              <dt>Shop</dt><dd className="mono">{latestPlace.name}</dd>
              <dt>From</dt><dd className="mono">{labelOf(purposeOf(latest.pocketId))}</dd>
              <dt>Amount</dt><dd className="mono">{fmt(latest.amount)}</dd>
              <dt>Receipt</dt><dd className="mono">#{latest.id.toString()}</dd>
            </dl>
          </div>
        )}

        <div className="feed" style={{ marginTop: 14 }}>
          {items.map((it, i) =>
            it.kind === "paid" ? (
              <div className="it" key={"p" + it.r.id}>
                <span className="dot home" />
                <div className="t">{placeByAddress(it.r.merchant)?.name ?? short(it.r.merchant)}
                  <span className="mono">{labelOf(it.purpose)} · {time(it.r.at)}</span></div>
                <div className="v">{fmt(it.r.amount)}</div>
              </div>
            ) : (
              <div className="it" key={"s" + i}>
                <span className="dot send" />
                <div className="t">You sent<span className="mono">{time(it.at)}</span></div>
                <div className="v">{fmt(it.total)}</div>
              </div>
            ),
          )}
        </div>
        {err && <p className="error">{err}</p>}
      </div>
      <div className="grow" />
      <Link className="btn" href="/send">Send money</Link>
    </>
  );
}

function verb(purpose: string) {
  return purpose === "Groceries" ? "bought groceries" : purpose === "Tuition" ? "paid tuition" : purpose === "Rent" ? "paid rent" : `paid for ${purpose.toLowerCase()}`;
}
function time(at: bigint) {
  return new Date(Number(at) * 1000).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
