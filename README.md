# Kirogi — sent abroad, spent as intended

**International remittance with earmarked spending, on Monad.**
Send money to family in another country and decide what each dollar is for — tuition, rent, groceries.
The family pays shops by QR; the contract lets each part pay only where it was meant to, refuses everything
else on-chain, and settles the shop in under a second. Unspent money comes back after 30 days.

Monad Metropolis · **Track 02 — Consumer Products & Payments**

| | |
|---|---|
| Demo video (≤ 3 min) | _TBD_ |
| Live app | _TBD_ |
| Network | Monad Testnet (chain 10143) |

---

## Problem & intended user

*Kirogi* (기러기, "wild goose") is the Korean word for a family with a border running through it: one parent
earns abroad and sends money to the other side. Hong Kong calls them astronaut families; researchers say
transnational families. There are hundreds of millions of them, and their remittances share one gap:

**once money arrives, the sender has no say in what it's for.** A parent paying a child's tuition from abroad
sends cash and hopes. Kids' cards (Greenlight, GoHenry) let a parent block categories, but only inside one
country's card network. Remittance apps move money across borders, but the money is plain cash on arrival.

Kirogi's user is the person who sends money home and the family member who spends it. Neither of them
needs to know what a blockchain is: accounts are Face ID passkeys, there is no seed phrase, no gas, and every
amount is in dollars.

## What it does

1. **Send** — "How much goes to Jiwoo?" Enter dollars once.
2. **Earmark** — split it: Tuition *(Westwood Academy only)*, Rent *(your landlord only)*, Groceries *(any grocery store)*.
3. **Spend** — Jiwoo scans a shop's QR. The contract picks the part that may pay this shop and pays it.
4. **Refuse** — at a shop no part covers (an arcade, with grocery money), the contract **reverts with
   `NotAllowed`**. The refusal is a real transaction on the explorer; Jiwoo's balance does not move.
5. **Ask & allow** — Jiwoo taps *Ask Dad to allow it*; Dad approves with one signature, on-chain.
6. **Proof** — Dad's activity feed shows every payment: shop, purpose, amount, receipt number, tx.
7. **Return** — after 30 days, whatever wasn't spent goes back to the sender.

## Why Monad

The product is a checkout, and a checkout has to feel instant.

- **Shops are paid in the same moment the customer taps Pay.** Monad's ~300 ms blocks and ~600 ms finality
  mean the shop's balance changes while the customer is still at the counter — measured and shown in the app
  (e.g. *Shop was paid · 0.8 s*). Card networks settle to merchants a day or two later.
- **The rule lives where the money is.** "Only this school", "only grocery stores" is checked by the contract
  on every payment. That only works as a consumer product if each check is a sub-second, near-free
  transaction — otherwise the enforcement costs more than the purchase.
- **Receipts are stored on-chain, not reconstructed from logs.** Monad full nodes don't serve arbitrary
  historic state (the public testnet RPC caps `eth_getLogs` at 100 blocks), so Kirogi keeps each receipt in
  contract storage and the sender's feed is one view call.
- **Declared gas.** Monad charges the declared gas limit, so the relayer declares fixed limits per action
  instead of estimating — which also lets a refused payment be broadcast and recorded.

## Architecture

```
 phone (Next.js PWA)                        Kirogi relayer (Next.js route)            Monad
 ───────────────────                        ─────────────────────────────            ─────
 Face ID passkey ──mera──► secp256k1 key
 you (index 0)  · family (index 1)
      │ EIP-712 signature                         submits *WithSig, pays gas
      ├─ Send{sender,recipient,partsHash,…} ───►  sendWithSig + EIP-2612 permit ───►  Kirogi.sol
      ├─ Pay{recipient,pocketId,merchant,…} ───►  payWithSig ───────────────────────►  ├ pockets[]  (purpose, rule, payees, expiry)
      └─ Allow{sender,pocketId,payee,…}     ───►  allowPayeeWithSig ────────────────►  ├ merchants  (category registry)
                                                                                       ├ receipts[] (on-chain feed)
 reads: pocketsOfRecipient · receiptsOfSender · findPocket (view calls)  ◄───────────  └ dollar: TestUSD (testnet) / AUSD (mainnet)
```

- **`contracts/src/Kirogi.sol`** — pockets, rules (`Category` = any merchant registered for the purpose;
  `Payees` = only named payees), `pay` / `payWithSig`, `NotAllowed` refusals, `allowPayee(WithSig)`,
  `reclaim` after expiry, `findPocket` so the shop's QR alone decides which part pays.
- **`contracts/src/TestUSD.sol`** — used only for local development. On Monad testnet Kirogi runs on **official
  Circle USDC** (and Agora **AUSD**); on mainnet, AUSD (`0x00000000eFE302BEAA2b3e6e1b18d08D69a9012a`) or USDC. The
  app reads each token's EIP-712 domain, so permit works for USDC (version "2") and AUSD alike.
