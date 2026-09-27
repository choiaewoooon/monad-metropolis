"use client";

/** "Ask Dad to allow it": a request travels from the family screen to the sender's screen.
 * In the demo both run in one browser, so the queue lives in localStorage. In production this is a
 * push notification; the permission itself is granted on-chain (allowPayeeWithSig). */
export type AllowRequest = { pocketId: string; merchant: string; name: string; purpose: string; at: number };
const KEY = "kirogi.allow-requests";

export function listRequests(): AllowRequest[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}
export function addRequest(r: AllowRequest) {
  const all = listRequests().filter((x) => !(x.pocketId === r.pocketId && x.merchant === r.merchant));
  localStorage.setItem(KEY, JSON.stringify([r, ...all]));
}
export function removeRequest(pocketId: string, merchant: string) {
  localStorage.setItem(KEY, JSON.stringify(listRequests().filter((x) => !(x.pocketId === pocketId && x.merchant === merchant))));
}
