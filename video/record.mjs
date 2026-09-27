// Record the real app, driven through Chrome DevTools, as one clip per scene.
// Every click below is a real click on the running app, and every payment is a real transaction.
// Screencast only emits frames on change, so frames are timestamped and resampled to a fixed fps.
//   node video/record.mjs [baseUrl]      (default http://localhost:3000)
import { spawn, execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";

const BASE = process.argv[2] ?? "http://localhost:3000";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9341;
const HERE = fileURLToPath(new URL("./", import.meta.url));
const CLIPS = HERE + "clips/";
const FPS = 30;
const W = 390, H = 844, DPR = 2;

// RESUME=<chrome profile dir> FROM=04 re-records from a scene onward with the same accounts
// (keeps earlier clips; saves testnet gas when a later scene failed).
const RESUME = process.env.RESUME, FROM = process.env.FROM ?? "02";
const at = (n) => n >= FROM;
if (!RESUME) rmSync(CLIPS, { recursive: true, force: true });
mkdirSync(CLIPS, { recursive: true });

const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--hide-scrollbars", `--remote-debugging-port=${PORT}`,
  "--user-data-dir=" + (RESUME ?? "/tmp/kirogi-record-profile-" + Date.now()), `--window-size=${W},${H}`, "about:blank",
], { stdio: "ignore" });

async function target() {
  for (let i = 0; i < 60; i++) {
    try {
      const j = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const p = j.find((t) => t.type === "page");
      if (p) return p;
    } catch {}
    await sleep(250);
  }
  throw new Error("CDP never came up");
}

const ws = new WebSocket((await target()).webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let id = 0;
const pending = new Map();
let frames = [];
let recording = false, t0 = 0;
ws.addEventListener("message", (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
  if (m.method === "Page.screencastFrame") {
    if (recording) frames.push({ t: Date.now() - t0, buf: Buffer.from(m.params.data, "base64") });
    send("Page.screencastFrameAck", { sessionId: m.params.sessionId });
  }
});
function send(method, params = {}) {
  return new Promise((res, rej) => {
    const i = ++id;
    pending.set(i, (m) => (m.error ? rej(new Error(method + ": " + m.error.message)) : res(m.result)));
    ws.send(JSON.stringify({ id: i, method, params }));
  });
}
const js = async (expr) => (await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true })).result?.value;

async function waitText(text, ms = 30000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await js(`document.body.innerText.includes(${JSON.stringify(text)})`)) return;
    await sleep(100);
  }
  throw new Error("timed out waiting for: " + text);
}
async function click(text) {
  const ok = await js(`(() => {
    const els = [...document.querySelectorAll('button, a')].filter(e => !e.disabled);
    const b = els.find(e => e.innerText.trim().replace(/\\s+/g,' ').startsWith(${JSON.stringify(text)}));
    if (!b) return false;
    b.scrollIntoView({block: 'center'}); b.click(); return true; })()`);
  if (!ok) throw new Error("no button: " + text);
}
async function go(path) {
  await send("Page.navigate", { url: BASE + path });
  await sleep(1200);
}

const evidence = [];
async function grab(what) {
  const tx = await js(`(() => { const e = [...document.querySelectorAll('[data-tx]')].pop(); return e ? [e.dataset.tx, e.dataset.ok] : null; })()`);
  if (tx) evidence.push({ what, tx: tx[0], ok: tx[1] === "1" });
}
async function start() { frames = []; t0 = Date.now(); recording = true; }
async function stop(name, holdMs = 800) {
  await sleep(holdMs);
  recording = false;
  if (frames.length < 2) {
    // a still page emits no screencast frames: take the picture ourselves
    const shot = await send("Page.captureScreenshot", { format: "jpeg", quality: 92 });
    const buf = Buffer.from(shot.data, "base64");
    frames = [{ t: 0, buf }, { t: Date.now() - t0 - 1, buf }];
  }
  const dir = CLIPS + name + "/";
  mkdirSync(dir, { recursive: true });
  let list = "";
  frames.forEach((f, i) => {
    const file = `f${String(i).padStart(5, "0")}.jpg`;
    writeFileSync(dir + file, f.buf);
    const next = i + 1 < frames.length ? frames[i + 1].t : Date.now() - t0;
    list += `file '${file}'\nduration ${Math.max(1 / FPS, (next - f.t) / 1000).toFixed(3)}\n`;
  });
  if (frames.length) list += `file 'f${String(frames.length - 1).padStart(5, "0")}.jpg'\n`;
  writeFileSync(dir + "list.txt", list);
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", dir + "list.txt",
    "-vf", `fps=${FPS},scale=${W * DPR}:${H * DPR}:flags=lanczos,format=yuv420p`, "-c:v", "libx264", "-crf", "16",
    CLIPS + name + ".mp4"]);
  rmSync(dir, { recursive: true, force: true });
  console.log("clip", name, frames.length, "frames");
}

await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: DPR, mobile: true });
await send("Page.startScreencast", { format: "jpeg", quality: 92, everyNthFrame: 1 });

try {
  if (RESUME) {
    await go("/app");
    await click("Try the demo without Face ID"); // same device key → same accounts
    await sleep(2500);
  }
  if (at("02")) {
  // 02 — sign in, amount, earmark
  await go("/app");
  await start();
  await sleep(1400);
  await click("Try the demo without Face ID");
  await waitText("How much");
  await waitText("Your balance");
  await sleep(2600); // let the balance land (demo dollars on testnet)
  await click("Continue");
  await waitText("What is it for?");
  await stop("02-send", 3200);

  // 03 — send, arrived
  await start();
  await click("Send $");
  await waitText("Jiwoo has it.", 60000);
  await grab("Dad sends $10.00, split into Tuition / Rent / Groceries");
  await stop("03-arrived", 3500);
  }

  // 04 — family pays the grocery store
  await go("/family");
  await waitText("Left this month");
  await start();
  await sleep(1500);
  await click("Westwood Market");
  await waitText("Paid from");
  await sleep(1600);
  await click("Pay");
  await waitText("Received in full.", 60000);
  await grab("Jiwoo pays Westwood Market from Groceries");
  await stop("04-pay", 3200);

  // 05 — the arcade is refused by the contract
  await click("Done");
  await waitText("Left this month");
  await start();
  await sleep(900);
  await click("Neon Arcade");
  await waitText("Not covered");
  await sleep(1600);
  await click("Pay");
  await sleep(200);
  await waitText("Balance unchanged.", 60000);
  await grab("Jiwoo tries Neon Arcade with grocery money");
  await stop("05-refuse", 3600);

  // 06 — ask, allow, pay again
  await start();
  await click("Ask Dad to allow it");
  await sleep(900);
  await go("/activity");
  await waitText("asks to use");
  await sleep(1500);
  await click("Allow");
  await waitText("allowed", 60000);
  await grab("Dad allows Neon Arcade for that pocket");
  await sleep(1500);
  await go("/family");
  await waitText("Left this month");
  await click("Neon Arcade");
  await waitText("Paid from");
  await sleep(900);
  await click("Pay");
  await waitText("Received in full.", 60000);
  await grab("Jiwoo pays Neon Arcade again");
  await stop("06-allow", 2500);

  // 07 — the sender's feed
  await go("/activity");
  await waitText("Shop was paid");
  await start();
  await sleep(4500);
  await stop("07-proof", 500);
  writeFileSync(HERE + "evidence.json", JSON.stringify(evidence, null, 1));
  console.log("evidence", evidence);
} finally {
  await send("Page.stopScreencast").catch(() => {});
  ws.close();
  chrome.kill();
}
