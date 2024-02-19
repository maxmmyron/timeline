import { get } from "svelte/store";
import { ffmpeg, safeRes, videoClips, audioClips, exportStatus, exportPercentage } from "$lib/stores";
import { fetchFile } from "@ffmpeg/ffmpeg";
import { buildLerpString, equalizeAutomation } from "./util";

export const exportVideo = async () => {
  exportStatus.set("setup");
  exportPercentage.set(0);

  const ffmpegInstance =  get(ffmpeg);
  let vClips = get(videoClips);

  // sort vClips by z index, lowest to highest. we do this so we properly layer
  // the videos.
  vClips = vClips.sort((a, b) => a.z - b.z);

  let clips = [...vClips, ...get(audioClips)];

  if (!ffmpegInstance.isLoaded()) {
    exportStatus.set("error");
    throw new Error("ffmpeg.wasm did not load on editor startup. Please refresh the page.");
  }

  let vFilter = "";
  let aFilter = "";

  let loadedMedia: Array<string> = [];

  // -----------------------
  // LOAD AND SPLIT MEDIA
  /**
   * Tracks the index of the input file with respect to the ffmpeg command.
   * "base.mp4" is always first, so this starts at 1.
   */
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
      if (media.type !== "audio") vFilter += `${splitCount},scale=${get(safeRes)[0]*2}:-1[${v_outs.join("][")}];`;
    }
  }

  ffmpegInstance.FS("writeFile", "base.mp4", "");
  ffmpegInstance.FS("writeFile", "export.mp4", "");

  const duration = Math.max(...clips.map((clip) => clip.offset + (clip.media.duration - clip.end - clip.start)));
  if(duration < 0) {
    exportStatus.set("error");
    throw new Error("Export duration is negative.");
  }

  // create black video with empty audio track for duration of video
  const dims = get(safeRes);
  await ffmpegInstance.run("-t", duration.toString(), "-f", "lavfi", "-i", `color=c=black:s=${dims[0]}x${dims[1]}:r=30`, "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100", "-pix_fmt", "yuv420p", "-crf", "28", "-shortest", "-tune", "stillimage", "-preset", "ultrafast", "base.mp4");

  // -----------------------
  // TRIM AND DELAY COMPONENTS
  for (let i = 1; i <= clips.length; i++) {
    const clip = clips[i - 1];

    const start = clip.start;
    const end = (clip.media.duration - clip.end);

    /**
     * The portion of the ffmpeg audio filter that scales the video's clip.
     */
    let scale: string = "";

    // perform audio processing if the clip contains audio (i.e. it's not an image)
    if(clip.media.type === "audio" || clip.media.type === "video") {
      // define delay, since we need it twice
      const d = Math.max(0, (clip.offset * 1000)).toFixed(0);

      aFilter += `[a_split${i}]atrim=${start}:${end},adelay=${d}|${d},`;

      // create a series of volume filters for each point in the automation curve
      if (clip.volume.curves.length === 0) {
        aFilter += `volume=${clip.volume.staticVal},`;
      } else {
        for (let j = 0; j < clip.volume.curves.length - 1; j++) {
          const [fromX, fromY] = clip.volume.curves[j];
          const [toX, toY] = clip.volume.curves[j + 1];

          /**
           * The combined offset of the clip, and the automation clip. the enable
           * period is absolutely positioned w.r.t. the export's start
           */
          const offset = clip.volume.offset + clip.offset;

          const fromXTime = fromX * clip.volume.duration + clip.volume.offset;
          const toXTime = toX * clip.volume.duration + clip.volume.offset;

          const volumeLerpString = buildLerpString(fromX, fromY, toX, toY, clip.volume.duration, offset);

          /**
           * Add a volume filter for the current curve segment. This
           * 1. enables the volume filter between the start and end of the curve
           * 2. defines a function for the volume that is linearly interpolated
           *    between the start and end of the curve
           * 3. evaluates the volume at each frame (i.e. each point in the curve)
           *    so that the volume changes smoothly over time
           */
          aFilter += `volume=enable='between(t,${fromXTime},${toXTime})':volume=${volumeLerpString},eval:frame,`;
        }
      }

      const pan = [clip.pan < 0 ? 1 : 1 - clip.pan, clip.pan > 0 ? 1 : 1 + clip.pan];
      aFilter+=`pan=stereo|c0=${pan[0]}*c0|c1=${pan[1]}*c1[${i}a];`;

      // if this is an audio clip, we don't need to do any extra processing,
      // so we can just skip to the next clip
      if (clip.media.type === "audio") continue;
    }

    // if we're *not* dealing with an audio clip, we need to build out the scale
    // filter for the clip, which may be composed of two separate automation
    // clips (one for scale X, one for scale Y).
    if (clip.media.type === "image" || clip.media.type === "video") {
      const dims = clip.media.dimensions;
      // if there are no extra nodes on any matrix automation curve, then we can
      // just handle the edge case
      if (clip.matrix[0].curves.length === 0 && clip.matrix[3].curves.length === 0) {
        scale = `(${dims[0]}*${clip.matrix[0].staticVal}):(${dims[0]}*${clip.matrix[3].staticVal})`;

        // if this is an image, we don't need to do any extra processing,
        // so we can just skip to the next clip
        if (clip.media.type === "image") {
          vFilter += `[v_split${i}]scale=${scale}[${i}v];`;
          continue;
        }
      } else {
        const [equalizedAutomation, uniqueNodeTimes] = equalizeAutomation(["sx", "sy"], [clip.matrix[0], clip.matrix[3]]);

        // after adding nodes, we can now build out the filtergraph for this
        // clip's scale component by interpolating between the nodes of each
        // curve.
        //
        // unfortunately, ffmpeg's scale component does not support the enable
        // filter, so we need to use a series of ffmpeg `if` statements to
        // interpolate between the nodes of each curve. to achieve this, we'll
        // actually work from the end of the clip to the start, so that we can
        // easily nest the `if` statements.

        let xClause = "";
        let yClause = "";

        for (let j = 0; j < uniqueNodeTimes.length+1; j++) {
          // add a new `if` statement for each matrix value
          xClause += `if(`;
          yClause += `if(`;

          const [fromSxScalar, fromSxVal, toSxScalar, toSxVal] = [...equalizedAutomation.get("sx")!.curves[j], ...equalizedAutomation.get("sx")!.curves[j+1]];
          const [fromSyScalar, fromSyVal, toSyScalar, toSyVal] = [...equalizedAutomation.get("sy")!.curves[j], ...equalizedAutomation.get("sy")!.curves[j+1]];

          /**
           * The combined offset of the clip, and the automation clip. the enable
           * period is absolutely positioned w.r.t. the export's start
           */
          const offset = equalizedAutomation.get("sx")!.offset + clip.offset;
          const duration = equalizedAutomation.get("sx")!.duration;

          const fromTime = fromSxScalar * duration + offset;
          const toTime = toSxScalar * duration + offset;


          // generate ffmpeg lerp strings for each matrix value
          const sxLerpString = buildLerpString(fromSxScalar, fromSxVal, toSxScalar, toSxVal, duration, offset);
          const syLerpString = buildLerpString(fromSyScalar, fromSyVal, toSyScalar, toSyVal, duration, offset);

          switch (j) {
            case uniqueNodeTimes.length:
              xClause += `lte(t,${toTime}),(${sxLerpString})*${dims[0]}`;
              yClause += `lte(t,${toTime}),(${syLerpString})*${dims[1]}`;
              break;
            case 0:
              xClause += `lte(t,${fromTime}),(${sxLerpString})*${dims[0]},`;
              yClause += `lte(t,${fromTime}),(${syLerpString})*${dims[1]},`;
              break;
            default:
              xClause += `between(t,${fromTime},${toTime}),(${sxLerpString})*${dims[0]},`;
              yClause += `between(t,${fromTime},${toTime}),(${syLerpString})*${dims[1]},`;
              break;
          }
        }

        // close the `if` statements
        for (let j = 0; j < uniqueNodeTimes.length + 1; j++) {
          xClause += ")";
          yClause += ")";
        }

        scale = `w='${xClause}':h='${yClause}':eval=frame`;
      }
    }


    /**
     * The portion of the ffmpeg video filter that determines when in the final
     * video this input starts. We reset the presentation timestamp to 0, and
     * then add the clip's offset to it.
     */
    const setpts = `PTS-STARTPTS+${clip.offset}/TB`;

    /**
     * trim=start:end: trim the video so it doesn't go past clip.end (otherwise,
     * it video will keep playing as if video was still playing, despite it not
     * being visible/audible)
     *
     * setpts=PTS-STARTPTS+delay: resync video presentation timestamp to start
     * such that the video's start is "delayed" by the clip.start when it
     * starts playing
     *
     * scale=width:height: scale the video to the clip's dimensions. we do this
     * here since there is only one input link.
     */
    vFilter += `[v_split${i}]trim=${start}:${end},setpts=${setpts},scale=${scale}[${i}v];`
  }

  // -----------------------
  // VIDEO FILTER COMPONENT

  for (let i = 0; i < vClips.length; i++) {
    // define inLink. If this is the first video, use [0:v], otherwise use [vbase${i}]
    const inLink = i === 0 ? `[0:v]` : `[vbase${i}]`;
    // define outLink. If this is the last video, use [vout], otherwise use [vbase${i+1}]
    const outLink = i === vClips.length - 1 ? `[vout]` : `[vbase${i + 1}]`;
    // NOTE: if there's a single clip, the above logic will result in [v:0] -> [vout] (which is correct)

    const clip = vClips[i];

    vFilter += `${inLink}[${i + 1}v]`;

    // if there are no extra nodes on any matrix automation curve, then this is
    // edge case 1. we can use a single overlay/enable filter for the entire
    // clip.
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

      vFilter += `overlay=${overlayPos}:${enabledPeriod}${outLink};`
      continue;
    }

    // Here, we need to interpolate the video's matrix automation curves. There's
    // a lot of complexity here, but it boils down to a lot of repetitive logic.
    //
    // If there are no nodes on any of the matrix curves, we can just use a
    // single overlay/enable filter for the entire clip.
    //
    // Otherwise, we need to interpolate between the nodes of each curve. This
    // presents a few issues:
    // 1. It isn't guaranteed that each curve will have the same number of nodes
    // 2. besides the first and last nodes, there's no guarantee that the nodes
    //    of each curve will be at the same time
    // We can solve these issues by equalizing the automation curves of the
    // matrix, such that each curve has the same number of nodes (all at the
    // same times).

    const [equalizedAutomation, uniqueNodeTimes] = equalizeAutomation(["sx", "sy", "tx", "ty"], [clip.matrix[0], clip.matrix[3], clip.matrix[4], clip.matrix[5]]);

    // after adding nodes, we can now build out the filtergraph for this clip by
    // interpolating between the nodes of each curve.
    //
    // we go through each time in nodeTimes, and add a filter for each matrix
    // value at that time. Note that because nodeTimes *doesn't* include the
    // first and last points, we iterate from 0 - nodeTimes.length + 1.

    for (let j = 0; j < uniqueNodeTimes.length + 1; j++) {
      // retrieve the X and Y values of each matrix for the given node index
      const [fromSxScalar, fromSxVal, toSxScalar, toSxVal] = [...equalizedAutomation.get("sx")!.curves[j], ...equalizedAutomation.get("sx")!.curves[j+1]];
      const [fromSyScalar, fromSyVal, toSyScalar, toSyVal] = [...equalizedAutomation.get("sy")!.curves[j], ...equalizedAutomation.get("sy")!.curves[j+1]];
      const [fromTxScalar, fromTxVal, toTxScalar, toTxVal] = [...equalizedAutomation.get("tx")!.curves[j], ...equalizedAutomation.get("tx")!.curves[j+1]];
      const [fromTyScalar, fromTyVal, toTyScalar, toTyVal] = [...equalizedAutomation.get("ty")!.curves[j], ...equalizedAutomation.get("ty")!.curves[j+1]];

      /**
       * The combined offset of the clip, and the automation clip. the enable
       * period is absolutely positioned w.r.t. the export's start
       */
      const offset = equalizedAutomation.get("sx")!.offset + clip.offset;

      // FIXME: user can change individual matrix automation clip duration/
      // offsets, which throws off the calculation here
      const duration = equalizedAutomation.get("sx")!.duration;

      // determine the start and end times for the current node. this is used to
      // fill in the filter's enable parameter.
      const fromTime = fromSxScalar * duration + offset;
      const toTime = toSxScalar * duration + offset;

      // generate ffmpeg lerp strings for each matrix value
      const sxLerpString = buildLerpString(fromSxScalar, fromSxVal, toSxScalar, toSxVal, duration, offset);
      const syLerpString = buildLerpString(fromSyScalar, fromSyVal, toSyScalar, toSyVal, duration, offset);
      const txLerpString = buildLerpString(fromTxScalar, fromTxVal, toTxScalar, toTxVal, duration, offset);
      const tyLerpString = buildLerpString(fromTyScalar, fromTyVal, toTyScalar, toTyVal, duration, offset);

      // build out the scaling and translation strings
      const originOffsetXString = `(((${sxLerpString}-1)*${clip.media.dimensions[0]}/2)*(2*${clip.origin[0]}-1))`;
      const originOffsetYString = `(((${syLerpString}-1)*${clip.media.dimensions[1]}/2)*(2*${clip.origin[1]}-1))`;

      vFilter += `overlay=enable='between(t,${fromTime},${toTime})':x='(W-w)/2+(${txLerpString})-(${originOffsetXString})':y='(H-h)/2+(${tyLerpString})-(${originOffsetYString})':eval=frame`;
      if (j !== uniqueNodeTimes.length) vFilter += `,`;
    }
    vFilter += `${outLink};`;
  }

  // if there are no video clips, we need to add a null filter to the video
  // filter chain
  if (vClips.length === 0) vFilter += `[0:v]null[vout];`;


  // -----------------------
  // AUDIO FILTER COMPONENT

  // map all video and audio tracks to the base audio track. we need to filter
  // out images from this, since they don't have audio tracks.
  const inputs = clips.map((clip, i) => clip.media.type !== "image" ? `[${i+1}a]` : "").filter((input) => input !== "");

  // keep in mind, no semicolon here!
  aFilter += `[0:a]${inputs.join('')}amix=inputs=${inputs.length+1}:duration=first[aout]`;

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
