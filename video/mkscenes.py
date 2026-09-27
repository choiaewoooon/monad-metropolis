# Render the reel's still scenes (1920x1080) with headless Chrome.
# Card scenes carry the story; app scenes are a caption on the left and an empty phone on the right,
# into which build.py drops the real screen recording, then lays the bezel (phone.png) on top.
import subprocess, pathlib

HERE = pathlib.Path(__file__).parent
SC, FR = HERE / "scenes", HERE / "frames"
FR.mkdir(exist_ok=True)
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

# phone screen box in the 1920x1080 frame (390x844 at 1.076x)
PX, PY, PW, PH = 1180, 82, 420, 908

HEAD = """<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
:root{--ink:#08090c;--raised:#0f1116;--line:#1d2029;--line-bright:#2a2e3a;--text:#f2f4f7;--dim:#9aa2b1;--faint:#626b7b;
--send:#8fa6ff;--home:#f0b36b;--pass:#46cf95;--fail:#ff6b6b}
*{box-sizing:border-box}html,body{margin:0}
body{width:1920px;height:1080px;background:var(--ink);color:var(--text);font-family:Archivo,system-ui,sans-serif;
-webkit-font-smoothing:antialiased;overflow:hidden;position:relative}
.card{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;padding:0 160px}
.step{font-family:'JetBrains Mono',monospace;font-size:20px;letter-spacing:.22em;color:var(--faint);text-transform:uppercase;margin-bottom:40px}
h1{font-weight:600;letter-spacing:-.035em;line-height:1.03;margin:0;font-size:104px;max-width:22ch}
h1.sm{font-size:84px}
p{margin:32px 0 0;font-size:30px;line-height:1.5;color:var(--dim);max-width:44ch}
.send{color:var(--send)}.home{color:var(--home)}.pass{color:var(--pass)}.fail{color:var(--fail)}
.app .card{right:840px;padding-right:40px}
.app h1{font-size:88px}
.term{background:var(--raised);border:1px solid var(--line);border-radius:20px;padding:48px 60px;font-family:'JetBrains Mono',monospace;
font-size:25px;line-height:1.8;color:var(--dim);white-space:pre}
.term .ok{color:var(--pass)}.term b{color:var(--text);font-weight:400}
.nums{display:grid;grid-template-columns:repeat(3,auto);gap:0 90px;margin-top:64px;justify-content:start}
.nums b{display:block;font-size:92px;font-weight:600;letter-spacing:-.045em;line-height:1}
.nums span{display:block;margin-top:14px;font-size:24px;color:var(--dim)}
.card>*{animation:up .9s cubic-bezier(.2,.8,.2,1) both}
.card>*:nth-child(2){animation-delay:.18s}.card>*:nth-child(3){animation-delay:.36s}.card>*:nth-child(4){animation-delay:.54s}
.nums>div{animation:up .9s cubic-bezier(.2,.8,.2,1) both}.nums>div:nth-child(2){animation-delay:.9s}.nums>div:nth-child(3){animation-delay:1.1s}
@keyframes up{from{opacity:0;transform:translateY(26px)}to{opacity:1;transform:none}}
.push{animation:push 14s linear both}@keyframes push{from{transform:scale(1.02)}to{transform:scale(1.12)}}
.wire{height:2px;width:520px;transform-origin:left;animation:grow 1.6s .7s cubic-bezier(.6,0,.35,1) both}
@keyframes grow{from{transform:scaleX(0)}to{transform:scaleX(1)}}
body.still *{animation:none!important}
.wire{background:linear-gradient(90deg,var(--send),var(--home));margin-top:56px;border-radius:2px}
</style></head><body>"""

def app_scene(step, title, body, cls=""):
    return HEAD + f"""<div class="app"><div class="card"><div class="step">{step}</div>
<h1 class="{cls}">{title}</h1><p>{body}</p></div></div></body></html>"""

