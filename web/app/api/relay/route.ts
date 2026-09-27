import { NextResponse } from "next/server";
import {
  BaseError, ContractFunctionRevertedError, createPublicClient, createWalletClient,
  http, parseSignature, type Address, type Hex,
} from "viem";
import { nonceManager, privateKeyToAccount } from "viem/accounts";
import { kirogiAbi } from "@/lib/abi/Kirogi";
import { testUSDAbi } from "@/lib/abi/TestUSD";
import { chain, DOLLAR, KIROGI, RPC } from "@/lib/config";

// The relayer pays gas so nobody using Kirogi ever needs MON. It only submits what the user signed:
// every call below is a *WithSig function that verifies the EIP-712 signature on-chain.
const relayer = privateKeyToAccount(process.env.RELAYER_KEY as Hex, { nonceManager });
const wallet = createWalletClient({ account: relayer, chain, transport: http(RPC) });
const pub = createPublicClient({ chain, transport: http(RPC) });

// Monad charges the declared gas limit, so declare it instead of estimating (a refused payment can't be estimated).
const GAS = { fund: 120_000n, send: 1_200_000n, pay: 400_000n, allow: 200_000n } as const;

// One relayer account: submissions go out one at a time so nonces never collide under concurrent users.
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => undefined);
  return run;
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
      // testnet only: top the sender up with demo dollars from the open TestUSD faucet
      request = { address: DOLLAR, abi: testUSDAbi, functionName: "faucet",
        args: [body.to as Address, 2_000_000_000n], account: relayer, chain, gas: GAS.fund };
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

