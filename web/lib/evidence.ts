/** Transactions from the recorded demo run on Monad testnet (Circle USDC), shown on the landing page.
 * Collected by video/record.mjs. Times are what the app measured: tap → Finalized (Monad's finalized block tag). */
export type Evidence = { what: string; result: string; ok: boolean; tx: string };
export const EVIDENCE: Evidence[] = [
  { what: "Dad sends $10.00 USDC, split into Tuition / Rent / Groceries", result: "final · 2.4 s", ok: true,
    tx: "0x5a9648aa650976407c5499585da43350d4c582fe4d0981a159aa977640638eae" },
  { what: "Jiwoo pays Westwood Market $0.86 from Groceries", result: "paid, final · 2.4 s", ok: true,
    tx: "0x4a5266987c5087cdbdeed3855e2b0ae282b41b2cefe2f6a15908ceb369b8368f" },
  { what: "Jiwoo tries Neon Arcade with grocery money", result: "refused: NotAllowed · 1.0 s", ok: false,
    tx: "0x826830e87a94af480c4953429f74fa1f026691a7d0a6725a90e28a80572ab089" },
  { what: "Dad allows Neon Arcade for that pocket", result: "allowed", ok: true,
    tx: "0x1d927c72078cd7a97b27ad6923b62358c0f5dc0f5da37243cea8712301229fab" },
  { what: "Jiwoo pays Neon Arcade again", result: "paid", ok: true,
    tx: "0x56bd5f7a08900a09e8538d0baeddcff81a9e3aa6ebc07707bed7bc9d87e077f1" },
];
