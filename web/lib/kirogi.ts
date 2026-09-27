import { createPublicClient, encodeAbiParameters, http, keccak256, parseUnits, type Address, type Hex } from "viem";
import type { PrivateKeyAccount } from "viem/accounts";
import { kirogiAbi } from "./abi/Kirogi";
import { testUSDAbi } from "./abi/TestUSD";
import { chain, DECIMALS, DOLLAR, KIROGI, RPC } from "./config";

export const pub = createPublicClient({ chain, transport: http(RPC) });

export const toUnits = (usd: number | string) => parseUnits(String(usd), DECIMALS);
export const fromUnits = (v: bigint) => Number(v) / 10 ** DECIMALS;
export const fmt = (v: bigint | number, cents = true) => {
  const n = typeof v === "bigint" ? fromUnits(v) : v;
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: 2 });
};

export type Part = { purpose: Hex; amount: bigint; rule: 0 | 1; payees: Address[] };
export type Pocket = {
  sender: Address; recipient: Address; purpose: Hex; rule: number;
  expiry: bigint; funded: bigint; spent: bigint; closed: boolean;
};
export type Receipt = { pocketId: bigint; merchant: Address; amount: bigint; at: bigint };

const domain = { name: "Kirogi", version: "1", chainId: chain.id, verifyingContract: KIROGI } as const;
const deadline = () => BigInt(Math.floor(Date.now() / 1000) + 600);

const versionAbi = [{ type: "function", name: "version", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] }] as const;

/** The token's EIP-712 domain: USDC says version "2", AUSD and OpenZeppelin tokens publish eip712Domain(). */
export async function permitDomain() {
  try {
    const d = await pub.readContract({ address: DOLLAR, abi: testUSDAbi, functionName: "eip712Domain" });
    return { name: d[1], version: d[2], chainId: Number(d[3]), verifyingContract: d[4] };
  } catch {
    const name = await pub.readContract({ address: DOLLAR, abi: testUSDAbi, functionName: "name" });
    const version = await pub.readContract({ address: DOLLAR, abi: versionAbi, functionName: "version" }).catch(() => "1");
    return { name, version, chainId: chain.id, verifyingContract: DOLLAR };
  }
}

export async function balanceOf(a: Address) {
  return pub.readContract({ address: DOLLAR, abi: testUSDAbi, functionName: "balanceOf", args: [a] });
}

export async function pocketsOf(recipient: Address) {
  const [ids, list] = await pub.readContract({ address: KIROGI, abi: kirogiAbi, functionName: "pocketsOfRecipient", args: [recipient] });
  return ids.map((id, i) => ({ id, ...(list[i] as Pocket) }));
}

export async function sentPockets(sender: Address) {
  const [ids, list] = await pub.readContract({ address: KIROGI, abi: kirogiAbi, functionName: "pocketsOfSender", args: [sender] });
  return ids.map((id, i) => ({ id, ...(list[i] as Pocket) }));
}

export async function receiptsOfSender(sender: Address) {
  const [ids, list] = await pub.readContract({ address: KIROGI, abi: kirogiAbi, functionName: "receiptsOfSender", args: [sender] });
  return ids.map((id, i) => ({ id, ...(list[i] as Receipt) }));
}

export async function findPocket(recipient: Address, merchant: Address, amount: bigint) {
  const id = await pub.readContract({ address: KIROGI, abi: kirogiAbi, functionName: "findPocket", args: [recipient, merchant, amount] });
  return id === 2n ** 256n - 1n ? null : id;
}

const nonce = (a: Address) => pub.readContract({ address: KIROGI, abi: kirogiAbi, functionName: "nonces", args: [a] });

// ------------------------------------------------------------------ signed intents (relayed, gasless)

const partTuple = [
  { type: "tuple[]", components: [
    { name: "purpose", type: "bytes32" }, { name: "amount", type: "uint128" },
    { name: "rule", type: "uint8" }, { name: "payees", type: "address[]" },
  ] },
] as const;

export async function signSend(you: PrivateKeyAccount, recipient: Address, parts: Part[], lifetime: bigint) {
  const dl = deadline();
  const total = parts.reduce((s, p) => s + p.amount, 0n);
  const partsHash = keccak256(encodeAbiParameters(partTuple, [parts]));
  const signature = await you.signTypedData({
    domain, primaryType: "Send",
    types: { Send: [
      { name: "sender", type: "address" }, { name: "recipient", type: "address" }, { name: "partsHash", type: "bytes32" },
      { name: "lifetime", type: "uint64" }, { name: "nonce", type: "uint256" }, { name: "deadline", type: "uint256" },
    ] },
    message: { sender: you.address, recipient, partsHash, lifetime, nonce: await nonce(you.address), deadline: dl },
  });
  // EIP-2612 permit so a brand-new passkey account never sends an approve transaction
  const [permitNonce, tokenDomain] = await Promise.all([
    pub.readContract({ address: DOLLAR, abi: testUSDAbi, functionName: "nonces", args: [you.address] }),
    permitDomain(),
  ]);
  const permitSig = await you.signTypedData({
    domain: tokenDomain,
    primaryType: "Permit",
    types: { Permit: [
      { name: "owner", type: "address" }, { name: "spender", type: "address" }, { name: "value", type: "uint256" },
      { name: "nonce", type: "uint256" }, { name: "deadline", type: "uint256" },
    ] },
    message: { owner: you.address, spender: KIROGI, value: total, nonce: permitNonce, deadline: dl },
  });
  return { sender: you.address, recipient, parts, lifetime, deadline: dl, signature, permitSig, total };
}

export async function signPay(family: PrivateKeyAccount, pocketId: bigint, merchant: Address, amount: bigint) {
  const dl = deadline();
  const signature = await family.signTypedData({
    domain, primaryType: "Pay",
    types: { Pay: [
      { name: "recipient", type: "address" }, { name: "pocketId", type: "uint256" }, { name: "merchant", type: "address" },
      { name: "amount", type: "uint256" }, { name: "nonce", type: "uint256" }, { name: "deadline", type: "uint256" },
    ] },
    message: { recipient: family.address, pocketId, merchant, amount, nonce: await nonce(family.address), deadline: dl },
  });
  return { recipient: family.address, pocketId, merchant, amount, deadline: dl, signature };
}

export async function signAllow(you: PrivateKeyAccount, pocketId: bigint, payee: Address) {
  const dl = deadline();
  const signature = await you.signTypedData({
    domain, primaryType: "Allow",
    types: { Allow: [
      { name: "sender", type: "address" }, { name: "pocketId", type: "uint256" }, { name: "payee", type: "address" },
      { name: "nonce", type: "uint256" }, { name: "deadline", type: "uint256" },
    ] },
    message: { sender: you.address, pocketId, payee, nonce: await nonce(you.address), deadline: dl },
  });
  return { sender: you.address, pocketId, payee, deadline: dl, signature };
}

export type RelayResult = {
  hash: Hex; status: "success" | "reverted"; ms: number; block: string;
  error?: { name: string; args?: string[] };
};

/** JSON can't carry bigint; tag them. */
const ser = (o: unknown) => JSON.stringify(o, (_, v) => (typeof v === "bigint" ? { $big: v.toString() } : v));

export async function relay(action: "fund" | "send" | "pay" | "allow", body: unknown): Promise<RelayResult> {
  const r = await fetch("/api/relay", { method: "POST", headers: { "content-type": "application/json" }, body: ser({ action, body }) });
  const j = await r.json().catch(() => ({ error: `relay ${r.status}` }));
  if (!r.ok) throw new Error(j.error ?? "relay failed");
  return j;
}
