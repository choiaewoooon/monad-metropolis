import Link from "next/link";
import { chain, DOLLAR, EXPLORER, KIROGI } from "@/lib/config";
import { EVIDENCE } from "@/lib/evidence";
import { LiveStats } from "./LiveStats";
import "./site.css";

const addr = (a?: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "—");
const link = (kind: "address" | "tx", v?: string) => (EXPLORER && v ? `${EXPLORER}/${kind}/${v}` : undefined);

export default function Landing() {
  return (
    <div className="site">
      <nav className="nav">
        <Link href="/" className="logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/kirogi-mark.png" alt="" />
          Kirogi
        </Link>
        <a href="#how">How it works</a>
        <a href="#proof">Proof</a>
        <a href="https://github.com/choiaewoooon/monad-metropolis" target="_blank" rel="noreferrer">Source</a>
        <Link href="/app" className="btn-sm">Open the app</Link>
      </nav>

      <header className="hero">
        <div className="hero__img" role="img" aria-label="Wild geese arriving over a city at dawn" />
        <div className="shell hero__text">
          <h1 className="d1">Sent abroad.<br />Spent as intended.</h1>
          <p className="lede">
            International remittance with earmarked spending. Send dollars to family in another country, decide what
            each one is for, and let the contract refuse everything else — while the shop's payment is final in about two seconds.
          </p>
          <div className="actions">
            <Link href="/app" className="btn primary">Open the app</Link>
            <a href="#video" className="btn">Watch the demo</a>
          </div>
          <p className="mono meta">Monad testnet · Circle USDC · Mera passkeys · no seed phrase, no gas</p>
        </div>
      </header>

      <section className="section shell" id="how">
        <p className="eyebrow">The crossing</p>
        <h2 className="d2">Money crosses the border.<br />Now its purpose does too.</h2>
        <figure className="crossing">
          <div className="rail rail--send">
            <p className="rail__who">You · abroad</p>
            <p className="rail__amount">$10.00<span>USDC</span></p>
            <p className="rail__note">One passkey signature. Kirogi pays the gas.</p>
          </div>
          <div className="wire" aria-hidden><i /></div>
          <div className="rail rail--home">
            <p className="rail__who">Jiwoo · home</p>
            <ul className="pockets">
              <li><span><img src="/icons/tuition.png" alt="" />Tuition</span><b>$6.00</b><em>Westwood Academy only</em></li>
              <li><span><img src="/icons/rent.png" alt="" />Rent</span><b>$2.50</b><em>the landlord only</em></li>
              <li><span><img src="/icons/groceries.png" alt="" />Groceries</span><b>$1.50</b><em>any grocery store</em></li>
            </ul>
          </div>
        </figure>
        <div className="outcomes">
          <div className="outcome ok"><span className="dot" />Westwood Market · Groceries<b>paid in &lt;1 s</b></div>
          <div className="outcome no"><span className="dot" />Neon Arcade · Groceries<b>refused: NotAllowed</b></div>
        </div>
      </section>

      <section className="section shell">
        <p className="eyebrow">What the contract checks</p>
        <h2 className="d2">Four things, on every payment.</h2>
        <ol className="checks">
          <li><h3>The family member signed it</h3><p>EIP-712 signature from their passkey account. The relayer can submit, never forge.</p></li>
          <li><h3>The money is still earmarked</h3><p>The pocket hasn&apos;t expired. After 30 days, unspent dollars go back to the sender.</p></li>
          <li><h3>This shop is allowed</h3><p>A merchant registered for that purpose, or a payee the sender named. Anything else reverts.</p></li>
          <li><h3>There&apos;s enough left</h3><p>A pocket can never pay more than it holds. No overdraft, no borrowing from another pocket.</p></li>
        </ol>
      </section>

      <section className="section shell" id="proof">
        <p className="eyebrow">Proof on Monad</p>
        <h2 className="d2">Not a promise in the app.<br />A rule in the contract.</h2>
        <div className="live">
          <div><p className="label">Kirogi contract</p>
            <p className="value mono"><a href={link("address", KIROGI)} target="_blank" rel="noreferrer">{addr(KIROGI)}</a></p></div>
          <div><p className="label">Dollar</p>
            <p className="value mono"><a href={link("address", DOLLAR)} target="_blank" rel="noreferrer">{chain.id === 10143 ? "Circle USDC" : chain.id === 143 ? "AUSD" : "Test dollar"} · {addr(DOLLAR)}</a></p></div>
          <LiveStats />
        </div>
        {EVIDENCE.length > 0 && (
          <div className="table">
            <div className="row head"><span>What happened</span><span>Result</span><span>Transaction</span></div>
            {EVIDENCE.map((e) => (
              <div className="row" key={e.tx}>
                <span>{e.what}</span>
                <span className={e.ok ? "ok" : "no"}>{e.result}</span>
                <a className="mono" href={link("tx", e.tx)} target="_blank" rel="noreferrer">{addr(e.tx)}</a>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="section shell">
        <p className="eyebrow">Why Monad</p>
        <h2 className="d2">A rule you can check at a checkout.</h2>
        <div className="nums">
          <div><b>300 ms</b><span>blocks — the shop sees the money while the customer is at the counter</span></div>
          <div><b>600 ms</b><span>finality — a refusal is final before anyone walks away</span></div>
          <div><b>every</b><span>payment checked on-chain, for a fraction of a cent</span></div>
        </div>
      </section>

      <section className="section shell" id="video">
        <p className="eyebrow">Demo</p>
        <h2 className="d2">Two minutes, one family.</h2>
        <video className="video" src="/kirogi-monad-demo.mp4" controls preload="metadata" poster="/hero-arrival.jpg" />
      </section>

      <footer className="footer shell">
        <p>Kirogi (기러기) is the Korean word for a wild goose — and for a family with a border running through it.</p>
        <p className="mono">Monad Metropolis · Track 02 Consumer Products &amp; Payments · MIT</p>
      </footer>
    </div>
  );
}
