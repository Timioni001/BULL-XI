/** Scene timing from the narration lengths: src/timeline.json (used by the film and the music). */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const vo = JSON.parse(fs.readFileSync(path.join(root, "src/vo.json"), "utf8"));
const FPS = 30;
// [scene id, voice line, voice delay (s), minimum scene length (s)]
const plan = [
  ["open", "open", 1.2, 8.2],
  ["question", "question", 0.6, 7.0],
  ["title", "title", 0.9, 5.4],
  ["squad", "squad", 0.6, 7.4],
  ["thesis", "thesis", 0.6, 8.0],
  ["pick", "pick", 0.6, 5.6],
  ["seal", "seal", 0.6, 8.6],
  ["points", "points", 0.6, 10.0],
  ["golden", "golden", 0.6, 8.6],
  ["hourly", "hourly", 0.6, 7.0],
  ["pro", "pro", 0.6, 10.5],
  ["pot", "pot", 0.6, 8.6],
  ["record", "record", 0.6, 8.0],
  ["everyone", "everyone", 0.6, 5.4],
  ["close", "close", 0.8, 9.0],
];
let t = 0;
const scenes = plan.map(([id, line, delay, min]) => {
  const len = Math.max(min, delay + vo[line] + 1.2);
  const s = { id, start: Math.round(t * FPS), frames: Math.round(len * FPS), voice: line, voiceAt: Math.round((t + delay) * FPS) };
  t += len;
  return s;
});
const out = { fps: FPS, frames: Math.round(t * FPS), seconds: Number(t.toFixed(2)), scenes };
fs.writeFileSync(path.join(root, "src/timeline.json"), JSON.stringify(out, null, 2) + "\n");
console.log(out.seconds, "s", scenes.map((s) => `${s.id}@${(s.start / FPS).toFixed(1)}`).join(" "));