SCENES = {
  "00-open": HEAD + """<div class="push" style="position:absolute;inset:0;background:url(hero-arrival.jpg) 100% 60%/135% auto no-repeat"></div>
<div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(8,9,12,.96) 0%,rgba(8,9,12,.8) 38%,rgba(8,9,12,0) 70%)"></div>
<div class="card"><img src="kirogi-mark.png" style="height:150px;align-self:flex-start;margin-bottom:44px">
<h1>Sent abroad.<br>Spent as intended.</h1>
<p>International remittance with earmarked spending, on Monad.</p></div></body></html>""",
  "01-problem": HEAD + """<div class="card"><div class="step">The problem</div>
<h1>Money crosses the border.<br>Its purpose doesn't.</h1>
<p>A parent abroad sends money for tuition, rent and food. On arrival it is just cash, and the sender can only hope.</p>
<div class="wire"></div></div></body></html>""",
  "02-send": app_scene("Send", "Say what<br>it's for.", "Face ID, no seed phrase, no gas. <span class='home'>$10</span> of real USDC, split three ways, each with its own rule."),
  "03-arrived": app_scene("Arrive", "Signed once.<br>Final in seconds.", "One passkey signature. Kirogi pays the network fee; Monad finalizes it in about two seconds."),
  "04-pay": app_scene("Spend", "Paid at<br>the counter.", "The shop's code decides which part pays. The grocery store is paid before she leaves."),
  "05-refuse": app_scene("Refuse", "The contract<br>says <span class='fail'>no</span>.", "Grocery money can't pay an arcade. Not the app — the contract reverts, on-chain. Her balance doesn't move."),
  "06-allow": app_scene("Ask &amp; allow", "One signature<br>to allow.", "Jiwoo asks. Dad approves with one signature, recorded on-chain. The next try goes through."),
  "07-proof": app_scene("Proof", "Proof, not<br>a promise.", "Every payment is a receipt stored on-chain: shop, purpose, amount. Dad sees it land."),
  "08-why": HEAD + """<div class="card"><div class="step">Why Monad</div>
<h1 class="sm">A rule you can check<br>at a checkout.</h1>
<div class="nums"><div><b>300 ms</b><span>block time</span></div><div><b>600 ms</b><span>finality</span></div><div><b class="pass">every</b><span>payment checked on-chain</span></div></div>
</div></body></html>""",
  "09-tests": HEAD + """<div class="card"><div class="step">Tested</div><div class="term"><b>$ forge test</b>
<span class="ok">[PASS]</span> test_pay_groceryMerchant()
<span class="ok">[PASS]</span> test_refuse_merchantOutsidePurpose()
<span class="ok">[PASS]</span> test_refuse_tuitionPocketAtMarket()
<span class="ok">[PASS]</span> test_refuse_overspend()
<span class="ok">[PASS]</span> test_reclaimAfterExpiry()
<span class="ok">[PASS]</span> test_payWithSig_relayerSubmits()
<span class="ok">[PASS]</span> test_sendWithSig_andPermit()   … 14 passed, 0 failed</div></div></body></html>""",
  "10-close": HEAD + """<div class="card" style="align-items:center;text-align:center"><img src="kirogi-mark.png" style="height:230px;margin-bottom:52px">
<h1>Kirogi</h1><p style="max-width:none">Sent abroad. Spent as intended.</p>
<p style="font-family:'JetBrains Mono',monospace;font-size:22px;color:var(--faint);max-width:none">github.com/choiaewoooon/monad-metropolis</p></div></body></html>""",
}

PHONE = f"""<!doctype html><html><head><style>html,body{{margin:0;background:transparent}}
body{{width:1920px;height:1080px;position:relative}}
.b{{position:absolute;left:{PX-12}px;top:{PY-12}px;width:{PW+24}px;height:{PH+24}px;border-radius:62px;
border:12px solid #1a1c22;box-shadow:0 0 0 1px #2a2e3a,0 40px 90px rgba(0,0,0,.55)}}
.c{{position:absolute;left:{PX}px;top:{PY}px;width:{PW}px;height:{PH}px;border-radius:50px;box-shadow:0 0 0 40px #08090c}}
</style></head><body><div class="c"></div><div class="b"></div></body></html>"""

def shot(html_path, png, transparent=False):
    args = [CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
            "--window-size=1920,1080", "--virtual-time-budget=5000", f"--screenshot={png}"]
    if transparent: args.append("--default-background-color=00000000")
    subprocess.run(args + [f"file://{html_path}"], check=True, capture_output=True)

for name, html in SCENES.items():
    f = SC / f"{name}.html"; f.write_text(html)
    g = SC / f"{name}.still.html"; g.write_text(html.replace("<body>", '<body class="still">', 1))
    shot(g, FR / f"{name}.png")
f = SC / "phone.html"; f.write_text(PHONE)
shot(f, FR / "phone.png", transparent=True)
print("rendered", len(SCENES) + 1)
