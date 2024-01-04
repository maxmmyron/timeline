import { writable } from "svelte/store";

/**
 * Distance of 1 second in pixels
 */
export const TIME_SCALING = 100;

export const time = writable(0);
