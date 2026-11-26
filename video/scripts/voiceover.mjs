/**
 * Generates the narration with ElevenLabs (free plan, ~1,000 characters) into
 * public/audio/vo/<id>.mp3 and writes their lengths to src/vo.json.
 * The key is injected by the session proxy or ELEVENLABS_API_KEY.
 *   node scripts/voiceover.mjs [id ...]
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const lines = JSON.parse(fs.readFileSync(path.join(root, "src/lines.json"), "utf8"));
const only = process.argv.slice(2);
const VOICE = process.env.VOICE_ID || "JBFqnCBsd6RMkjVDRZzb"; // George: warm storyteller
const dir = path.join(root, "public/audio/vo");
fs.mkdirSync(dir, { recursive: true });

for (const l of lines) {
  const file = path.join(dir, `${l.id}.mp3`);
  if (only.length ? !only.includes(l.id) : fs.existsSync(file)) continue;
  // curl goes through the session proxy, which adds the key.
  const body = JSON.stringify({ text: l.text, model_id: "eleven_multilingual_v2", voice_settings: { stability: 0.55, similarity_boost: 0.8, style: 0.25, use_speaker_boost: true } });
  const code = execFileSync("curl", ["-s", "-m", "120", "-o", file, "-w", "%{http_code}", "-X", "POST", `https://api.elevenlabs.io/v1/text-to-speech/${VOICE}?output_format=mp3_44100_128`, "-H", "content-type: application/json", "-H", `xi-api-key: ${process.env.ELEVENLABS_API_KEY || "proxy"}`, "--data-binary", body]).toString();
  if (code !== "200") {
    const err = fs.readFileSync(file, "utf8");
    fs.rmSync(file);
    throw new Error(`${l.id}: ${code} ${err}`);
  }
  console.log("voice", l.id);
}

const lengths = Object.fromEntries(
  lines.map((l) => {
    const s = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path.join(dir, `${l.id}.mp3`)]).toString().trim();
    return [l.id, Number(Number(s).toFixed(3))];
  }),
);
fs.writeFileSync(path.join(root, "src/vo.json"), JSON.stringify(lengths, null, 2) + "\n");
console.log(lengths);
