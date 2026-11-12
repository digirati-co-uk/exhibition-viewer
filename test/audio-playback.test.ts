import { describe, expect, test } from "bun:test";
import {
  audioPlaybackReducer,
  createAudioPlaybackState,
  describeAudioTime,
  describeMediaError,
  formatAudioTime,
  isAutoplayBlockedError,
  shouldPlayOnActivate,
  showAudioControls,
  showInitialPlayButton,
} from "../src/helpers/audio-playback";

const reduce = (events: Parameters<typeof audioPlaybackReducer>[1][], initial = createAudioPlaybackState(120)) =>
  events.reduce(audioPlaybackReducer, initial);

describe("audio playback state", () => {
  test("starts idle: large play button, no controls", () => {
    const state = createAudioPlaybackState(120);
    expect(showInitialPlayButton(state)).toBe(true);
    expect(showAudioControls(state)).toBe(false);
    expect(state.duration).toBe(120);
  });

  test("controls appear after the first play and stay for pause / end", () => {
    const playing = reduce([{ type: "play" }]);
    expect(playing.status).toBe("playing");
    expect(showInitialPlayButton(playing)).toBe(false);
    expect(showAudioControls(playing)).toBe(true);

    const paused = reduce([{ type: "play" }, { type: "pause" }]);
    expect(paused.status).toBe("paused");
    expect(showAudioControls(paused)).toBe(true);
    expect(showInitialPlayButton(paused)).toBe(false);
  });

  test("`pause` that precedes `ended` does not clobber the ended state", () => {
    const state = reduce([{ type: "play" }, { type: "pause" }, { type: "ended" }, { type: "pause" }]);
    expect(state.status).toBe("ended");
    expect(state.time).toBe(120);
  });

  test("blocked autoplay keeps the large button and explains why; a real play clears it", () => {
    const blocked = reduce([{ type: "autoplay-blocked" }]);
    expect(blocked.autoplayBlocked).toBe(true);
    expect(showInitialPlayButton(blocked)).toBe(true);
    expect(showAudioControls(blocked)).toBe(false);

    const recovered = audioPlaybackReducer(blocked, { type: "play" });
    expect(recovered.autoplayBlocked).toBe(false);
    expect(showAudioControls(recovered)).toBe(true);
  });

  test("autoplay-blocked after playback started is ignored", () => {
    const state = reduce([{ type: "play" }, { type: "pause" }, { type: "autoplay-blocked" }]);
    expect(state.autoplayBlocked).toBe(false);
  });

  test("errors replace both the button and the controls, and recover on play", () => {
    const failed = reduce([{ type: "error", message: "Nope" }]);
    expect(failed.status).toBe("error");
    expect(failed.error).toBe("Nope");
    expect(showInitialPlayButton(failed)).toBe(false);
    expect(showAudioControls(failed)).toBe(false);
    expect(reduce([{ type: "error" }]).error).toBe("This audio could not be played.");

    const recovered = audioPlaybackReducer(failed, { type: "play" });
    expect(recovered.status).toBe("playing");
    expect(recovered.error).toBeNull();
  });

  test("ignores non-finite time and duration", () => {
    const state = reduce([{ type: "time", time: Number.NaN }, { type: "duration", duration: Number.POSITIVE_INFINITY }]);
    expect(state.time).toBe(0);
    expect(state.duration).toBe(120);
    expect(reduce([{ type: "duration", duration: 61 }]).duration).toBe(61);
  });

  test("volume is clamped", () => {
    expect(reduce([{ type: "volume", volume: 4, muted: false }]).volume).toBe(1);
    expect(reduce([{ type: "volume", volume: -1, muted: true }])).toMatchObject({ volume: 0, muted: true });
  });
});

describe("autoplay and visibility rules", () => {
  test("only plays on activation when opted in, not user-paused and not finished", () => {
    expect(shouldPlayOnActivate({ autoplay: true, userPaused: false, hasEnded: false })).toBe(true);
    expect(shouldPlayOnActivate({ autoplay: false, userPaused: false, hasEnded: false })).toBe(false);
    expect(shouldPlayOnActivate({ autoplay: true, userPaused: true, hasEnded: false })).toBe(false);
    expect(shouldPlayOnActivate({ autoplay: true, userPaused: false, hasEnded: true })).toBe(false);
  });

  test("an opted-in presentation traversal replays ended audio without restarting finished scroll players", () => {
    expect(shouldPlayOnActivate({ autoplay: true, userPaused: false, hasEnded: true, replayEnded: true })).toBe(true);
    expect(shouldPlayOnActivate({ autoplay: false, userPaused: false, hasEnded: true, replayEnded: true })).toBe(false);
    expect(shouldPlayOnActivate({ autoplay: true, userPaused: true, hasEnded: true, replayEnded: true })).toBe(false);
  });

  test("recognises the browser autoplay policy rejection", () => {
    expect(isAutoplayBlockedError({ name: "NotAllowedError" })).toBe(true);
    expect(isAutoplayBlockedError(new DOMException("blocked", "NotAllowedError"))).toBe(true);
    expect(isAutoplayBlockedError({ name: "NotSupportedError" })).toBe(false);
    expect(isAutoplayBlockedError(null)).toBe(false);
  });
});

describe("audio formatting", () => {
  test("formats clock time", () => {
    expect(formatAudioTime(0)).toBe("0:00");
    expect(formatAudioTime(65.9)).toBe("1:05");
    expect(formatAudioTime(1985.024)).toBe("33:05");
    expect(formatAudioTime(3725)).toBe("1:02:05");
    expect(formatAudioTime(Number.NaN)).toBe("0:00");
    expect(formatAudioTime(-4)).toBe("0:00");
  });

  test("describes time for screen readers", () => {
    expect(describeAudioTime(0)).toBe("0 seconds");
    expect(describeAudioTime(1)).toBe("1 second");
    expect(describeAudioTime(65)).toBe("1 minute 5 seconds");
    expect(describeAudioTime(3600)).toBe("1 hour");
    expect(describeAudioTime(3725)).toBe("1 hour 2 minutes 5 seconds");
  });

  test("maps MediaError codes to readable messages", () => {
    expect(describeMediaError(2)).toContain("network");
    expect(describeMediaError(4)).toContain("not supported");
    expect(describeMediaError(undefined)).toBe("This audio could not be played.");
  });
});
