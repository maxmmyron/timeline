import { ffmpeg } from "$lib/stores";
import { fetchFile } from "@ffmpeg/ffmpeg";
import { get } from "svelte/store";

/**
 * Returns a string that can be used in an ffmpeg filtergraph to lerp between
 * two values.
 *
 * @param fromX The start time of the first keyframe, from 0 to 1
 * @param fromY The start value of the first keyframe
 * @param toX The end time of the second keyframe, from 0 to 1
 * @param toY The end value of the second keyframe
 * @param duration The duration of the clip
 * @param offset The offset of the clip
 */
export const buildLerpString = (fromX: number, fromY: number, toX: number, toY: number, duration: number, offset: number) => {
  const fromXTime = fromX * duration + offset;
  const toXTime = toX * duration + offset;
  return `${fromY}+((${toY}-${fromY})*(t-${fromXTime})/(${toXTime}-${fromXTime}))`;
};


/**
 * Equalizes the automation curves of a matrix by adding and interpolating nodes
 * to each curve, such that all curves have nodes at the same time.
 *
 * @param duration The duration of the clip
 * @param keys the names of each automation to equalize
 * @param automation the automation clips to equalize
 * @returns a map of equalized automation clips, and an array of all unique
 * node times across all automation clips
 */
export const equalizeAutomation = (keys: string[], automation: App.Automation[]): [Map<string, App.Automation>, number[]] => {
  if(keys.length !== automation.length) throw new Error("Error equalizing automation: keys and automation arrays are not the same length.");

  // clone the automation array so we don't modify the original
  automation = structuredClone(automation);

  const map = new Map<string, App.Automation>();

  // if a given matrix value has no automation curves, we create a new one
  // based on the static value of the matrix. this way, we can simply
  // interpolate across the static value, instead of having write a condition
  // for each matrix value at each location it appears in the filter graph.

  for (let i = 0; i < keys.length; i++) {
    map.set(keys[i], automation[i]);
  }

  for (const [_, a] of map) {
    if(a.curves.length === 0) {
      a.curves = [[0, a.staticVal], [1, a.staticVal]];
    }
  }

  // Build out an array containing all unique node times for all automation
  // clips in the matrix. This will be used to add nodes to each clip that do
  // not have nodes at the same time as other clips.

  /**
   * An array of all points along all the matrix's automation curves,
   * excluding the first and last points. This is used to determine the
   */
  const nodeTimes = [...map.values()].reduce((acc: number[], m) => {
    m.curves.forEach((c) => !acc.includes(c[0]) && (c[0] !== 0 && c[0] !== 1) ? acc.push(c[0]) : null);
    return acc;
  }, []).sort((a, b) => a - b);

  // if there are no nodes, we can just return the map and an empty array
  if(nodeTimes.length === 0) return [map, nodeTimes];

  /**
   * go through each automation clip in the matrix, and add curve points to
   * clips that do not have curve points at the same time as other clips. For
   * the Y value, interpolate between the two closest points.
   */
  for (const [_, automation] of map) {
    for(const time of nodeTimes) {
      if(automation.curves.some((c) => c[0] === time)) continue;

      const leftIdx = automation.curves.findIndex((c, i) => c[0] < time && automation.curves[i + 1] && automation.curves[i + 1][0] > time);
      const [left, right] = [automation.curves[leftIdx], automation.curves[leftIdx + 1]];

      automation.curves = automation.curves.toSpliced(leftIdx + 1, 0, [time, left[1] + ((right[1] - left[1]) * (time - left[0])) / (right[0] - left[0])]);
    }
  }

  return [map, nodeTimes];
}

/**
 * Pre-renders a clip to a blob URL, which is then stored in the clip's `prerenderSrc` property and returned.
 * @param clip
 */
export const prerenderClip = async (clip: App.Clip): Promise<string> => {
  return "";
};

/**
 * Renders the clip's duration; returns a new pre-rendered source as a Blob URL.
 * @param clip
 * @param usePrerender - Whether or not to use the clip's prerender source, if it has one.
 *
 * @throws {Error} - If the usePrerender flag is set, but the clip has no prerender source.
 */
export const renderDuration = async (clip: App.Clip, usePrerender: boolean): Promise<string> => {
  if(usePrerender && !clip.prerenderSrc) {
    throw new Error("Error prerendering clip: usePrerender flag is set, however the clip has no prerender source.");
  }

  const ffmpegInstance = get(ffmpeg);

  let source = usePrerender ? clip.prerenderSrc : clip.media.src;

  ffmpegInstance.FS("writeFile", "input.mp4", await fetchFile(source));
  ffmpegInstance.FS("writeFile", "output.mp4", "");

  return "";
};

/**
 * Renders the clip's audio EQ; returns a new pre-rendered source as a Blob URL.
 * @param clip
 * @param usePrerender - Whether or not to use the clip's prerender source, if it has one.
 *
 * @throws {Error} - If the usePrerender flag is set, but the clip has no prerender source.
 */
export const renderAudioEQ = async (clip: App.Clip, usePrerender: boolean): Promise<string> => {
  if(usePrerender && !clip.prerenderSrc) {
    throw new Error("Error prerendering clip: usePrerender flag is set, however the clip has no prerender source.");
  }

  const ffmpegInstance = get(ffmpeg);

  let source = usePrerender ? clip.prerenderSrc : clip.media.src;

  ffmpegInstance.FS("writeFile", "input.mp4", await fetchFile(source));
  ffmpegInstance.FS("writeFile", "output.mp4", "");

  return "";
};

/**
 * Renders the clip's volume EQ; returns a new pre-rendered source as a Blob URL.
 * @param clip
 * @param usePrerender - Whether or not to use the clip's prerender source, if it has one.
 *
 * @throws {Error} - If the usePrerender flag is set, but the clip has no prerender source.
 */
export const renderVideoEQ = async (clip: App.Clip, usePrerender: boolean): Promise<string> => {
  if(usePrerender && !clip.prerenderSrc) {
    throw new Error("Error prerendering clip: usePrerender flag is set, however the clip has no prerender source.");
  }

  const ffmpegInstance = get(ffmpeg);

  let source = usePrerender ? clip.prerenderSrc : clip.media.src;

  ffmpegInstance.FS("writeFile", "input.mp4", await fetchFile(source));
  ffmpegInstance.FS("writeFile", "output.mp4", "");

  return "";
};
