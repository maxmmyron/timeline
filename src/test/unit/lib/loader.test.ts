/**
 * @vitest-environemnt jsdom
 */

import { createMediaFromFile, resolveMedia, canMediaPlay, resolveDuration, resolveDimensions } from "$lib/loader";
import { beforeEach, describe, expect, it, test, vi } from "vitest"

describe("createMediaFromFile", () => {
  beforeEach(() => {
    global.URL.createObjectURL = vi.fn();
  });

  it("returns a wrapped promise when given a file", () => {
    const media = createMediaFromFile(new File([], "test.jpg", {type: "image/jpeg"}));

    expect(media).toHaveProperty("uuid");
    expect(media).toHaveProperty("title");
    expect(media).toHaveProperty("media");
    expect(media.media).toBeInstanceOf(Promise);
  });
});

// resolveMedia

describe("resolveMedia", () => {
  beforeEach(() => {
    global.URL.createObjectURL = vi.fn();
  });

  it("rejects if the MIME type is empty", () => {
    const file = new File([], "test.jpg", {type: ""});
    expect(resolveMedia(file, "test")).rejects.toEqual("Unsupported file type.");
  });

  it("rejects if the MIME type is not a known media type", () => {
    const file = new File([], "test.jpg", {type: "application/pdf"});
    expect(resolveMedia(file, "test")).rejects.toEqual("Unsupported file type.");
  });

  it("rejects if the MIME type is not supported by the browser", () => {
    const file = new File([], "test.jpg", {type: "image/svg+xml"});
    expect(resolveMedia(file, "test")).rejects.toEqual("Unsupported file type.");
  });

  it("resolves to a media object with the correct properties", async () => {
    const file = new File([], "test.jpg", {type: "image/jpeg"});
    const media = resolveMedia(file, "0");

    const m = await media;

    expect(m).toEqual({
      uuid: "0",
      src: expect.any(String),
      duration: expect.any(Number),
      title: "test.jpg",
      dimensions: expect.any(Object),
      type: "image"
    });

    expect(media).toBeInstanceOf(Promise);
  });
});

// canMediaPlay (TODO: this may depend on the browser)
describe("canMediaPlay", () => {
  beforeEach(() => {
    global.document.createElement = vi.fn();
  });

  it("returns true for a supported video type", () => {
    const file = new File([], "test.mp4", {type: "video/mp4"});
    expect(canMediaPlay(file)).resolves.toBe(true);

    const file2 = new File([], "test.ogv", {type: "video/ogg"});
    expect(canMediaPlay(file2)).resolves.toBe(true);

    const file3 = new File([], "test.webm", {type: "video/webm"});
    expect(canMediaPlay(file3)).resolves.toBe(true);
  });

  it("returns true for a supported audio type", () => {
    const file = new File([], "test.mp3", {type: "audio/mpeg"});
    expect(canMediaPlay(file)).resolves.toBe(true);

    const file2 = new File([], "test.ogg", {type: "audio/ogg"});
    expect(canMediaPlay(file2)).resolves.toBe(true);

    const file3 = new File([], "test.wav", {type: "audio/wav"});
    expect(canMediaPlay(file3)).resolves.toBe(true);
  });

  it("returns true for a supported image type", () => {
    const file = new File([], "test.jpg", {type: "image/jpeg"});
    expect(canMediaPlay(file)).resolves.toBe(true);

    const file2 = new File([], "test.png", {type: "image/png"});
    expect(canMediaPlay(file2)).resolves.toBe(true);
  });

  it("returns false for an unsupported type", () => {
    const file = new File([], "test.svg", {type: "image/svg+xml"});
    expect(canMediaPlay(file)).resolves.toBe(false);

    const file2 = new File([], "test.pdf", {type: "application/pdf"});
    expect(canMediaPlay(file2)).resolves.toBe(false);

    const file3 = new File([], "test.doc", {type: "application/msword"});
    expect(canMediaPlay(file3)).resolves.toBe(false);
  });
});

// resolveDuration

describe("resolveDuration", () => {
  beforeEach(() => {
    global.document.createElement = vi.fn();
  });

  it("video file has duration", () => {
    const src = "test.mp4";
    const mime = "video";
    expect(resolveDuration(src, mime)).resolves.toBeGreaterThan(0);
  });

  it("audio file has duration", () => {
    const src = "test.mp3";
    const mime = "audio";
    expect(resolveDuration(src, mime)).resolves.toBeGreaterThan(0);
  });

  it("image file does not have duration", () => {
    const src = "test.jpg";
    const mime = "image";
    expect(resolveDuration(src, mime)).resolves.toBe(0);
  });
});
