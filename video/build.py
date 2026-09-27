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


def speech_segments(wav):
    """Spoken spans between pauses (silencedetect), merged until there is one per scene."""
    log = subprocess.run(["ffmpeg", "-i", str(wav), "-af", "silencedetect=noise=-40dB:d=0.9", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", log)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", log)]
    total = probe(wav)
    segs, cur = [], 0.0
    for s, e in zip(starts, ends):
        if s - cur > 0.25:
            segs.append([cur, s])
        cur = e
    if total - cur > 0.25:
        segs.append([cur, total])
    # too many (a mid-sentence pause)? join across the shortest gaps
    while len(segs) > len(SCENES):
        gaps = [segs[i + 1][0] - segs[i][1] for i in range(len(segs) - 1)]
        i = gaps.index(min(gaps))
        segs[i] = [segs[i][0], segs[i + 1][1]]
        del segs[i + 1]
    if len(segs) != len(SCENES):
        sys.exit(f"found {len(segs)} spoken lines for {len(SCENES)} scenes — check the pauses in {wav}")
    return segs


def scene_video(name, dur):
    out = OUT / f"{name}.mp4"
    still = FR / f"{name}.png"
    clip = CL / f"{name}.mp4"
    if not clip.exists():
        run("ffmpeg", "-y", "-loglevel", "error", "-loop", "1", "-t", f"{dur:.2f}", "-i", str(still),
            "-vf", f"fps={FPS},format=yuv420p", "-c:v", "libx264", "-crf", "18", str(out))
        return out
    cd = probe(clip)
    room = dur - 0.3
    # fit the recording to the line: speed it up if it's longer, hold its last frame if it's shorter
    speed = f"setpts=PTS*{room / cd:.4f}," if cd > room else ""
    hold = max(0.0, room - cd) + 0.3
    fc = (f"[1:v]{speed}scale={PW}:{PH}:flags=lanczos,tpad=start_duration=0.3:start_mode=clone:"
          f"stop_duration={hold:.2f}:stop_mode=clone[c];"
          f"[0:v][c]overlay={PX}:{PY}:shortest=0[v1];[v1][2:v]overlay=0:0,trim=duration={dur:.2f},fps={FPS},format=yuv420p[v]")
    run("ffmpeg", "-y", "-loglevel", "error", "-loop", "1", "-t", f"{dur:.2f}", "-i", str(still), "-i", str(clip),
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