- **`web/`** — Next.js app. `lib/accounts.ts` derives two accounts from one passkey with
  [mera](https://docs.monad.xyz/guides/mera) so one judge can play both sides on one phone;
  `app/api/relay/route.ts` is the gas sponsor (it can only submit what users signed; every call is verified
  on-chain); pages: `/send`, `/family`, `/activity`, `/shop`.

## Deployment

| Network | Contract | Address |
|---|---|---|
| Monad testnet | Kirogi | [`0x4B2EABEE3C1FA53f64e6e52aE26a140B71c41b47`](https://testnet.monadvision.com/address/0x4B2EABEE3C1FA53f64e6e52aE26a140B71c41b47) |
| Monad testnet | Dollar: **Circle USDC** (official) | [`0x534b2f3A21130d7a60830c2Df862319e593943A3`](https://testnet.monadvision.com/address/0x534b2f3A21130d7a60830c2Df862319e593943A3) |
| Monad testnet | AUSD (Agora, official) — next deployment | `0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC` |

**Recorded demo run (testnet, Circle USDC):**

| What happened | Result | Tx |
|---|---|---|
| Dad sends $10.00, split three ways | arrived · 1.8 s | [0x0dc0…24eb](https://testnet.monadvision.com/tx/0x0dc051684f441dfa5af1b4a9376c66ebcaa124b60106c4c55b7a208b447724eb) |
| Jiwoo pays Westwood Market from Groceries | paid · 0.9 s | [0xf298…10d4](https://testnet.monadvision.com/tx/0xf298d587e2829f0ec0e25ae8f05a8d4942612a538bd545f794cf001b3f8010d4) |
| Jiwoo tries Neon Arcade with grocery money | **refused: `NotAllowed`** · 0.5 s | [0x76cc…a568](https://testnet.monadvision.com/tx/0x76ccd93ce736babe3faac0b497291d75466b81a2887945b34eb37b41ce30a568) |
| Dad allows Neon Arcade for that pocket | allowed | [0x3998…3601](https://testnet.monadvision.com/tx/0x3998fc3da865384c63842f20f7daa9eb92dbdaf7a23dd5950a1222a725153601) |
| Jiwoo pays Neon Arcade again | paid | [0x3e7c…94fa](https://testnet.monadvision.com/tx/0x3e7c7dfa5e3585a546b0661fb5f930842f9df15bdde83709fd4276af22d594fa) |

Demo merchants are fixed addresses derived from labels (`vm.addr(keccak256("kirogi.demo.merchant.westwood-market"))`),
so the script and the app agree without a config file.

## Tech stack

Solidity 0.8.28 · Foundry 1.8 (Monad execution, `network = "monad"`) · OpenZeppelin 5 · Next.js 16 ·
React 19 · viem 2 · @category-labs/mera (passkeys) · qrcode / qr-scanner

## Setup

```bash
# contracts
cd contracts
forge test                       # 14 tests: pay, refuse, overspend, expiry/reclaim, signatures, permit, allow
anvil --network monad --block-time 0.3 &
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80   # anvil key #0

# app
cd ../web
cp .env.example .env.local       # fill NEXT_PUBLIC_KIROGI / NEXT_PUBLIC_DOLLAR from the deploy output
npm install && npm run dev       # http://localhost:3000
```

Testnet: `forge script script/Deploy.s.sol --rpc-url monad_testnet --broadcast --private-key $DEPLOYER_KEY`,
then set `NEXT_PUBLIC_CHAIN=testnet` and the printed addresses.

**Judges' path (3 minutes):** open the app → *Try the demo without Face ID* (or Face ID on a phone) →
send $2,000 split three ways → switch to **Jiwoo** → pay *Westwood Market* (paid) → pay *Neon Arcade*
(refused by the contract) → *Ask Dad to allow it* → switch to **You** → *Allow* → back to Jiwoo, pay again.

## Build window & prior work

All code in this repository was written during the Metropolis window (2026-09-01 – 2026-10-13).
Pre-existing components: the **Kirogi name, mark (`design/assets/kirogi/`) and hero image `hero-geese.jpg`**
come from the author's earlier project for BUIDL CTC 2026 Fall (Creditcoin). No code from that project is used.
New assets made for this project (e.g. `design/assets/hero-arrival.jpg`) were generated with Codex image generation.
`contracts/lib/` vendors forge-std and the OpenZeppelin contracts (MIT), unmodified.

## AI tool disclosure

This project was built with AI coding assistants (Claude Code, Codex). All generated code was reviewed and
tested by the author. Images in `design/assets/` marked as generated were made with Codex image generation;
the demo narration was generated with Google Gemini text-to-speech.

## License

MIT
