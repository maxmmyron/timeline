import { videoClips } from "$lib/stores";
import { createAutomation, createClip, getClipDuration, getClipEndPos, getCurrentClips, getLastTimelineClip, lerpAutomation } from "$lib/utils";
import { get } from "svelte/store";
import { beforeEach, describe, expect, it } from "vitest";

describe("getCurrentClips", () => {
  it("should return null if no clips are found", () => {
    const clips = [createClip<"video">({type: "video", duration: 10, title: "", src: "", uuid: "", dimensions: [0,0]})];

    expect(getCurrentClips(clips, 11)).toBeNull();
  });

  it("should return a string of clip UUIDs", () => {
    const clips = [createClip<"video">({type: "video", duration: 10, title: "", src: "", uuid: "", dimensions: [0,0]})];

    expect(getCurrentClips(clips, 5)).toBe(clips[0].uuid);
  });
});

describe("getLastTimelineClip", () => {
  beforeEach(() => {

  });

  it("should return null if no clips are found", () => {
    videoClips.set([]);
    expect(getLastTimelineClip()).toBeNull();
  });

  it("should return the last clip in the timeline", () => {
    videoClips.set([
      createClip<"video">({type: "video", duration: 10, title: "", src: "", uuid: "", dimensions: [0,0]}),
      createClip<"video">({type: "video", duration: 10, title: "", src: "", uuid: "", dimensions: [0,0]}, {offset: 5})
    ]);

    expect(getLastTimelineClip()).toBe(get(videoClips)[1]);
  });
});

describe("getClipDuration", () => {
  it("returns the duration of a clip", () => {
    const clip = createClip<"video">({type: "video", duration: 10, title: "", src: "", uuid: "", dimensions: [0,0]});

    expect(getClipDuration(clip)).toBe(10);
  });

  it("returns the duration of a clip with start and end offsets", () => {
    const clip = createClip<"video">({type: "video", duration: 10, title: "", src: "", uuid: "", dimensions: [0,0]}, {start: 5, end: 4});

    expect(getClipDuration(clip)).toBe(1);
  });

  it("returns 0 when the start offset exceeds the clip duration", () => {
    const clip = createClip<"video">({type: "video", duration: 10, title: "", src: "", uuid: "", dimensions: [0,0]}, {start: 11, end: 12});

    expect(getClipDuration(clip)).toBe(0);
  })

  it("returns 0 when the end offset exceeds the clip duration", () => {
    const clip = createClip<"video">({type: "video", duration: 10, title: "", src: "", uuid: "", dimensions: [0,0]}, {start: 5, end: 12});

    expect(getClipDuration(clip)).toBe(0);
  });

  it("returns 0 when the sum of end offsets exceeds the clip duration", () => {
    const clip = createClip<"video">({type: "video", duration: 10, title: "", src: "", uuid: "", dimensions: [0,0]}, {start: 5, end: 6});

    expect(getClipDuration(clip)).toBe(0);
  });
});

describe("getClipEndPos", () => {
  it("returns the end position of a clip", () => {
    const clip = createClip<"video">({type: "video", duration: 10, title: "", src: "", uuid: "", dimensions: [0,0]});

    expect(getClipEndPos(clip)).toBe(10);
  });

  it("returns the end position of a clip with an offset", () => {
    const clip = createClip<"video">({type: "video", duration: 10, title: "", src: "", uuid: "", dimensions: [0,0]}, {offset: 5});

    expect(getClipEndPos(clip)).toBe(15);
  });

  it("returns the end position of a clip with a start offset", () => {
    const clip = createClip<"video">({type: "video", duration: 10, title: "", src: "", uuid: "", dimensions: [0,0]}, {start: 5});

    expect(getClipEndPos(clip)).toBe(5);
  });

  it("returns the end position of a clip with a start and end offset", () => {
    const clip = createClip<"video">({type: "video", duration: 10, title: "", src: "", uuid: "", dimensions: [0,0]}, {start: 5, end: 4});

    expect(getClipEndPos(clip)).toBe(1);
  });

  it("returns the end position of a clip with a time offset and edge offsets", () => {
    const clip = createClip<"video">({type: "video", duration: 10, title: "", src: "", uuid: "", dimensions: [0,0]}, {offset: 5, start: 1, end: 1});

    expect(getClipEndPos(clip)).toBe(13);
  })
});

describe("createClip", () => {
  it("creates an image clip", () => {
    const clip = createClip<"image">({type: "image", duration: 10, title: "", src: "", uuid: "", dimensions: [0,0]});

    expect(clip.type).toBe("image");
  });

  it("creates an video clip", () => {
    const clip = createClip<"video">({type: "video", duration: 10, title: "", src: "", uuid: "", dimensions: [0,0]});

    expect(clip.type).toBe("video");
  });

  it("creates an audio clip", () => {
    const clip = createClip<"audio">({type: "audio", duration: 10, title: "", src: "", uuid: ""});

    expect(clip.type).toBe("audio");
  });
});

describe("createAutomation", () => {
  it("creates a new automation clip", () => {
    const automation = createAutomation("scale", 10);

    expect(automation.type).toBe("scale");
  });
});

describe("lerpAutomation", () => {
  it("returns the first value if the time is before the first automation point", () => {
    const automation = createAutomation("scale", 10);
    automation.curves[0] = [0, 1];
    automation.curves[1] = [10, 2];


    expect(lerpAutomation(automation, 0, -1)).toBe(1);
  });

  it("returns the last value if the time is after the last automation point", () => {
    const automation = createAutomation("scale", 10);
    automation.curves[0] = [0, 1];
    automation.curves[1] = [10, 2];

    expect(lerpAutomation(automation, 0, 11)).toBe(2);
  });

  it("lerps between two automation points", () => {
    const automation = createAutomation("scale", 10);
    automation.curves[0] = [0, 0];
    automation.curves[1] = [10, 1];

    expect(lerpAutomation(automation, 0, 5)).toBe(0.5);
  });
});

