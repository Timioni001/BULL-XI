import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";
import "@fontsource/inter/200.css";
import "@fontsource/inter/300.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/inter/800.css";
import "@fontsource/ibm-plex-mono/400.css";
import { Composition, continueRender, delayRender } from "remotion";
import { Film } from "./Film";
import timeline from "./timeline.json";

// Wait for the web fonts before any frame is captured.
const fontsReady = delayRender("fonts");
void document.fonts.ready.then(() => continueRender(fontsReady));

export const Root = () => <Composition id="BullXI" component={Film} durationInFrames={timeline.frames} fps={timeline.fps} width={1920} height={1080} />;
