# Assemble the narrated reel.
#   python3 video/build.py [narration.wav]      (default video/audio/narration-raw.wav)
# Each scene lasts as long as its narration line plus breathing room. App scenes put the real screen
# recording (clips/NN.mp4, from record.mjs) inside the phone of their still (frames/NN.png), fitted to
# that length. Scenes cross-fade; each narration line is placed at its scene's start.
import json, pathlib, re, subprocess, sys

HERE = pathlib.Path(__file__).parent
FR, CL, OUT = HERE / "frames", HERE / "clips", HERE / "out"
OUT.mkdir(exist_ok=True)
AUDIO = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / "audio" / "narration-raw.wav"
SCENES = ["00-open", "01-problem", "02-send", "03-arrived", "04-pay", "05-refuse", "06-allow",
          "07-proof", "08-why", "09-tests", "10-close"]
PX, PY, PW, PH = 1180, 82, 420, 908
LEAD, TAIL, F, FPS = 0.6, 0.9, 0.5, 30


def run(*a):
    subprocess.run(a, check=True)


def probe(p):
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                          "-of", "csv=p=0", str(p)]).decode())


def paragraphs():
    t = (HERE / "narration.md").read_text().split("---", 1)[1].strip()
    return [x.strip() for x in t.split("\n\n") if x.strip()]


def speech_segments(wav):
    """One spoken span per scene. Each scene break is the pause closest to where the script says it
    should fall (by characters spoken so far), so a dramatic pause mid-scene ("Why Monad? …") never
    splits a scene and a short pause between scenes is still found."""
    log = subprocess.run(["ffmpeg", "-i", str(wav), "-af", "silencedetect=noise=-40dB:d=0.35", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", log)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", log)]
    total = probe(wav)
    lead = next((e for s, e in zip(starts, ends) if s < 0.05), 0.0)
    tail = next((s for s, e in zip(starts, ends) if e >= total - 0.05), total)
    gaps = [(s, e) for s, e in zip(starts, ends) if lead + 0.3 < s and e < tail - 0.3]
    paras = paragraphs()
    if len(paras) != len(SCENES):
        sys.exit(f"narration.md has {len(paras)} paragraphs for {len(SCENES)} scenes")
    chars = [len(p) for p in paras]
    speech = tail - lead
    want, acc = [], 0
    for c in chars[:-1]:
        acc += c
        want.append(lead + speech * acc / sum(chars))
    n = len(want)
    # 1) pauses of 1.2 s+ are the <long pause> tags: certain scene breaks. Fit them to breaks in order.
    long_ = [g for g in gaps if g[1] - g[0] >= 1.2][:n]
    assign = {}
    k0 = 0
    for g in long_:
        mid = (g[0] + g[1]) / 2
        left = n - k0 - (len(long_) - len(assign))  # breaks we may still skip
        k = min(range(k0, k0 + left + 1), key=lambda j: abs(want[j] - mid))
        assign[k] = g
        k0 = k + 1
    # 2) the rest: the best pause between the neighbouring certain breaks
    for k in range(n):
        if k in assign:
            continue
        lo = max([assign[j][1] for j in assign if j < k], default=lead)
        hi = min([assign[j][0] for j in assign if j > k], default=tail)
        cand = [g for g in gaps if lo < g[0] and g[1] < hi and g not in assign.values()]
        if not cand:
            sys.exit(f"no pause found for scene break {k + 1}")
        assign[k] = min(cand, key=lambda g: abs((g[0] + g[1]) / 2 - want[k]) - 1.0 * (g[1] - g[0]))
    cuts = [assign[k] for k in range(n)]
    cuts.sort()
    bounds = [lead] + [x for g in cuts for x in g] + [tail]
    return [[bounds[i], bounds[i + 1]] for i in range(0, len(bounds), 2)]


