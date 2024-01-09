import { createFFmpeg } from "@ffmpeg/ffmpeg";
import { derived, writable, type Writable } from "svelte/store";

export const ffmpeg = writable(createFFmpeg({log:true}));

export const selected: Writable<string | null> = writable("");

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
export const secondsPerTick = derived(scale, $scale => $scale < 1 ? (1 / $scale) : $scale);

export const time = writable(0);

/**
 * Represents the clips in the timeline
 */
export const videoClips: Writable<App.Clip[]> = writable([]);
