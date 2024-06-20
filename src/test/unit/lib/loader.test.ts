/**
 * @vitest-environemnt jsdom
 */

import { createMediaFromFile, resolveDuration } from "$lib/loader";
import { beforeEach, describe, expect, it, vi } from "vitest"

describe("createMediaFromFile", () => {
  it("returns a wrapped promise when given a file", () => {
    const media = createMediaFromFile(new File([], "test.jpg", {type: "image/jpeg"}));

    expect(media).toHaveProperty("uuid");
    expect(media).toHaveProperty("title");
    expect(media).toHaveProperty("media");
    expect(media.media).toBeInstanceOf(Promise);
  });
});

describe("resolveDuration", () => {
  beforeEach(() => {
    vi.spyOn(window.HTMLVideoElement.prototype, "addEventListener").mockImplementationOnce((event, handler, options) => {
      if (event === "loadedmetadata") {
        // handler type is EventListenerOrEventListenerObject, so we need to narrow down type.
        if (typeof handler === "function") handler(new Event("loadedmetadata"));
        else handler.handleEvent(new Event("loadedmetadata"));
      }
    });

    vi.spyOn(window.HTMLAudioElement.prototype, "addEventListener").mockImplementationOnce((event, handler, options) => {
      if (event === "loadedmetadata") {
        if (typeof handler === "function") handler(new Event("loadedmetadata"));
        else handler.handleEvent(new Event("loadedmetadata"));
      }
    });
  })

  it("rejects if the MIME type is invalid", () => {
    const file = new File([], "test.jpg", {type: "none"});
    expect(resolveDuration("blob:mock", "none")).rejects.toEqual("Invalid MIME type.");
  });

  it("rejects if the MIME type is image/*", () => {
    const file = new File([], "test.jpg", {type: "image/jpeg"});
    expect(resolveDuration("blob:mock", "image")).rejects.toEqual("Invalid MIME type.");
  });

  // FIXME: these are NaN because input file has no content, so it can't determine the duration.
  it("resolves if the MIME type is video/*", () => {
    const file = new File([], "test.mp4", {type: "video/mp4"});
    expect(resolveDuration("blob:mock", "video")).resolves.toBe(NaN);
  });

  it("resolves if the MIME type is audio/*", () => {
    const file = new File([], "test.mp3", {type: "audio/mpeg"});
    expect(resolveDuration("blob:mock", "audio")).resolves.toBe(NaN);
  });
});
