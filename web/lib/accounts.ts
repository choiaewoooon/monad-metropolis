"use client";

import { createPasskeyWithPrfOutput, getPasskeyPrfOutput } from "@category-labs/mera";
import { HDKey } from "@scure/bip32";
import { entropyToMnemonic, mnemonicToSeedSync } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import { bytesToHex, type Hex } from "viem";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";

/**
 * One passkey, two accounts. Index 0 is "you" (the one sending money home), index 1 is the family
 * member you send to. In a real deployment each person has their own passkey on their own phone;
 * deriving both from one passkey lets a judge play both sides on a single device.
 */
export type Accounts = { you: PrivateKeyAccount; family: PrivateKeyAccount; method: "passkey" | "device" };

const CRED = "kirogi.credential";
const SEED = "kirogi.session-seed"; // sessionStorage: survives reloads in this tab, gone when it closes
const DEVICE = "kirogi.device-seed"; // localStorage fallback when the browser has no passkey PRF

function derive(entropy: Uint8Array, index: number): Hex {
  const seed = mnemonicToSeedSync(entropyToMnemonic(entropy, wordlist));
  const node = HDKey.fromMasterSeed(seed).derive(`m/44'/60'/0'/0/${index}`);
  if (!node.privateKey) throw new Error("derivation produced no key");
  return bytesToHex(node.privateKey);
}

function fromEntropy(entropy: Uint8Array, method: Accounts["method"]): Accounts {
  return { you: privateKeyToAccount(derive(entropy, 0)), family: privateKeyToAccount(derive(entropy, 1)), method };
}

function hexToBytes(h: string) {
  return Uint8Array.from(h.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
}

export function restore(): Accounts | null {
  if (typeof window === "undefined") return null;
  const s = sessionStorage.getItem(SEED);
  if (s) return fromEntropy(hexToBytes(s), (sessionStorage.getItem(SEED + ".m") as Accounts["method"]) ?? "passkey");
  return null;
}

function keep(entropy: Uint8Array, method: Accounts["method"]) {
  sessionStorage.setItem(SEED, bytesToHex(entropy).slice(2));
  sessionStorage.setItem(SEED + ".m", method);
}

function deviceAccounts(): Accounts {
  let d = localStorage.getItem(DEVICE);
  if (!d) {
    d = bytesToHex(crypto.getRandomValues(new Uint8Array(32))).slice(2);
    localStorage.setItem(DEVICE, d);
  }
  const entropy = hexToBytes(d);
  keep(entropy, "device");
  return fromEntropy(entropy, "device");
}

/** Face ID / Touch ID via Mera. Falls back to a device key when the platform has no PRF.
 * `device` skips the passkey entirely — for judges on desktop browsers without PRF support. */
export async function signIn(method: "passkey" | "device" = "passkey"): Promise<Accounts> {
  if (method === "device") return deviceAccounts();
  const rpId = location.hostname;
  try {
    const saved = localStorage.getItem(CRED);
    let prf: Uint8Array;
    if (saved) {
      const r = await getPasskeyPrfOutput({ rpId, credential: JSON.parse(saved), timeout: 60_000 });
      prf = r.prfOutput;
    } else {
      const c = await createPasskeyWithPrfOutput({
        rp: { id: rpId, name: "Kirogi" },
        user: { name: "kirogi-demo", displayName: "Kirogi" },
        timeout: 60_000,
      });
      localStorage.setItem(CRED, JSON.stringify({ credentialId: c.credentialId, transports: c.transports }));
      prf = c.prfOutput;
    }
    keep(prf, "passkey");
    return fromEntropy(prf, "passkey");
  } catch (e) {
    console.warn("passkey unavailable, using a device key", e);
    return deviceAccounts();
  }
}

export function signOut() {
  sessionStorage.removeItem(SEED);
  sessionStorage.removeItem(SEED + ".m");
}
