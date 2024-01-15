/**
 * Common utility functions.
 */

import { get } from "svelte/store";
import { videoClips } from "./stores";

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
