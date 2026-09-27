"use client";

import { useEffect, useState } from "react";
import type { Progress, Stage } from "@/lib/track";
import { txUrl } from "@/lib/config";
import { short } from "@/lib/util";

/**
 * The payment in flight — designed by Codex (design/pending-final.html), driven by Monad's real
 * commitment states. The stopwatch runs from the tap and freezes when the money is final (or refused).
 */
const STEPS: Stage[] = ["signed", "sent", "proposed", "voted", "finalized"];

export function InFlight({
  t0, progress, title, amount, purpose, from, to, done, children,
}: {
  t0: number; progress: Progress; title: string; amount: string; purpose?: string;
  from: string; to: string; done: { ok: string; okNote: string; no?: string; noNote?: string }; children?: React.ReactNode;
}) {
  const refused = progress.status === "reverted";
  const paid = !refused && progress.at.finalized !== undefined;
  const state = refused ? "refused" : paid ? "paid" : "flight";
  const stopAt = refused ? progress.at.proposed : paid ? progress.at.finalized : undefined;

  const [now, setNow] = useState(0);
  useEffect(() => {
    if (stopAt !== undefined) return;
    let raf = 0;
    const tick = () => { setNow(performance.now() - t0); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [t0, stopAt]);
  const elapsed = stopAt ?? now;

  const reached = STEPS.filter((s) => progress.at[s] !== undefined).length;
  const pct = refused ? ((STEPS.indexOf("proposed") + 0.35) / (STEPS.length - 1)) * 100 : Math.max(0, (reached - 1) / (STEPS.length - 1)) * 100;

  const label = (s: Stage) => {
    if (refused && s === "proposed") return "Contract refused";
    if (refused && (s === "voted" || s === "finalized")) return s === "finalized" ? `${to} not paid` : "—";
    return {
      signed: "Signed with Face ID",
      sent: "Sent to Monad",
      proposed: progress.block ? `In block #${progress.block.toLocaleString("en-US")}` : "In a block",
      voted: "Voted by validators",
      finalized: `Final · ${to} has it`,
    }[s];
  };

  return (
    <div className="flight" data-state={state}>
      <h1 className="flight-title">{refused ? "Payment refused." : paid ? done.ok : title}</h1>
      <p className="flight-amount"><b>{amount}</b>{purpose && (<><span>·</span>{purpose}</>)}</p>

      <div className="flight-timer">
        <div className="mono-eyebrow">Elapsed</div>
        <div className="flight-clock">{(elapsed / 1000).toFixed(2)}<small>s</small></div>
      </div>

      <div className="flight-crossing">
        <div className="ends"><span className="payer">{from}</span><span className="shop">{to}</span></div>
        <div className="wire" style={{ ["--progress" as string]: `${pct}%` }}>
          <span className="fill" />
          {STEPS.map((s, i) => (
            <span key={s} className={"tick" + (i < reached ? " passed" : "")} style={{ left: `${(i / (STEPS.length - 1)) * 100}%` }} />
          ))}
          <span className="traveller" />
        </div>
      </div>

      <ol className="flight-steps">
        {STEPS.map((s, i) => {
          const at = progress.at[s];
          const failed = refused && s === "proposed";
          const cls = failed ? "failed" : refused && i > 2 ? "" : at !== undefined ? (paid ? "reached settled" : "reached") : i === reached ? "current" : "";
          return (
            <li key={s} className={"step " + cls}>
              <span className="node" />
              <span className="step-label">{label(s)}</span>
              <time>{at !== undefined && !(refused && i > 2) ? `${(at / 1000).toFixed(2)} s` : "—"}</time>
            </li>
          );
        })}
      </ol>

      <div className="flight-outcome">
        <strong>{refused ? (done.no ?? "Balance unchanged.") : paid ? "Received in full." : "On its way."}</strong>
        <p>{refused ? (done.noNote ?? "No money left your account.") : paid ? done.okNote : "Waiting for Monad to finalize."}</p>
        {progress.hash && (
          <p className="flight-tx">
            {txUrl(progress.hash)
              ? <a href={txUrl(progress.hash)} target="_blank" rel="noreferrer" data-tx={progress.hash} data-ok={refused ? "0" : "1"}>{short(progress.hash)} ↗</a>
              : <span data-tx={progress.hash} data-ok={refused ? "0" : "1"}>{short(progress.hash)}</span>}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}
