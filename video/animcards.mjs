// Record each scene card (scenes/NN.html) with its entrance animation, as cards/NN.mp4 (1920x1080).
// build.py uses the clip as the scene's base and holds its last frame for the rest of the line.
import { spawn, execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";

const HERE = fileURLToPath(new URL("./", import.meta.url));
const OUT = HERE + "cards/";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9343, FPS = 30;
const LONG = { "00-open": 9000 }; // the hero push-in keeps moving
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--hide-scrollbars", `--remote-debugging-port=${PORT}`,
  "--user-data-dir=/tmp/kirogi-cards-" + Date.now(), "--window-size=1920,1080", "about:blank"], { stdio: "ignore" });
let t;
for (let i = 0; i < 60 && !t; i++) {
  try { t = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((x) => x.type === "page"); } catch {}
  if (!t) await sleep(250);
}
const ws = new WebSocket(t.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let id = 0; const pending = new Map(); let frames = [], rec = false, t0 = 0;
ws.addEventListener("message", (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
  if (m.method === "Page.screencastFrame") {
    if (rec) frames.push({ t: Date.now() - t0, buf: Buffer.from(m.params.data, "base64") });
    send("Page.screencastFrameAck", { sessionId: m.params.sessionId });
  }
});
const send = (method, params = {}) => new Promise((res, rej) => {
  const i = ++id; pending.set(i, (m) => (m.error ? rej(new Error(m.error.message)) : res(m.result)));
  ws.send(JSON.stringify({ id: i, method, params }));
});

await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
const names = readdirSync(HERE + "scenes").filter((f) => /^\d\d-[a-z-]+\.html$/.test(f)).map((f) => f.replace(".html", ""));
try {
  for (const name of names) {
    await send("Page.navigate", { url: "about:blank" });
    await sleep(200);
    await send("Page.startScreencast", { format: "jpeg", quality: 90, maxWidth: 1920, maxHeight: 1080 });
    frames = []; t0 = Date.now(); rec = true;
    await send("Page.navigate", { url: `file://${HERE}scenes/${name}.html` });
    await sleep(LONG[name] ?? 3200);
    rec = false;
    await send("Page.stopScreencast");
    // drop the blank frames before the page painted
    while (frames.length > 2 && frames[0].buf.length < 20000) frames.shift();
    const dir = OUT + name + "/"; mkdirSync(dir, { recursive: true });
    let list = "";
    frames.forEach((f, i) => {
      const file = `f${String(i).padStart(5, "0")}.jpg`; writeFileSync(dir + file, f.buf);
      const next = i + 1 < frames.length ? frames[i + 1].t : f.t + 1000 / FPS;
      list += `file '${file}'\nduration ${Math.max(1 / FPS, (next - f.t) / 1000).toFixed(3)}\n`;
    });
    list += `file 'f${String(frames.length - 1).padStart(5, "0")}.jpg'\n`;
    writeFileSync(dir + "list.txt", list);
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", dir + "list.txt",
      "-vf", `fps=${FPS},scale=1920:1080,format=yuv420p`, "-c:v", "libx264", "-crf", "17", OUT + name + ".mp4"]);
    rmSync(dir, { recursive: true, force: true });
    console.log("card", name, frames.length);
  }
} finally { ws.close(); chrome.kill(); }
