import { vi } from "vitest";

// mock global.Image, since JSDOM doesn't support it
global.Image = window.Image;

// mock the HTMLMediaElement.prototype.load method, since JSDOM doesn't support loading media elements by default
window.HTMLVideoElement.prototype.load = vi.fn(() => {});
window.HTMLAudioElement.prototype.load = vi.fn(() => {});

global.URL.createObjectURL = vi.fn((file: File) => `blob:mock`);
