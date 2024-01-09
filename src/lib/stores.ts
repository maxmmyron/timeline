import { createFFmpeg } from "@ffmpeg/ffmpeg";
import { derived, writable, type Writable } from "svelte/store";

export const ffmpeg = writable(createFFmpeg({log:true}));

export const selected: Writable<string | null> = writable("");

export const scale = writable(1);
export const scaleFactor = derived(scale, $scale => 100 * $scale);

export const time = writable(0);

/**
 * Represents the clips in the timeline
 */
export const videoClips: Writable<App.Clip[]> = writable([]);
