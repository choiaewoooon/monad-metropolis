"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Top, useSignedIn } from "@/components/Top";
import { labelOf, PLACE_ICON, PLACES, placeByAddress, PURPOSE_ICON, txUrl, type Place } from "@/lib/config";
import { CountUp, Icon } from "@/components/Motion";
import { findPocket, fmt, pocketsOf, relay, signPay, toUnits, type Pocket, type RelayResult } from "@/lib/kirogi";
import { addRequest } from "@/lib/requests";
import { secs, short } from "@/lib/util";

type Lane = { purpose: string; left: bigint; ids: bigint[] };
type Scanned = { place: Place; amount: string };

const DEFAULT_AMOUNT: Record<string, string> = {
  "westwood-market": "0.86", "corner-pharmacy": "0.49", "neon-arcade": "0.60", "westwood-academy": "6.00", landlord: "2.50",
};

export default function Family() {
  const accounts = useSignedIn();
  const [pockets, setPockets] = useState<(Pocket & { id: bigint })[]>([]);
  const [lane, setLane] = useState<string | null>(null);
  const [scanned, setScanned] = useState<Scanned | null>(null);
  const [pocketId, setPocketId] = useState<bigint | null>(null);
  const [camera, setCamera] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<(RelayResult & { place: Place; amount: string; from: string }) | null>(null);
  const [asked, setAsked] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    if (!accounts) return;
    setPockets(await pocketsOf(accounts.family.address));
  }, [accounts]);
  useEffect(() => { load().catch((e) => setErr(e.message)); }, [load]);

  const now = BigInt(Math.floor(Date.now() / 1000));
  const open = pockets.filter((p) => !p.closed && p.expiry > now);
  const lanes: Lane[] = [];
  for (const p of open) {
    const l = lanes.find((x) => x.purpose === p.purpose);
    if (l) { l.left += p.funded - p.spent; l.ids.push(p.id); }
    else lanes.push({ purpose: p.purpose, left: p.funded - p.spent, ids: [p.id] });
  }
  const left = lanes.reduce((s, l) => s + l.left, 0n);
  const selected = lanes.find((l) => l.purpose === lane) ?? lanes.find((l) => labelOf(l.purpose) === "Groceries") ?? lanes[0];

  // the shop decides which part pays: ask the contract which pocket can pay this merchant
  useEffect(() => {
    if (!accounts || !scanned) return;
    (async () => {
      const id = await findPocket(accounts.family.address, scanned.place.address, toUnits(scanned.amount || "0"));
      setPocketId(id);
      if (id !== null) setLane(pockets.find((p) => p.id === id)?.purpose ?? null);
    })().catch(() => setPocketId(null));
  }, [accounts, scanned, pockets]);

  async function pay() {
    if (!accounts || !scanned || !selected) return;
    setBusy(true); setErr("");
    // No covering pocket? Try the selected one anyway — the contract refuses, on-chain, and that's the point.
    const id = pocketId ?? selected.ids[0];
    try {
      const signed = await signPay(accounts.family, id, scanned.place.address, toUnits(scanned.amount));
      const r = await relay("pay", signed);
      setResult({ ...r, place: scanned.place, amount: scanned.amount, from: labelOf(pockets.find((p) => p.id === id)!.purpose) });
      await load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function reset() { setResult(null); setScanned(null); setPocketId(null); setAsked(false); }

  if (!accounts) return null;

  // ---------------------------------------------------------------- result
  if (result) {
    const ok = result.status === "success";
    return (
      <>
        <Top left={<><span className="dot send" />From Dad</>} />
        <div className="pad">
          <h1 className="display d1" style={{ marginTop: 18 }}>{ok ? `Paid ${result.place.name}.` : "Not paid."}</h1>
          {!ok && <p className="lede">This shop isn&apos;t one Dad allowed. Your money didn&apos;t move.</p>}
          <div className={`card verdict ${ok ? "ok" : "no"}`} style={{ marginTop: 20 }}>
            <div className={`pill ${ok ? "ok" : "no"}`}><span className="dot" />{ok ? "Shop was paid" : "Refused by contract"}<span className="note">{secs(result.ms)}</span></div>
            <dl className="kv" style={{ marginTop: 14 }}>
              <dt>Shop</dt><dd className="mono">{result.place.name}</dd>
              <dt>{ok ? "From" : "Tried"}</dt><dd className="mono">{ok ? result.from : `${fmt(Number(result.amount))} · ${result.from}`}</dd>
              {!ok && (<><dt>Reason</dt><dd className="mono">{result.error?.name ?? "reverted"}</dd></>)}
              <dt>Left</dt><dd className="mono">{fmt(left)}{ok ? "" : " unchanged"}</dd>
              <dt>Tx</dt>
              <dd className="mono" data-tx={result.hash} data-ok={ok ? "1" : "0"}>{txUrl(result.hash) ? <a href={txUrl(result.hash)} target="_blank" rel="noreferrer">{short(result.hash)}</a> : short(result.hash)}</dd>
            </dl>
          </div>
        </div>
        <div className="grow" />
        {!ok && (
          <button className="ghost" disabled={asked} onClick={() => {
            const id = (pocketId ?? selected?.ids[0])!;
            addRequest({ pocketId: id.toString(), merchant: result.place.address, name: result.place.name, purpose: result.from, at: Date.now() });
            setAsked(true);
          }}>{asked ? "Asked Dad" : "Ask Dad to allow it"}</button>
        )}
        <button className="btn" onClick={reset}>Done</button>
      </>
    );
  }

  // ---------------------------------------------------------------- home + pay
  return (
    <>
      <Top left={<><span className="dot send" />From Dad</>} />
      <div className="pad">
        <div className="mono" style={{ marginTop: 14 }}>Left this month</div>
        <div className="figure" style={{ fontSize: 46, marginTop: 6 }}><CountUp value={Number(left) / 1e6} format={(n) => fmt(n)} /></div>
        {lanes.length > 0 ? (
          <div className="lanes" style={{ marginTop: 18 }}>
            {lanes.slice(0, 3).map((l) => (
              <button key={l.purpose} className={selected?.purpose === l.purpose ? "on" : ""} onClick={() => setLane(l.purpose)}>
                <div className="n" style={{ display: "flex", alignItems: "center", gap: 6 }}><Icon src={PURPOSE_ICON[labelOf(l.purpose)]} size={18} />{labelOf(l.purpose)}</div>
                <div className="v">{fmt(l.left)}</div>
              </button>
            ))}
          </div>
        ) : (
          <p className="lede">Nothing yet. When Dad sends money, it shows up here split by what it&apos;s for.</p>
        )}

        {scanned ? (
          <div className="card" style={{ marginTop: 16, padding: "18px 16px" }}>
            <div className="mono row-icon" style={{ gap: 8 }}><Icon src={PLACE_ICON[scanned.place.id]} size={22} />Scanned · {scanned.place.name}</div>
            <input className="input-amount display" style={{ fontSize: 32, marginTop: 10 }} inputMode="decimal"
              value={"$" + scanned.amount} aria-label="Amount"
              onChange={(e) => setScanned({ ...scanned, amount: e.target.value.replace(/[^0-9.]/g, "") })} />
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line)", display: "flex", justifyContent: "space-between", fontSize: 14, color: "var(--dim)" }}>
              <span>Paid from</span>
              <b className={pocketId !== null ? "home" : "fail"} style={{ fontWeight: 500 }}>
                {pocketId !== null ? labelOf(pockets.find((p) => p.id === pocketId)?.purpose ?? "0x") : `Not covered · trying ${labelOf(selected?.purpose ?? "0x")}`}
              </b>
            </div>
          </div>
        ) : camera ? (
          <Scanner onResult={(s) => { setScanned(s); setCamera(false); }} onClose={() => setCamera(false)} />
        ) : lanes.length > 0 ? (
          <div style={{ marginTop: 16 }}>
            <button className="ghost" style={{ width: "100%", margin: 0 }} onClick={() => setCamera(true)}>Scan a shop&apos;s QR</button>
            <div className="mono" style={{ margin: "16px 0 8px" }}>Or pick a place (demo)</div>
            <div className="ruled">
              {PLACES.map((p) => (
                <button key={p.id} className="choice" onClick={() => setScanned({ place: p, amount: DEFAULT_AMOUNT[p.id] })}>
                  <span className="row-icon"><Icon src={PLACE_ICON[p.id]} size={32} /><span><span className="k">{p.name}</span><span className="mono s">{p.kind}</span></span></span>
                  <span className="mono">{fmt(Number(DEFAULT_AMOUNT[p.id]))}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {err && <p className="error">{err}</p>}
      </div>
      <div className="grow" />
      {scanned && (
        <>
          <button className="ghost" onClick={() => setScanned(null)}>Cancel</button>
          <button className="btn" disabled={busy || !Number(scanned.amount)} onClick={pay}>{busy ? <span className="spinner" /> : "Pay"}</button>
        </>
      )}
    </>
  );
}

/** Reads a shop QR: kirogi:pay?to=0x…&amount=86.40 */
function Scanner({ onResult, onClose }: { onResult: (s: Scanned) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [msg, setMsg] = useState("Point at the shop's QR");
  useEffect(() => {
    let scanner: { start: () => Promise<void>; stop: () => void; destroy: () => void } | undefined;
    (async () => {
      const QrScanner = (await import("qr-scanner")).default;
      if (!video.current) return;
      scanner = new QrScanner(video.current, (r: { data: string }) => {
        try {
          const u = new URL(r.data.replace(/^kirogi:/, "https://kirogi.local/"));
          const place = placeByAddress(u.searchParams.get("to") ?? "");
          if (!place) return setMsg("Not a Kirogi shop");
          onResult({ place, amount: u.searchParams.get("amount") ?? DEFAULT_AMOUNT[place.id] });
        } catch { setMsg("Not a Kirogi QR"); }
      }, { highlightScanRegion: true, maxScansPerSecond: 8 });
      await scanner.start();
    })().catch(() => setMsg("Camera unavailable — pick a place instead"));
    return () => { scanner?.stop(); scanner?.destroy(); };
  }, [onResult]);
  return (
    <div style={{ marginTop: 16 }}>
      <div className="scan"><video ref={video} muted playsInline /></div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
        <span className="mono">{msg}</span>
        <button className="mono" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

