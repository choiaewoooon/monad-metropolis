import { NextResponse } from "next/server";
import {
  BaseError, ContractFunctionRevertedError, createPublicClient, createWalletClient,
  http, parseSignature, type Address, type Hex,
} from "viem";
import { nonceManager, privateKeyToAccount } from "viem/accounts";
import { kirogiAbi } from "@/lib/abi/Kirogi";
import { testUSDAbi } from "@/lib/abi/TestUSD";
import { chain, DEMO_FUND, demoKey, DOLLAR, KIROGI, PLACES, RPC } from "@/lib/config";

// The relayer pays gas so nobody using Kirogi ever needs MON. It only submits what the user signed:
// every call below is a *WithSig function that verifies the EIP-712 signature on-chain.
const relayer = privateKeyToAccount(process.env.RELAYER_KEY as Hex, { nonceManager });
const wallet = createWalletClient({ account: relayer, chain, transport: http(RPC) });
const pub = createPublicClient({ chain, transport: http(RPC) });

// Monad charges the declared gas limit, so declare it instead of estimating (a refused payment can't be estimated).
// measured with `forge test --gas-report` under network = "monad", plus ~10%
const GAS = { fund: 150_000n, send: 860_000n, pay: 360_000n, allow: 185_000n } as const;

// One relayer account: submissions go out one at a time so nonces never collide under concurrent users.
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => undefined);
  return run;
}

