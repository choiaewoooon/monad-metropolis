"use client";

import type { Hex } from "viem";
import { pub } from "./kirogi";

/**
 * Follow one transaction through Monad's real commitment states, with timestamps.
 * Monad exposes them as block tags: "latest" = Proposed, "safe" = Voted, "finalized" = Finalized
 * (docs.monad.xyz/reference/json-rpc/overview). Finalized is what a shop should credit a payment on,
 * so that is where the stopwatch stops.
 */
export type Stage = "signed" | "sent" | "proposed" | "voted" | "finalized";
export type Progress = {
  at: Partial<Record<Stage, number>>; // ms since the tap
  block?: bigint;
  status?: "success" | "reverted";
  hash?: Hex;
};

const POLL = 120; // ms — Monad blocks are ~300 ms apart; the public RPC allows ~25 req/s
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function headAt(tag: "safe" | "finalized") {
  const b = await pub.getBlock({ blockTag: tag, includeTransactions: false });
  return b.number ?? 0n;
}

export async function follow(hash: Hex, t0: number, onChange: (p: Progress) => void, base: Progress) {
  const p: Progress = { ...base, hash, at: { ...base.at } };
  const mark = (s: Stage) => { if (p.at[s] === undefined) { p.at[s] = performance.now() - t0; onChange({ ...p, at: { ...p.at } }); } };

  // Proposed: the receipt appears (speculatively executed block)
  for (let i = 0; i < 200 && p.block === undefined; i++) {
    const r = await pub.getTransactionReceipt({ hash }).catch(() => null);
    if (r) { p.block = r.blockNumber; p.status = r.status; mark("proposed"); break; }
    await sleep(POLL);
  }
  if (p.block === undefined) throw new Error("transaction not seen");
  // Voted, then Finalized
  for (const [stage, tag] of [["voted", "safe"], ["finalized", "finalized"]] as const) {
    for (let i = 0; i < 100; i++) {
      const h = await headAt(tag).catch(() => 0n);
      if (h >= p.block) { mark(stage); break; }
      await sleep(POLL);
    }
  }
  return p;
}
