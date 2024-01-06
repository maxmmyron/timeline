import { createFFmpeg } from "@ffmpeg/ffmpeg";
import { writable, type Writable } from "svelte/store";

export const ffmpeg = writable(createFFmpeg({log:true}));

/**
 * Distance of 1 second in pixels
 */
export const TIME_SCALING = 100;

export const time = writable(0);

/**
 * Represents the clips in the timeline
 */
export const videoClips: Writable<App.Clip[]> = writable([]);
