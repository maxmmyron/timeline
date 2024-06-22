/**
 * Common utility functions.
 */

import { get } from "svelte/store";
import { v4 as uuidv4 } from "uuid";
import { paused, res, scaleFactor, scroll, time, videoClips } from "./stores";

/**
 * Gets the current clips at the given time. This returns a comma-
 * separated list of UUIDs, because svelte's reactivity system doesn't work
 * the same way with arrays as it does with primitive strings.
 *
 *
 * @param clips The clips to search through. This is parametrized so that we can
 * use reactivity whenever the passed store changes.
 * @param time The current scrubber time. This is parametrized so that we can
 * use reactivity whenever the $time store changes.
 * @returns The UUIDs of the current clips, or null if there are no current
 * clips.
 */
export const getCurrentClips = (clips: App.Clip[], time:number): string | null => {
  let valid: App.Clip[] = [];
  for (const clip of clips) {
    const clipDuration = clip.media.duration - clip.start - clip.end;
    if (clip.offset < time && clip.offset + clipDuration > time)
      valid.push(clip);
  }
  if (valid.length === 0) return null;
  return valid.map(clip => clip.uuid).join(",");
};

/**
 * Gets the last clip in the timeline.
 * @param clips
 * @returns
 */
export const getLastTimelineClip = (): App.Clip | null => {
  const clips = get(videoClips);
  if (clips.length === 0) return null;
  return clips.reduce((prev, curr) => {
    if (getClipEndPos(curr) > getClipEndPos(prev)) return curr;
    return prev;
  });
};

export const getClipDuration = (clip: App.Clip): number => {
  return Math.max(clip.media.duration - clip.end - clip.start, 0);
}

export const getClipEndPos = (clip: App.Clip): number => {
  return clip.offset + getClipDuration(clip);
}

let lastTimestamp = 0;

/**
 * Updates the current time of the timeline when playback is unpaused.
 */
export const frame = (timestamp: DOMHighResTimeStamp) => {
  if (get(paused)) {
    lastTimestamp = timestamp;
    requestAnimationFrame(frame);
    return;
  }

  const delta = timestamp - lastTimestamp;
  lastTimestamp = timestamp;

  time.update(t => t + delta / 1000);

  requestAnimationFrame(frame);
};


/**
 * Creates a new clip object from a resolved media object.
 *
 * @param resolved A resolved media object
 * @param opts Optional defaults for the new clip.
 * @returns A new clip object
 */
export const createClip = (resolved: App.Media, opts?: Partial<App.Clip>): App.Clip => {
  let base = {
    type: resolved.type,
    media: resolved,
    offset: opts?.offset ?? get(time),
    start: opts?.start ?? 0,
    end: opts?.end ?? 0,
    uuid: uuidv4(),
    timelineZ: get(videoClips).reduce((acc, clip) => Math.max(acc, clip.timelineZ), 0) + 1,
  } as App.Clip;

  if (resolved.type === "video" || resolved.type === "image") {
    base = {
      ...base,
      matrix: [
        createAutomation("scale", (<App.ImageMedia | App.VideoMedia>resolved).dimensions[0]),
        0, 0,
        createAutomation("scale", (<App.ImageMedia | App.VideoMedia>resolved).dimensions[1]),
        createAutomation("position", resolved.duration, {initial: 0}),
        createAutomation("position", resolved.duration, {initial: 0})
      ]} as App.VideoClip | App.ImageClip;
  } else if (resolved.type === "audio") {
    base = {...base, volume: createAutomation("volume", resolved.duration), pan: 0,} as App.AudioClip;
  }

  return base;
};

/**
 * cyrb53 (c) 2018 bryc (github.com/bryc)
 *
 * License: Public Domain
 *
 * "A fast and simple 53-bit string hash function with decent collision
 * resistance. Largely inspired by MurmurHash2/3, but with a focus on
 * speed/simplicity."
 */
export const cyrb53 = (str: string, seed = 0) => {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for(let i = 0, ch; i < str.length; i++) {
      ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1  = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2  = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
};

/**
 * Moves the scrubber to the specified time, and updates the scroll position
 * if necessary.
 */
export const updateScrubberAndScroll = (t:  number) => {
  time.set(t);

  const tlScroll = get(scroll);
  if(get(time) * get(scaleFactor) < tlScroll || get(time) * get(scaleFactor) > tlScroll + window.innerWidth) {
    scroll.set(Math.max(0, t * get(scaleFactor) - window.innerWidth / 2));
  }
};

export const createAutomation = <T = App.AutomationType>(type: T, duration: number, opts?: {
  initial?: number,
  bounds?: [number, number] | null,
}): App.Automation<T> => ({
  uuid: uuidv4(),
  type: type,
  anchor: "start",
  offset: 0,
  duration,
  curves: [],
  staticVal: opts?.initial ?? 1,
  valueBounds: opts?.bounds ?? null,
});

export const lerpAutomation = <T = App.AutomationType>(a: App.Automation<T>, offset: number, time: number): number => {
  if (a.curves.length === 0) return a.staticVal;

  const t = time - offset;

  const startIdx = a.curves.findIndex((c,i) => {
    let end = a.curves[i + 1] ? a.curves[i+1][0] : a.duration;
    if (c[0] <= t && end >= t) return true;
    return false;
  });

  if (startIdx === -1) {
    if (t < a.curves[0][0]) return a.curves[0][1];
    if (t > a.curves[a.curves.length - 1][0]) return a.curves[a.curves.length - 1][1];
  }

  const startNode = a.curves[startIdx];
  const endNode = a.curves[startIdx + 1];

  return (startNode[1] * (endNode[0] - startNode[0])) + (endNode[1] * (t - startNode[0])) / (endNode[0] - startNode[0]);
};
