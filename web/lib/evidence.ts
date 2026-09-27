/** Transactions from the recorded demo run on Monad testnet (Circle USDC), shown on the landing page.
 * Collected by video/record.mjs. Times are what the app measured: submit → receipt. */
export type Evidence = { what: string; result: string; ok: boolean; tx: string };
export const EVIDENCE: Evidence[] = [
  { what: "Dad sends $10.00 USDC, split into Tuition / Rent / Groceries", result: "arrived · 1.8 s", ok: true,
    tx: "0x0dc051684f441dfa5af1b4a9376c66ebcaa124b60106c4c55b7a208b447724eb" },
  { what: "Jiwoo pays Westwood Market $0.86 from Groceries", result: "paid · 0.9 s", ok: true,
    tx: "0xf298d587e2829f0ec0e25ae8f05a8d4942612a538bd545f794cf001b3f8010d4" },
  { what: "Jiwoo tries Neon Arcade with grocery money", result: "refused: NotAllowed · 0.5 s", ok: false,
    tx: "0x76ccd93ce736babe3faac0b497291d75466b81a2887945b34eb37b41ce30a568" },
  { what: "Dad allows Neon Arcade for that pocket", result: "allowed", ok: true,
    tx: "0x3998fc3da865384c63842f20f7daa9eb92dbdaf7a23dd5950a1222a725153601" },
  { what: "Jiwoo pays Neon Arcade again", result: "paid", ok: true,
    tx: "0x3e7c7dfa5e3585a546b0661fb5f930842f9df15bdde83709fd4276af22d594fa" },
];