const UNIT = 1_000_000n;
const erc20 = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "a", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "transfer", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }, { name: "v", type: "uint256" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "transferFrom", stateMutability: "nonpayable", inputs: [{ name: "f", type: "address" }, { name: "t", type: "address" }, { name: "v", type: "uint256" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "permit", stateMutability: "nonpayable", inputs: [{ name: "o", type: "address" }, { name: "s", type: "address" }, { name: "v", type: "uint256" }, { name: "d", type: "uint256" }, { name: "v8", type: "uint8" }, { name: "r", type: "bytes32" }, { name: "s32", type: "bytes32" }], outputs: [] },
  { type: "function", name: "nonces", stateMutability: "view", inputs: [{ name: "o", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "version", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
] as const;
const bal = (a: Address) => pub.readContract({ address: DOLLAR, abi: erc20, functionName: "balanceOf", args: [a] });

async function tokenDomain() {
  try {
    const d = await pub.readContract({ address: DOLLAR, abi: testUSDAbi, functionName: "eip712Domain" });
    return { name: d[1], version: d[2], chainId: Number(d[3]), verifyingContract: d[4] };
  } catch {
    const name = await pub.readContract({ address: DOLLAR, abi: testUSDAbi, functionName: "name" });
    const version = await pub.readContract({ address: DOLLAR, abi: erc20, functionName: "version" }).catch(() => "1");
    return { name, version, chainId: chain.id, verifyingContract: DOLLAR };
  }
}

/** Demo shops' keys are public (labels), so demo dollars they received can be pulled back into the float:
 * each shop signs a permit, the relayer submits permit + transferFrom. Testnet float is faucet-limited. */
async function sweepShops() {
  const domain = await tokenDomain();
  for (const place of PLACES) {
    const amount = await bal(place.address);
    if (amount === 0n) continue;
    const shop = privateKeyToAccount(demoKey(place.label));
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);
    const nonce = await pub.readContract({ address: DOLLAR, abi: erc20, functionName: "nonces", args: [shop.address] });
    const sig = parseSignature(await shop.signTypedData({
      domain, primaryType: "Permit",
      types: { Permit: [
        { name: "owner", type: "address" }, { name: "spender", type: "address" }, { name: "value", type: "uint256" },
        { name: "nonce", type: "uint256" }, { name: "deadline", type: "uint256" },
      ] },
      message: { owner: shop.address, spender: relayer.address, value: amount, nonce, deadline },
    }));
    const v = Number(sig.v ?? BigInt(sig.yParity + 27));
    const h1 = await serial(() => wallet.writeContract({ address: DOLLAR, abi: erc20, functionName: "permit", gas: 120_000n,
      args: [shop.address, relayer.address, amount, deadline, v, sig.r, sig.s] }));
    await pub.waitForTransactionReceipt({ hash: h1, pollingInterval: 100 });
    const h2 = await serial(() => wallet.writeContract({ address: DOLLAR, abi: erc20, functionName: "transferFrom", gas: 100_000n,
      args: [shop.address, relayer.address, amount] }));
    await pub.waitForTransactionReceipt({ hash: h2, pollingInterval: 100 });
  }
}

const de = (o: unknown): unknown =>
  JSON.parse(JSON.stringify(o), (_, v) => (v && typeof v === "object" && "$big" in v ? BigInt(v.$big) : v));

type Action = keyof typeof GAS;

export async function POST(req: Request) {
  const { action, body } = de(await req.json()) as { action: Action; body: Record<string, unknown> };
  if (!(action in GAS)) return NextResponse.json({ error: "unknown action" }, { status: 400 });

  let request: Parameters<typeof wallet.writeContract>[0];
  try {
    if (action === "fund") {
      const to = body.to as Address;
      const need = BigInt(DEMO_FUND) * UNIT;
      if ((await bal(to)) >= need) return NextResponse.json({ skipped: true });
      const hasFaucet = await pub.readContract({ address: DOLLAR, abi: testUSDAbi, functionName: "FAUCET_LIMIT" })
        .then(() => true).catch(() => false);
      if (hasFaucet) {
        // local development: the open TestUSD faucet
        request = { address: DOLLAR, abi: testUSDAbi, functionName: "faucet", args: [to, need], account: relayer, chain, gas: GAS.fund };
      } else {
        // testnet: official USDC / AUSD from the relayer's float, topped up from demo shops first
        if ((await bal(relayer.address)) < need) await sweepShops();
        if ((await bal(relayer.address)) < need) {
          return NextResponse.json({ error: "DEMO_FLOAT_EMPTY", relayer: relayer.address }, { status: 409 });
        }
        request = { address: DOLLAR, abi: erc20, functionName: "transfer", args: [to, need], account: relayer, chain, gas: GAS.fund };
      }
    } else if (action === "send") {
      const p = parseSignature(body.permitSig as Hex);
      request = { address: KIROGI, abi: kirogiAbi, functionName: "sendWithSig", account: relayer, chain, gas: GAS.send,
        args: [body.sender as Address, body.recipient as Address, body.parts as never, body.lifetime as bigint,
          body.deadline as bigint, body.signature as Hex,
          { value: body.total as bigint, deadline: body.deadline as bigint, v: Number(p.v ?? BigInt(p.yParity + 27)), r: p.r, s: p.s }] };
    } else if (action === "pay") {
      request = { address: KIROGI, abi: kirogiAbi, functionName: "payWithSig", account: relayer, chain, gas: GAS.pay,
        args: [body.recipient as Address, body.pocketId as bigint, body.merchant as Address, body.amount as bigint,
          body.deadline as bigint, body.signature as Hex] };
    } else {
      request = { address: KIROGI, abi: kirogiAbi, functionName: "allowPayeeWithSig", account: relayer, chain, gas: GAS.allow,
        args: [body.sender as Address, body.pocketId as bigint, body.payee as Address, body.deadline as bigint, body.signature as Hex] };
    }
  } catch (e) {
    return NextResponse.json({ error: "bad request: " + (e as Error).message }, { status: 400 });
  }

  // Simulate first so we can name a refusal. A refused *payment* is still broadcast on purpose:
  // the reverted transaction on the explorer is the proof that the contract, not the app, said no.
  let error: { name: string; args?: string[] } | undefined;
  try {
    await pub.simulateContract(request as never);
  } catch (e) {
    const rev = e instanceof BaseError ? e.walk((x) => x instanceof ContractFunctionRevertedError) : null;
    const data = rev instanceof ContractFunctionRevertedError ? rev.data : undefined;
    error = data
      ? { name: data.errorName, args: (data.args ?? []).map(String) }
      : { name: "Reverted", args: [String((e as Error).message).slice(0, 160)] };
    if (action !== "pay" || error.name !== "NotAllowed") {
      return NextResponse.json({ error: `${error.name}${error.args?.length ? " " + error.args.join(", ") : ""}` }, { status: 422 });
    }
  }

  try {
    // the timer measures what the user feels: submit → included in a block → receipt back
    const t0 = performance.now();
    const hash = await serial(() => wallet.writeContract(request));
    const receipt = await pub.waitForTransactionReceipt({ hash, pollingInterval: 100 });
    const ms = Math.round(performance.now() - t0);
    return NextResponse.json({ hash, status: receipt.status, ms, block: receipt.blockNumber.toString(), error });
  } catch (e) {
    const msg = e instanceof BaseError ? e.shortMessage : (e as Error).message;
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

