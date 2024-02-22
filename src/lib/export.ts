import { get } from "svelte/store";
import { ffmpeg, safeRes, videoClips, audioClips, exportStatus, exportPercentage } from "./stores";
import { fetchFile } from "@ffmpeg/ffmpeg";

export const exportVideo = async () => {
  exportStatus.set("setup");
  exportPercentage.set(0);

  const ffmpegInstance =  get(ffmpeg);

  let vClips = get(videoClips).toSorted((a, b) => a.z - b.z);
  let clips = [...vClips, ...get(audioClips)];

  if (!ffmpegInstance.isLoaded()) {
    exportStatus.set("error");
    throw new Error("ffmpeg.wasm did not load on editor startup. Please refresh the page.");
  }

  let vFilter = "";
  let aFilter = "";

  // ----------------------------
  //
  // STEP 1: LOAD MEDIA FILES
  //
  // ----------------------------

  let loadedMedia: Array<string> = [];

  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i];
    const media = clip.media;

    let type: string;
    if (media.type === "audio") type = "mp3";
    else if (media.type === "video") type = "mp4";
    else type = media.title.split('.').pop() as string;

    const src = `${media.uuid}.${type}`;

    if(!loadedMedia.includes(src)) {
      ffmpegInstance.FS("writeFile", src, await fetchFile(media.src));
      loadedMedia.push(src);

      // there may be multiple instances of the same media file in the timeline,
      // so we split a given file into multiple inputs.
      if (media.type !== "image") aFilter += `[${i+1}:a]asplit=`;
      if (media.type !== "audio") vFilter += `[${i+1}:v]split=`;

      // splitCount tracks the number of clips in the timeline that use this
      // media file.
      let splitCount = 0;
      let v_outs = [];
      let a_outs = [];

      // iterate through each clip, and compare its media UUID to the current
      // media UUID.
      for (let j = i; j < clips.length; j++) {
        const clip = clips[j];
        // if they match, we need to add this clip to the split filter.
        if (clip.media.uuid === media.uuid) {
          splitCount++;
          if (media.type !== "image") a_outs.push(`a_split${j+1}`);
          if (media.type !== "audio") v_outs.push(`v_split${j+1}`);
        }
      }

      // join together the split filters
      if (media.type !== "image") aFilter += `${splitCount}[${a_outs.join("][")}];`;
      // NOTE: here we scale the video to a large enough size to mitigate automation scaling
      // artifacts.
      if (media.type !== "audio") vFilter += `${splitCount},scale=${get(safeRes)[0]*4}:-1[${v_outs.join("][")}];`;
    }
  }

  ffmpegInstance.FS("writeFile", "base.mp4", "");
  ffmpegInstance.FS("writeFile", "export.mp4", "");

  const duration = Math.max(...clips.map((clip) => clip.offset + (clip.media.duration - clip.end - clip.start)));
  if(duration <= 0) {
    exportStatus.set("error");
    throw new Error("Error exporting video: Timeline is empty, or all clips have a duration of 0.");
  }

  // ----------------------------
  //
  // STEP 2: CREATE BASE VIDEO
  //
  // ----------------------------

  const dims = get(safeRes);
  await ffmpegInstance.run("-t", duration.toString(), "-f", "lavfi", "-i", `color=c=black:s=${dims[0]}x${dims[1]}:r=30`, "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100", "-pix_fmt", "yuv420p", "-crf", "28", "-shortest", "-tune", "stillimage", "-preset", "ultrafast", "base.mp4");

  // ----------------------------
  //
  // STEP 3: TRIM, SCALE, AND ADD BASE FILTERS
  //
  // ----------------------------

  for (let i = 1; i <= clips.length; i++) {
    const clip = clips[i - 1];

    let scale: string = "";

    // -----------------------
    // AUDIO TRIM/PROCESSING
    if(clip.media.type === "audio" || clip.media.type === "video") {
      const delay = Math.max(0, (clip.offset * 1000)).toFixed(0);
      aFilter += `[a_split${i}]atrim=${clip.start}:${clip.media.duration - clip.end},adelay=${delay}|${delay},`;

      let vol = "";
      if (clip.volume.curves.length === 0) {
        vol = `volume=${clip.volume.staticVal},`;
      } else {
        for (let j = 0; j < clip.volume.curves.length - 1; j++) {
          const {strings, from, to} = buildLerpFilter([[...clip.volume.curves[j], ...clip.volume.curves[j+1]]], clip.volume.duration, clip.volume.offset + clip.offset);
          vol += `volume=enable='between(t,${from},${to})':volume=${strings[0]},eval:frame,`;
        }
      }

      const pan = [clip.pan < 0 ? 1 : 1 - clip.pan, clip.pan > 0 ? 1 : 1 + clip.pan];
      aFilter += `pan=stereo|c0=${pan[0]}*c0|c1=${pan[1]}*c1[${i}a];`;

      // if this is an audio clip, we don't need to do any extra processing,
      // so we can just skip to the next clip
      if (clip.media.type === "audio") continue;
    }

    // -----------------------
    // VIDEO TRIM/PROCESSING
    if (clip.media.type === "image" || clip.media.type === "video") {
      const dims = clip.media.dimensions;
      // if there are no extra nodes on any matrix automation curve, then we can
      // just handle the edge case
      if (clip.matrix[0].curves.length === 0 && clip.matrix[3].curves.length === 0) {
        scale = `(${dims[0]}*${clip.matrix[0].staticVal}):(${dims[1]}*${clip.matrix[3].staticVal})`;

        // if this is an image, we don't need to do any extra processing,
        // so we can just skip to the next clip
        if (clip.media.type === "image") {
          vFilter += `[v_split${i}]scale=${scale}[${i}v];`;
          continue;
        }
      } else {
        const [equalizedAutomation, uniqueNodeTimes] = equalizeAutomation(["sx", "sy"], [clip.matrix[0], clip.matrix[3]]);

        // ffmpeg's scale component does not support the enable
        // filter, so we need to use a series of ffmpeg `if` statements to
        // interpolate between the nodes of each curve. to achieve this, we'll
        // actually work from the end of the clip to the start, so that we can
        // easily nest the `if` statements.

        let xClause = "";
        let yClause = "";

        for (let j = 0; j < uniqueNodeTimes.length+1; j++) {
          xClause += `if(`;
          yClause += `if(`;

          const {strings, from, to} = buildLerpFilter([
            [...equalizedAutomation.get("sx")!.curves[j], ...equalizedAutomation.get("sx")!.curves[j+1]],
            [...equalizedAutomation.get("sy")!.curves[j], ...equalizedAutomation.get("sy")!.curves[j+1]],
          ], equalizedAutomation.get("sx")!.duration, equalizedAutomation.get("sx")!.offset + clip.offset);

          const [sxLerpString, syLerpString] = strings;

          if(j === 0 || j === uniqueNodeTimes.length) {
            xClause += `lte(t,${to}),(${sxLerpString})*${dims[0]}${j === 0 ? "," : ""}`;
            yClause += `lte(t,${to}),(${syLerpString})*${dims[1]}${j === 0 ? "," : ""}`;
          } else {
            xClause += `between(t,${from},${to}),(${sxLerpString})*${dims[0]},`;
            yClause += `between(t,${from},${to}),(${syLerpString})*${dims[1]},`;
          }
        }

        for (let j = 0; j < uniqueNodeTimes.length + 1; j++) {
          xClause += ")";
          yClause += ")";
        }

        scale = `w='${xClause}':h='${yClause}':eval=frame`;
      }
    }

    const setpts = `PTS-STARTPTS+${clip.offset}/TB`;

    /**
     * trim=start:end: trim the video so it doesn't go past clip.end (otherwise,
     * it video will keep playing as if video was still playing, despite it not
     * being visible/audible)
     *
     * setpts=PTS-STARTPTS+delay: The portion of the ffmpeg video filter that
     * determines when in the final video this input starts. We reset the
     * presentation timestamp to 0, and then add the clip's offset to it to
     * resync video presentation timestamp.
     *
     * scale=width:height: scale the video to the clip's dimensions. we do this
     * here since there is only one input link.
     */
    vFilter += `[v_split${i}]trim=${clip.start}:${clip.media.duration - clip.end},setpts=${setpts},scale=${scale}[${i}v];`
  }

  // -----------------------
  // VIDEO FILTER COMPONENT

  // if there are no video clips, we need to add a null filter to the video
  // filter chain
  if (vClips.length === 0) vFilter += `[0:v]null[vout];`;

  for (let i = 0; i < vClips.length; i++) {
    // define inLink. If this is the first video, use [0:v], otherwise use [vbase${i}]
    const inLink = i === 0 ? `[0:v]` : `[vbase${i}]`;
    // define outLink. If this is the last video, use [vout], otherwise use [vbase${i+1}]
    const outLink = i === vClips.length - 1 ? `[vout]` : `[vbase${i + 1}]`;
    // NOTE: if there's a single clip, the above logic will result in [v:0] -> [vout] (which is correct)

    const clip = vClips[i];

    vFilter += `${inLink}[${i + 1}v]`;

    // -----------------------
    // add matrix transforms

    if (clip.matrix[0].curves.length === 0 && clip.matrix[3].curves.length === 0 && clip.matrix[4].curves.length === 0 && clip.matrix[5].curves.length === 0) {
      const originOffsetX = ((clip.matrix[0].staticVal - 1) * clip.media.dimensions[0] / 2) * (2 * clip.origin[0] - 1);
      const originOffsetY = ((clip.matrix[3].staticVal - 1) * clip.media.dimensions[1] / 2) * (2 * clip.origin[1] - 1);

      /**
       * The portion of the ffmpeg filter that defines the position of the clip.
       * (W-w)/2 and (H-h)/2 are used to center the video; we then offset by two
       * values:
       * 1. the x and y values of the clip's transformation matrix
       * 2. the offset of the clip based on the transform origin and scaling
       */
      const overlayPos  = `(W-w)/2+${clip.matrix[4].staticVal - originOffsetX}:(H-h)/2+${clip.matrix[5].staticVal - originOffsetY}`;

      /**
       * The portion of the ffmpeg filter that defines the period over which the
       * clip is enabled. This starts at clip.offset, and lasts until the the end
       * of the clip (in absolute positioning: offset + calculated duration).
       */
      const enabledPeriod = `enable='between(t,${clip.offset},${clip.offset + (clip.media.duration - clip.end - clip.start)})'`;

      vFilter += `overlay=${overlayPos}:${enabledPeriod}`
    } else {
      const [equalizedAutomation, uniqueNodeTimes] = equalizeAutomation(["sx", "sy", "tx", "ty"], [clip.matrix[0], clip.matrix[3], clip.matrix[4], clip.matrix[5]]);

      // after adding nodes, we can now build out the filtergraph for this clip by
      // interpolating between the nodes of each curve.
      //
      // we go through each time in nodeTimes, and add a filter for each matrix
      // value at that time. Note that because nodeTimes *doesn't* include the
      // first and last points, we iterate from 0 - nodeTimes.length + 1.

      for (let j = 0; j < uniqueNodeTimes.length + 1; j++) {
        const {strings, from, to} = buildLerpFilter([
          [...equalizedAutomation.get("sx")!.curves[j], ...equalizedAutomation.get("sx")!.curves[j+1]],
          [...equalizedAutomation.get("sy")!.curves[j], ...equalizedAutomation.get("sy")!.curves[j+1]],
          [...equalizedAutomation.get("tx")!.curves[j], ...equalizedAutomation.get("tx")!.curves[j+1]],
          [...equalizedAutomation.get("ty")!.curves[j], ...equalizedAutomation.get("ty")!.curves[j+1]],
        ], equalizedAutomation.get("sx")!.duration, equalizedAutomation.get("sx")!.offset + clip.offset);

        const [sxLerpString, syLerpString, txLerpString, tyLerpString] = strings;

        // build out the scaling and translation strings
        const originOffsetXString = `(((${sxLerpString}-1)*${clip.media.dimensions[0]}/2)*(2*${clip.origin[0]}-1))`;
        const originOffsetYString = `(((${syLerpString}-1)*${clip.media.dimensions[1]}/2)*(2*${clip.origin[1]}-1))`;

        vFilter += `overlay=enable='between(t,${from},${to})':x='(W-w)/2+(${txLerpString})-(${originOffsetXString})':y='(H-h)/2+(${tyLerpString})-(${originOffsetYString})':eval=frame`;
        if (j !== uniqueNodeTimes.length) vFilter += `,`;
      }
    }

    // -----------------------
    // add EQ filters

    if (clip.eq.every((eq) => eq.curves.length === 0)) {
      // if static values match default, we can skip adding the eq filter
      if (clip.eq.map((eq) => eq.staticVal).join(",") === "1,0,1,1") {
        vFilter += `${outLink};`;
        continue;
      }

      // no curves, but static values don't match default, so we need to add
      // eq filter
      vFilter += `,eq=contrast=${clip.eq[0].staticVal}:brightness=${clip.eq[1].staticVal}:saturation=${clip.eq[2].staticVal}:gamma=${clip.eq[3].staticVal}`;
    } else {
      const [equalizedEQAutomation, uniqueEQNodeTimes] = equalizeAutomation(["contrast", "brightness", "saturation", "gamma"], clip.eq);

      for (let j = 0; j < uniqueEQNodeTimes.length + 1; j++) {
        const {strings, from, to} = buildLerpFilter([
          [...equalizedEQAutomation.get("contrast")!.curves[j], ...equalizedEQAutomation.get("contrast")!.curves[j+1]],
          [...equalizedEQAutomation.get("brightness")!.curves[j], ...equalizedEQAutomation.get("brightness")!.curves[j+1]],
          [...equalizedEQAutomation.get("saturation")!.curves[j], ...equalizedEQAutomation.get("saturation")!.curves[j+1]],
          [...equalizedEQAutomation.get("gamma")!.curves[j], ...equalizedEQAutomation.get("gamma")!.curves[j+1]],
        ], equalizedEQAutomation.get("contrast")!.duration, equalizedEQAutomation.get("contrast")!.offset + clip.offset);

        const [contrastLerpString, brightnessLerpString, saturationLerpString, gammaLerpString] = strings;

        vFilter += `,eq=enable='between(t,${from},${to})':contrast=${contrastLerpString}:brightness=${brightnessLerpString}:saturation=${saturationLerpString}:gamma=${gammaLerpString}:eval=frame`;
        if (j !== uniqueEQNodeTimes.length) vFilter += `,`;
      }
    }

    vFilter += `${outLink};`;
  }

  // -----------------------
  // AUDIO FILTER COMPONENT

  // filter out images and map the audio clips to their respective inputs
  const aInputs = clips.filter((input) => input.media.type !== "image").map((_, i) => `[${i+1}a]`);

  // this is the last filter in the filtergraph, so we do not need to add a
  // trailing semicolon.
  aFilter += `[0:a]${aInputs.join('')}amix=inputs=${aInputs.length+1}:duration=first[aout]`;

  // -----------------------
  // RUN FFMPEG

  try {
    ffmpegInstance.setProgress(({ratio}) => exportPercentage.set(ratio));
    exportStatus.set("export");
    console.log(["-i", "base.mp4", ...[...loadedMedia.map((src) =>  ["-i", src])].flat(), "-filter_complex", `${vFilter}${aFilter}`, "-map", "[vout]", "-map", "[aout]", "export.mp4"].join(" "));
    await ffmpegInstance.run("-i", "base.mp4", ...[...loadedMedia.map((src) =>  ["-i", src])].flat(), "-filter_complex", `${vFilter}${aFilter}`, "-map", "[vout]", "-map", "[aout]", "-vcodec", "libx264", "-crf", "28", "export.mp4");
  } catch(e) {
    exportStatus.set("error");
    throw e;
  }

  // -----------------------
  // EXPORT VIDEO FILE

  const exportData = ffmpegInstance.FS("readFile", "export.mp4");

  exportStatus.set("done");

  const link = document.createElement("a");
  link.download = "export.mp4";
  link.href = URL.createObjectURL(new Blob([exportData.buffer], { type: "video/mp4" }));
  document.body.appendChild(link);
  link.dispatchEvent(new MouseEvent("click"));
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(link.href), 7000);

  console.log(["-i", "base.mp4", ...[...loadedMedia.map((src) =>  ["-i", src])].flat(), "-filter_complex", `${vFilter}${aFilter}`, "-map", "[vout]", "-map", "[aout]", "export.mp4"].join(" "));
};

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
const buildLerpString = (fromX: number, fromY: number, toX: number, toY: number, duration: number, offset: number) => {
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
const equalizeAutomation = (keys: string[], automation: App.Automation[]): [Map<string, App.Automation>, number[]] => {
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
 * Builds out a lerp string for a given automation curve and filter.
 *
 * @param args the arguments for all lerp strings. [fromX, fromY, toX, toY][]
 * @param duration The total duration of the automation clip
 * @param offset The offset of the automation clip.
 * @param defaultScalars The default scalars to use when calculating the from/to
 * values. Defaults to first and third X values in the first arg array.
 */
const buildLerpFilter = (args: [number, number, number, number][], duration: number, offset: number, defaultScalars: [[number, number], [number, number]] = [[0, 0], [0, 2]]): {
  strings: string[],
  from: number,
  to: number
}=> ({
  strings: args.map((arg) => buildLerpString(...arg, duration, offset)),
  from: args[defaultScalars[0][0]][defaultScalars[0][1]] * duration + offset,
  to: args[defaultScalars[1][0]][defaultScalars[1][1]] * duration + offset,
});

const trimVideo = (clip: App.Clip, duration: number) => {};
