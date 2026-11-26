import timeline from "./timeline.json";
import lines from "./lines.json";
import vo from "./vo.json";

export type SceneId = (typeof timeline.scenes)[number]["id"];
export const FPS = timeline.fps;

export function scene(id: string) {
  const s = timeline.scenes.find((x) => x.id === id);
  if (!s) throw new Error(`no scene ${id}`);
  return s;
}

/**
 * Frame (relative to the scene start) when `phrase` is spoken in that scene's
 * narration, estimated from its position in the line.
 */
export function spoken(id: string, phrase: string, lead = 4): number {
  const s = scene(id);
  const line = lines.find((l) => l.id === s.voice)!;
  const idx = line.text.toLowerCase().indexOf(phrase.toLowerCase());
  if (idx < 0) throw new Error(`"${phrase}" not in ${s.voice}`);
  const secs = (vo as Record<string, number>)[s.voice] * (idx / line.text.length);
  return Math.max(0, s.voiceAt - s.start + Math.round(secs * FPS) - lead);
}
