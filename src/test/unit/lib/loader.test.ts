import { createMediaFromFile, resolveMedia, canMediaPlay, resolveDuration, resolveDimensions } from "$lib/loader";
import { test } from "vitest"

test("returns a wrapped promise when given a file", () => {

});

// resolveMedia

test("unknown MIME type rejects", () => {});

test("video/mp4 resolves to video media", () => {});

test("video/ogg resolves to video media", () => {});

test("video/webm resolves to video media", () => {});

test("other video MIME type rejects", () => {});

test("audio/mpeg resolves to audio media", () => {});

test("audio/ogg resolves to audio media", () => {});

test("audio/wav resolves to audio media", () => {});

test("other audio MIME type rejects", () => {});

test("image/jpeg resolves to image media", () => {});

test("image/png resolves to image media", () => {});

test("other image MIME type rejects", () => {});

// canMediaPlay

// TODO: this may depend on the browser we're mocking?

// resolveDuration

test("video file has duration", () => {});

test("audio file has duration", () => {});

test("image file does not have duration", () => {});