def base_input(name, dur):
    """The scene's background: its animated card (cards/NN.mp4, held on the last frame) or the still."""
    card = HERE / "cards" / f"{name}.mp4"
    if card.exists():
        return ["-i", str(card)], f"[0:v]fps={FPS},tpad=stop_mode=clone:stop_duration={dur:.2f},trim=duration={dur:.2f},setpts=PTS-STARTPTS[bg]"
    return ["-loop", "1", "-t", f"{dur:.2f}", "-i", str(FR / f"{name}.png")], f"[0:v]fps={FPS},trim=duration={dur:.2f}[bg]"


def scene_video(name, dur):
    out = OUT / f"{name}.mp4"
    clip = CL / f"{name}.mp4"
    inp, bg = base_input(name, dur)
    if not clip.exists():
        run("ffmpeg", "-y", "-loglevel", "error", *inp, "-filter_complex", bg + ";[bg]format=yuv420p[v]", "-map", "[v]",
            "-c:v", "libx264", "-crf", "18", str(out))
        return out
    cd = probe(clip)
    room = dur - 0.6
    # fit the recording to the line: speed it up if it's longer, hold its last frame if it's shorter
    speed = f"setpts=PTS*{room / cd:.4f}," if cd > room else ""
    hold = max(0.0, room - cd) + 0.3
    fc = (bg + f";[1:v]{speed}scale={PW}:{PH}:flags=lanczos,tpad=start_duration=0.6:start_mode=clone:"
          f"stop_duration={hold:.2f}:stop_mode=clone[c];"
          f"[bg][c]overlay={PX}:{PY}:shortest=0[v1];[v1][2:v]overlay=0:0,trim=duration={dur:.2f},fps={FPS},format=yuv420p[v]")
    run("ffmpeg", "-y", "-loglevel", "error", *inp, "-i", str(clip),
        "-loop", "1", "-t", f"{dur:.2f}", "-i", str(FR / "phone.png"), "-filter_complex", fc, "-map", "[v]",
        "-c:v", "libx264", "-crf", "18", str(out))
    return out


segs = speech_segments(AUDIO)
dur = [round(LEAD + (e - s) + TAIL, 2) for s, e in segs]
dur[-1] += 1.5
parts = [scene_video(n, d) for n, d in zip(SCENES, dur)]

args = ["ffmpeg", "-y", "-loglevel", "error"]
for p in parts:
    args += ["-i", str(p)]
args += ["-i", str(AUDIO)]
A = len(parts)
f, prev, off, starts, t = "", "0:v", 0.0, [], 0.0
for d in dur:
    starts.append(round(t, 2)); t += d - F
for i in range(1, A):
    off = round(off + dur[i - 1] - F, 2)
    f += f"[{prev}][{i}:v]xfade=transition=fade:duration={F}:offset={off}[x{i}];"; prev = f"x{i}"
f += f"[{prev}]format=yuv420p,fps={FPS}[vout];"
for i, (s, e) in enumerate(segs):
    ms = int((starts[i] + LEAD) * 1000)
    f += (f"[{A}:a]atrim={s}:{e + 0.05},asetpts=PTS-STARTPTS,afade=t=in:d=0.03,"
          f"afade=t=out:st={max(0, e - s - 0.02)}:d=0.07,adelay={ms}|{ms}[a{i}];")
f += "".join(f"[a{i}]" for i in range(A)) + f"amix=inputs={A}:normalize=0,loudnorm=I=-16:TP=-1.5[aout]"
final = HERE.parent / "docs" / "kirogi-monad-demo.mp4"
final.parent.mkdir(exist_ok=True)
args += ["-filter_complex", f, "-map", "[vout]", "-map", "[aout]", "-c:v", "libx264", "-preset", "slow", "-crf", "21",
         "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", str(final)]
run(*args)
total = round(sum(dur) - F * (A - 1), 1)
print(json.dumps({"scenes": dict(zip(SCENES, dur)), "total_s": total, "out": str(final)}, indent=1))
