/**
 * Common utility functions.
 */

import { get } from "svelte/store";
import { v4 as uuidv4 } from "uuid";
import { paused, time, videoClips } from "./stores";

/**
 * Gets the current clip at the given time.
 *
 * @param clips The clips to search through. This is parametrized so that we can
 * use reactivity whenever the $videoClips store changes.
 * @param time The current scrubber time. This is parametrized so that we can
 * use reactivity whenever the $time store changes.
 * @returns The UUID of the current clip, or null if there is no current clip.
 */
export const getCurrentClip = (clips: App.Clip[], time: number): string | null => {
    let valid: App.Clip[] = [];
    for (const clip of clips) {
      const clipDuration = clip.media.duration - clip.start - clip.end;
      if (clip.offset < time && clip.offset + clipDuration > time)
        valid.push(clip);
      if (clip.offset > time) break;
    }
    return valid.sort((a, b) => b.z - a.z)[0]?.uuid ?? null;
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
  return clip.media.duration - clip.end - clip.start;
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
export const createClip = (resolved: App.Media, opts?: Partial<App.Clip>): App.Clip => ({
  media: resolved,
  offset: opts?.offset ?? get(time),
  start: opts?.start ?? 0,
  end: opts?.end ?? 0,
  uuid: uuidv4(),
  z: get(videoClips).reduce((acc, clip) => Math.max(acc, clip.z), 0) + 1,
  matrix: opts?.matrix ?? [1, 0, 0, 1, 0, 0],
});
