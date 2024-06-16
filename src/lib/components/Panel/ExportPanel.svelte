<script lang="ts">
  import { get } from "svelte/store";
  import {
    safeRes,
    videoClips,
    audioClips,
    exportPercentage,
    volumeMultiplier,
  } from "$lib/stores";
  import { FFmpeg } from "@ffmpeg/ffmpeg";

  let logs: string[] = [];

  let isExporting = false;

  /**
   * Resolves a file from a string. We need this because @ffmpeg/util doesn't seem to work.
   * @param file path to the file
   * @returns
   */
  const fetchFile = async (file: string): Promise<Uint8Array> => {
    return new Promise(async (resolve) => {
      const fileReader = new FileReader();

      fileReader.onload = () => {
        const { result } = fileReader;
        if (result instanceof ArrayBuffer) {
          resolve(new Uint8Array(result));
        }
      };

      const blob = fetch(file).then((response) => response.blob());
      fileReader.readAsArrayBuffer(await blob);
    });
  };

  const ffmpeg = new FFmpeg();
  let isFfmpegLoaded = false;

  export const exportVideo = async () => {
    logs = [];
    isExporting = true;
    exportPercentage.set(0);

    // load ffmpeg for first time, if necessary
    if (!isFfmpegLoaded) {
      console.log("loading ffmpeg for first time...");
      logs = [...logs, "loading ffmpeg for first time..."];
      const baseUrl = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";

      ffmpeg.on("log", ({ message }) => {
        logs = [...logs, message];
        console.log(message);
      });

      await ffmpeg.load({
        coreURL: `${baseUrl}/ffmpeg-core.js`,
        wasmURL: `${baseUrl}/ffmpeg-core.wasm`,
      });
    }

    isFfmpegLoaded = true;

    // sort vClips by z index, lowest to highest. we do this so we properly layer
    // the videos.
    const vClips = $videoClips.sort((a, b) => a.timelineZ - b.timelineZ);

    let clips = [...vClips, ...$audioClips];

    if (!ffmpeg.loaded) {
      isExporting = false;
      logs = [
        ...logs,
        "ffmpeg.wasm did not load on editor startup. Please refresh the page.",
      ];
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
      else type = media.title.split(".").pop() as string;

      const src = `${media.uuid}.${type}`;

      if (!loadedMedia.includes(src)) {
        await ffmpeg.writeFile(src, await fetchFile(media.src));
        loadedMedia.push(src);

        // there may be multiple instances of the same media file in the timeline,
        // so we split a given file into multiple inputs.
        if (media.type !== "image") aFilter += `[${i + 1}:a]asplit=`;
        if (media.type !== "audio") vFilter += `[${i + 1}:v]split=`;

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
            if (media.type !== "image") a_outs.push(`a_split${j + 1}`);
            if (media.type !== "audio") v_outs.push(`v_split${j + 1}`);
          }
        }

        // join together the split filters
        if (media.type !== "image")
          aFilter += `${splitCount}[${a_outs.join("][")}];`;
        if (media.type !== "audio") {
          // count the number of clips of this media that have matrix automation curves on the scale components.
          // if there are any, we need to scale the video up to a large enough size to mitigate scaling artifacts.
          if (
            clips
              .filter((clip) => clip.media.uuid === media.uuid)
              .filter(
                (clip) =>
                  (<App.Clip<"video">>clip).matrix[0].curves.length > 0 ||
                  (<App.Clip<"video">>clip).matrix[3].curves.length > 0
              ).length > 0
          ) {
            vFilter += `${splitCount},scale=${$safeRes[0] * 4}:-1[${v_outs.join("][")}];`;
          } else vFilter += `${splitCount}[${v_outs.join("][")}];`;
        }
      }
    }

    await ffmpeg.writeFile("base.mp4", "");
    await ffmpeg.writeFile("export.mp4", "");

    const duration = Math.max(
      ...clips.map(
        (clip) => clip.offset + (clip.media.duration - clip.end - clip.start)
      )
    );
    if (duration < 0) {
      isExporting = false;
      logs = [...logs, "Error: duration of video is less than 0."];
      return;
    }

    // create black video with empty audio track for duration of video
    await ffmpeg.exec([
      "-t",
      duration.toString(),
      "-f",
      "lavfi",
      "-i",
      `color=c=black:s=${$safeRes[0]}x${$safeRes[1]}:r=30`,
      "-f",
      "lavfi",
      "-i",
      "anullsrc=channel_layout=stereo:sample_rate=44100",
      "-pix_fmt",
      "yuv420p",
      "-crf",
      "28",
      "-shortest",
      "-tune",
      "stillimage",
      "-preset",
      "ultrafast",
      "base.mp4",
    ]);

    // -----------------------
    // TRIM AND DELAY COMPONENTS
    for (let i = 1; i <= clips.length; i++) {
      const clip = clips[i - 1];

      const start = clip.start;
      const end = clip.media.duration - clip.end;

      /**
       * The portion of the ffmpeg audio filter that scales the video's clip.
       */
      let scale: string = "";

      // perform audio processing if the clip contains audio (i.e. it's not an image)
      if (clip.media.type === "audio" || clip.media.type === "video") {
        // define delay, since we need it twice
        const d = Math.max(0, clip.offset * 1000).toFixed(0);

        aFilter += `[a_split${i}]atrim=${start}:${end},adelay=${d}|${d},`;

        // create a series of volume filters for each point in the automation curve
        if (clip.volume.curves.length === 0) {
          aFilter += `volume=${clip.volume.staticVal * get(volumeMultiplier)},`;
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

            const volumeLerpString = buildLerpString(
              fromX * get(volumeMultiplier),
              fromY * get(volumeMultiplier),
              toX * get(volumeMultiplier),
              toY * get(volumeMultiplier),
              clip.volume.duration,
              offset
            );

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

        const pan = [
          clip.pan < 0 ? 1 : 1 - clip.pan,
          clip.pan > 0 ? 1 : 1 + clip.pan,
        ];
        aFilter += `pan=stereo|c0=${pan[0]}*c0|c1=${pan[1]}*c1[${i}a];`;

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
        if (
          clip.matrix[0].curves.length === 0 &&
          clip.matrix[3].curves.length === 0
        ) {
          scale = `(${dims[0]}*${clip.matrix[0].staticVal}):(${dims[1]}*${clip.matrix[3].staticVal})`;

          // if this is an image, we don't need to do any extra processing,
          // so we can just skip to the next clip
          if (clip.media.type === "image") {
            vFilter += `[v_split${i}]scale=${scale}[${i}v];`;
            continue;
          }
        } else {
          const [equalizedAutomation, uniqueNodeTimes] = equalizeAutomation(
            ["sx", "sy"],
            [clip.matrix[0], clip.matrix[3]]
          );

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

          for (let j = 0; j < uniqueNodeTimes.length + 1; j++) {
            // add a new `if` statement for each matrix value
            xClause += `if(`;
            yClause += `if(`;

            const [fromSxScalar, fromSxVal, toSxScalar, toSxVal] = [
              ...equalizedAutomation.get("sx")!.curves[j],
              ...equalizedAutomation.get("sx")!.curves[j + 1],
            ];
            const [fromSyScalar, fromSyVal, toSyScalar, toSyVal] = [
              ...equalizedAutomation.get("sy")!.curves[j],
              ...equalizedAutomation.get("sy")!.curves[j + 1],
            ];

            /**
             * The combined offset of the clip, and the automation clip. the enable
             * period is absolutely positioned w.r.t. the export's start
             */
            const offset = equalizedAutomation.get("sx")!.offset + clip.offset;
            const duration = equalizedAutomation.get("sx")!.duration;

            const fromTime = fromSxScalar * duration + offset;
            const toTime = toSxScalar * duration + offset;

            // generate ffmpeg lerp strings for each matrix value
            const sxLerpString = buildLerpString(
              fromSxScalar,
              fromSxVal,
              toSxScalar,
              toSxVal,
              duration,
              offset
            );
            const syLerpString = buildLerpString(
              fromSyScalar,
              fromSyVal,
              toSyScalar,
              toSyVal,
              duration,
              offset
            );

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
      vFilter += `[v_split${i}]trim=${start}:${end},setpts=${setpts},scale=${scale}[${i}v];`;
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
      if (
        clip.matrix[0].curves.length === 0 &&
        clip.matrix[3].curves.length === 0 &&
        clip.matrix[4].curves.length === 0 &&
        clip.matrix[5].curves.length === 0
      ) {
        // 0.5 == center origin
        // const ORIGIN = 0.5;
        // const originOffsetX =
        //   (((clip.matrix[0].staticVal - 1) * clip.media.dimensions[0]) / 2) *
        //   (2 * ORIGIN - 1);
        // const originOffsetY =
        //   (((clip.matrix[3].staticVal - 1) * clip.media.dimensions[1]) / 2) *
        //   (2 * ORIGIN - 1);

        /**
         * The portion of the ffmpeg filter that defines the position of the clip.
         * (W-w)/2 and (H-h)/2 are used to center the video; we then offset by two
         * values:
         * 1. the x and y values of the clip's transformation matrix
         * 2. the offset of the clip based on the transform origin and scaling
         */
        // const overlayPos = `(W-w)/2+${clip.matrix[4].staticVal - originOffsetX}:(H-h)/2+${clip.matrix[5].staticVal - originOffsetY}`;
        const overlayPos = `(W-w)/2+${clip.matrix[4].staticVal}:(H-h)/2+${clip.matrix[5].staticVal}`;

        /**
         * The portion of the ffmpeg filter that defines the period over which the
         * clip is enabled. This starts at clip.offset, and lasts until the the end
         * of the clip (in absolute positioning: offset + calculated duration).
         */
        const enabledPeriod = `enable='between(t,${clip.offset},${clip.offset + (clip.media.duration - clip.end - clip.start)})'`;

        vFilter += `overlay=${overlayPos}:${enabledPeriod}${outLink};`;
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

      const [equalizedAutomation, uniqueNodeTimes] = equalizeAutomation(
        ["sx", "sy", "tx", "ty"],
        [clip.matrix[0], clip.matrix[3], clip.matrix[4], clip.matrix[5]]
      );

      // after adding nodes, we can now build out the filtergraph for this clip by
      // interpolating between the nodes of each curve.
      //
      // we go through each time in nodeTimes, and add a filter for each matrix
      // value at that time. Note that because nodeTimes *doesn't* include the
      // first and last points, we iterate from 0 - nodeTimes.length + 1.

      for (let j = 0; j < uniqueNodeTimes.length + 1; j++) {
        // retrieve the X and Y values of each matrix for the given node index
        const [fromSxScalar, fromSxVal, toSxScalar, toSxVal] = [
          ...equalizedAutomation.get("sx")!.curves[j],
          ...equalizedAutomation.get("sx")!.curves[j + 1],
        ];
        const [fromSyScalar, fromSyVal, toSyScalar, toSyVal] = [
          ...equalizedAutomation.get("sy")!.curves[j],
          ...equalizedAutomation.get("sy")!.curves[j + 1],
        ];
        const [fromTxScalar, fromTxVal, toTxScalar, toTxVal] = [
          ...equalizedAutomation.get("tx")!.curves[j],
          ...equalizedAutomation.get("tx")!.curves[j + 1],
        ];
        const [fromTyScalar, fromTyVal, toTyScalar, toTyVal] = [
          ...equalizedAutomation.get("ty")!.curves[j],
          ...equalizedAutomation.get("ty")!.curves[j + 1],
        ];

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
        const txLerpString = buildLerpString(
          fromTxScalar,
          fromTxVal,
          toTxScalar,
          toTxVal,
          duration,
          offset
        );
        const tyLerpString = buildLerpString(
          fromTyScalar,
          fromTyVal,
          toTyScalar,
          toTyVal,
          duration,
          offset
        );

        // build out the scaling and translation strings (these are zero because)
        // const originOffsetXString = `(((${sxLerpString}-1)*${clip.media.dimensions[0]}/2)*(0))`;
        // const originOffsetYString = `(((${syLerpString}-1)*${clip.media.dimensions[1]}/2)*(0))`;

        // vFilter += `overlay=enable='between(t,${fromTime},${toTime})':x='(W-w)/2+(${txLerpString})-(${originOffsetXString})':y='(H-h)/2+(${tyLerpString})-(${originOffsetYString})':eval=frame`;
        vFilter += `overlay=enable='between(t,${fromTime},${toTime})':x='(W-w)/2+(${txLerpString})':y='(H-h)/2+(${tyLerpString})':eval=frame`;
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
    const inputs = clips
      .map((clip, i) => (clip.media.type !== "image" ? `[${i + 1}a]` : ""))
      .filter((input) => input !== "");

    // keep in mind, no semicolon here!
    aFilter += `[0:a]${inputs.join("")}amix=inputs=${inputs.length + 1}:duration=first[aout]`;

    // -----------------------
    // RUN FFMPEG

    try {
      ffmpeg.on("progress", ({ progress }) => exportPercentage.set(progress));
      console.log(
        [
          "-i",
          "base.mp4",
          ...[...loadedMedia.map((src) => ["-i", src])].flat(),
          "-filter_complex",
          `${vFilter}${aFilter}`,
          "-map",
          "[vout]",
          "-map",
          "[aout]",
          "export.mp4",
        ].join(" ")
      );
      await ffmpeg.exec([
        "-i",
        "base.mp4",
        ...[...loadedMedia.map((src) => ["-i", src])].flat(),
        "-filter_complex",
        `${vFilter}${aFilter}`,
        "-map",
        "[vout]",
        "-map",
        "[aout]",
        "-vcodec",
        "libx264",
        "-crf",
        "28",
        "export.mp4",
      ]);
    } catch (e: any) {
      isExporting = false;
      logs = [...logs, e.message];
      throw e;
    }

    // -----------------------
    // EXPORT VIDEO FILE

    const exportData = await ffmpeg.readFile("export.mp4");

    isExporting = false;

    const link = document.createElement("a");
    link.download = "export.mp4";
    link.href = URL.createObjectURL(
      new Blob([exportData], { type: "video/mp4" })
    );
    document.body.appendChild(link);
    link.dispatchEvent(new MouseEvent("click"));
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(link.href), 7000);

    console.log(
      [
        "-i",
        "base.mp4",
        ...[...loadedMedia.map((src) => ["-i", src])].flat(),
        "-filter_complex",
        `${vFilter}${aFilter}`,
        "-map",
        "[vout]",
        "-map",
        "[aout]",
        "export.mp4",
      ].join(" ")
    );
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
  const buildLerpString = (
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    duration: number,
    offset: number
  ) => {
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
  const equalizeAutomation = (
    keys: string[],
    automation: App.Automation[]
  ): [Map<string, App.Automation>, number[]] => {
    if (keys.length !== automation.length)
      throw new Error(
        "Error equalizing automation: keys and automation arrays are not the same length."
      );

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
      if (a.curves.length === 0) {
        a.curves = [
          [0, a.staticVal],
          [1, a.staticVal],
        ];
      }
    }

    // Build out an array containing all unique node times for all automation
    // clips in the matrix. This will be used to add nodes to each clip that do
    // not have nodes at the same time as other clips.

    /**
     * An array of all points along all the matrix's automation curves,
     * excluding the first and last points. This is used to determine the
     */
    const nodeTimes = [...map.values()]
      .reduce((acc: number[], m) => {
        m.curves.forEach((c) =>
          !acc.includes(c[0]) && c[0] !== 0 && c[0] !== 1
            ? acc.push(c[0])
            : null
        );
        return acc;
      }, [])
      .sort((a, b) => a - b);

    // if there are no nodes, we can just return the map and an empty array
    if (nodeTimes.length === 0) return [map, nodeTimes];

    /**
     * go through each automation clip in the matrix, and add curve points to
     * clips that do not have curve points at the same time as other clips. For
     * the Y value, interpolate between the two closest points.
     */
    for (const [_, automation] of map) {
      for (const time of nodeTimes) {
        if (automation.curves.some((c) => c[0] === time)) continue;

        const leftIdx = automation.curves.findIndex(
          (c, i) =>
            c[0] < time &&
            automation.curves[i + 1] &&
            automation.curves[i + 1][0] > time
        );
        const [left, right] = [
          automation.curves[leftIdx],
          automation.curves[leftIdx + 1],
        ];

        automation.curves = automation.curves.toSpliced(leftIdx + 1, 0, [
          time,
          left[1] +
            ((right[1] - left[1]) * (time - left[0])) / (right[0] - left[0]),
        ]);
      }
    }

    return [map, nodeTimes];
  };
</script>

<div class="flex flex-col gap-2 p-2 h-full overflow-hidden">
  <div class="h-full flex-grow flex flex-col gap-2 overflow-hidden">
    <p>EXPORT LOGGER</p>
    <hr />
    <div class="h-full overflow-scroll space-y-1">
      {#each logs as log}
        <p>{log}</p>
      {/each}
    </div>
  </div>
  <hr />
  <div class="flex justify-end items-center gap-2">
    {#if !isExporting}
      <div class="h-1 w-24 rounded-full bg-zinc-900"></div>
    {:else}
      <div class="h-1 w-24 rounded-full bg-zinc-800">
        <div
          class="h-full bg-blue-400 rounded-full transition-all"
          style:width="{$exportPercentage * 100}%"
        ></div>
      </div>
    {/if}
    <button
      on:click={exportVideo}
      class="border border-zinc-800 px-3 py-1 rounded-sm"
      disabled={isExporting}
    >
      <p class="uppercase">Export</p>
    </button>
  </div>
</div>
