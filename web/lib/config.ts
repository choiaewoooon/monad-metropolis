import { defineChain, keccak256, stringToHex, toBytes, type Address, type Hex } from "viem";
import { privateKeyToAddress } from "viem/accounts";
import { monad, monadTestnet } from "viem/chains";

const local = defineChain({
  id: 31337,
  name: "Monad (local)",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: ["http://127.0.0.1:8545"] } },
});

const which = process.env.NEXT_PUBLIC_CHAIN ?? "local";
export const chain = which === "testnet" ? monadTestnet : which === "mainnet" ? monad : local;
export const RPC = process.env.NEXT_PUBLIC_RPC || chain.rpcUrls.default.http[0];
export const KIROGI = process.env.NEXT_PUBLIC_KIROGI as Address;
export const DOLLAR = process.env.NEXT_PUBLIC_DOLLAR as Address;
export const EXPLORER =
  process.env.NEXT_PUBLIC_EXPLORER ?? (which === "testnet" ? "https://testnet.monadvision.com" : "");
export const DECIMALS = 6;

export const txUrl = (hash: string) => (EXPLORER ? `${EXPLORER}/tx/${hash}` : "");

/** Solidity `bytes32 x = "GROCERIES"` — left-aligned ASCII, zero padded. */
export const purposeId = (p: string): Hex => stringToHex(p, { size: 32 });

export type Purpose = "TUITION" | "RENT" | "GROCERIES" | "PHARMACY" | "ENTERTAINMENT";
export const PURPOSE_LABEL: Record<Purpose, string> = {
  TUITION: "Tuition",
  RENT: "Rent",
  GROCERIES: "Groceries",
  PHARMACY: "Pharmacy",
  ENTERTAINMENT: "Entertainment",
};
export const labelOf = (id: string): string => {
  const hit = (Object.keys(PURPOSE_LABEL) as Purpose[]).find((p) => purposeId(p) === id);
  return hit ? PURPOSE_LABEL[hit] : "Other";
};

/** Same derivation as script/Deploy.s.sol: vm.addr(uint256(keccak256(label))).
 * The keys are public on purpose — demo shops only. The relayer uses them to sweep demo dollars back. */
export const demoKey = (label: string): Hex => keccak256(toBytes(label));
const demoAddress = (label: string): Address => privateKeyToAddress(demoKey(label));

export type Place = {
  id: string;
  label: string;
  name: string;
  address: Address;
  /** registered merchant category, or null for a named payee (school, landlord) */
  category: Purpose | null;
  kind: string;
};

export const PLACES: Place[] = [
  { id: "westwood-market", label: "kirogi.demo.merchant.westwood-market", name: "Westwood Market", kind: "Grocery store", category: "GROCERIES",
    address: demoAddress("kirogi.demo.merchant.westwood-market") },
  { id: "corner-pharmacy", label: "kirogi.demo.merchant.corner-pharmacy", name: "Corner Pharmacy", kind: "Pharmacy", category: "PHARMACY",
    address: demoAddress("kirogi.demo.merchant.corner-pharmacy") },
  { id: "neon-arcade", label: "kirogi.demo.merchant.neon-arcade", name: "Neon Arcade", kind: "Arcade", category: "ENTERTAINMENT",
    address: demoAddress("kirogi.demo.merchant.neon-arcade") },
  { id: "westwood-academy", label: "kirogi.demo.payee.westwood-academy", name: "Westwood Academy", kind: "School", category: null,
    address: demoAddress("kirogi.demo.payee.westwood-academy") },
  { id: "landlord", label: "kirogi.demo.payee.landlord", name: "Landlord", kind: "Rent", category: null,
    address: demoAddress("kirogi.demo.payee.landlord") },
];
export const placeByAddress = (a: string) => PLACES.find((p) => p.address.toLowerCase() === a.toLowerCase());
export const placeById = (id: string) => PLACES.find((p) => p.id === id);

/** Demo scale. Testnet dollars are official (Circle USDC / Agora AUSD) and come from rate-limited faucets,
 * so the demo moves ten dollars, not thousands. */
export const DEMO_FUND = 10;

/** Codex-made icons in the Kirogi mark's style (public/icons). */
export const PURPOSE_ICON: Record<string, string> = {
  Tuition: "/icons/tuition.png", Rent: "/icons/rent.png", Groceries: "/icons/groceries.png",
  Pharmacy: "/icons/pharmacy.png", Entertainment: "/icons/arcade.png",
};
export const PLACE_ICON: Record<string, string> = {
  "westwood-market": "/icons/groceries.png", "corner-pharmacy": "/icons/pharmacy.png", "neon-arcade": "/icons/arcade.png",
  "westwood-academy": "/icons/tuition.png", landlord: "/icons/rent.png",
};
