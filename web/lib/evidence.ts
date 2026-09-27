/** Transactions from the recorded demo run on Monad testnet, shown on the landing page.
 * Filled in after the run (video/record.mjs prints them). */
export type Evidence = { what: string; result: string; ok: boolean; tx: string };
export const EVIDENCE: Evidence[] = [];
