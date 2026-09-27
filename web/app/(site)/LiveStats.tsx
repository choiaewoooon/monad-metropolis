"use client";

import { useEffect, useState } from "react";
import { kirogiAbi } from "@/lib/abi/Kirogi";
import { KIROGI } from "@/lib/config";
import { pub } from "@/lib/kirogi";

/** Read straight from the chain, so the number moves while a judge is using the app. */
export function LiveStats() {
  const [pockets, setPockets] = useState<string>("…");
  const [block, setBlock] = useState<string>("…");
  useEffect(() => {
    let on = true;
    const tick = async () => {
      try {
        const [n, b] = await Promise.all([
          pub.readContract({ address: KIROGI, abi: kirogiAbi, functionName: "pocketCount" }),
          pub.getBlockNumber(),
        ]);
        if (on) { setPockets(n.toString()); setBlock(b.toLocaleString("en-US")); }
      } catch { /* offline */ }
    };
    tick();
    const t = setInterval(tick, 1500);
    return () => { on = false; clearInterval(t); };
  }, []);
  return (
    <>
      <div><p className="label">Earmarked pockets so far</p><p className="value">{pockets}</p></div>
      <div><p className="label">Monad block</p><p className="value mono">{block}</p></div>
    </>
  );
}
