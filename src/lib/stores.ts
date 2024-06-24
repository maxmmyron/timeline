import { FFmpeg } from "@ffmpeg/ffmpeg";
import { derived, writable, type Writable } from "svelte/store";
import type { createMediaFromFile } from "$lib/loader";

// export const ffmpeg: Writable<FFmpeg> = writable(new FFmpeg());

export const selected: Writable<[string, App.MediaType] | null> = writable(null);

export const scale = writable(1);

/**
 * The scaling factor of the timeline; represented as the number of pixels
 * a second takes up.
 */
export const scaleFactor = derived(scale, $scale => 100 * $scale);

/**
 * The width of a single tick on the timeline.
 * This is clamped to 100px at minimum, if the scaling factor is under 100.
 */
export const tickWidth = derived(scaleFactor, $scaleFactor => $scaleFactor < 100 ? 100 : $scaleFactor);

/**
 * The number of seconds a single tick represents.
 * This is clamped to 1 second at minimum, if the scale is under 1.
 */
export const secondsPerTick = derived(scale, $scale => $scale < 1 ? (1 / $scale) : 1);

export const time = writable(0);

export const videoClips: Writable<(App.VideoClip | App.ImageClip)[]> = writable([]);
export const audioClips: Writable<App.AudioClip[]> = writable([]);

/**
 * The scaling of the video player relative to its native resolution. This is used to scale
 * each video's matrix values.
 */
export const playerScale = writable(1);

/**
 * The resolution of the player as inputted by the user. This is rounded to the
 * nearest even integer.
 */
export const res = writable([1920, 1080]);

/**
 * The resolution of the player, rounded to the nearest even integer. This is
 * safe for use with ffmpeg.
 */
export const safeRes = derived(res, $res => [$res[0] - ($res[0] % 2), $res[1] - ($res[1] % 2)]);

/**
 * The amount the timeline is scrolled horizontally.
 */
export const scroll = writable(0);

/**
 * Whether or not playback is currently paused
 */
export const paused = writable(true);

export const exportPercentage = writable(0);

export const aCtx: Writable<AudioContext | null> = writable(null);

export const iRefs: Writable<Record<string, HTMLImageElement>> = writable({});
export const vRefs: Writable<Record<string, HTMLVideoElement>> = writable({});
export const aRefs: Writable<Record<string, HTMLAudioElement>> = writable({});

export const pointerMode: Writable<"select" | "slice"> = writable("select");

/**
 * Media that has been uploaded and fully resolved
 */
export const uploaded: Writable<Array<ReturnType<typeof createMediaFromFile>>> = writable([]);

export const volumeMultiplier = writable(1);

export const selectedNodeUUID: Writable<string|null> = writable(null);