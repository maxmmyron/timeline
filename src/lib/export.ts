import { get } from "svelte/store";
import { ffmpeg, safeRes, videoClips, audioClips, exportStatus, exportPercentage } from "./stores";
import { fetchFile } from "@ffmpeg/ffmpeg";

export const exportVideo = async () => {
  exportStatus.set("setup");
  exportPercentage.set(0);

  const ffmpegInstance =  get(ffmpeg);
  let vClips = get(videoClips);

  // sort vClips by z index, lowest to highest. we do this so we properly layer the videos.
  vClips = vClips.sort((a, b) => a.z - b.z);

  /**
   * Combined array of video and audio clips.
   */
  let clips = [...vClips, ...get(audioClips)];

  if (!ffmpegInstance.isLoaded()) {
    exportStatus.set("error");
    throw new Error("ffmpeg.wasm did not load on editor startup. Please refresh the page.");
  }

  let vFilter = "";
  let aFilter = "";

  /**
   * Tracks which media files have been loaded into the ffmpeg instance
   */
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

    // determine the file extension based on the media type
    let type: string;
    if (media.type === "audio") type = "mp3";
    else if (media.type === "video") type = "mp4";
    else type = media.title.split('.').pop() as string;

    const src = `${media.uuid}.${type}`;

    // if the media hasn't been loaded yet, load it
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

      // join together the split filter
      if (media.type !== "image") aFilter += `${splitCount}[${a_outs.join("][")}];`;
      if (media.type !== "audio") vFilter += `${splitCount}[${v_outs.join("][")}];`;
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
     * The portion of the ffmpeg filter that defines the scale of the clip.
     * w/h represent the width and height of the clip, respectively; we multiply
     * these by the clip's matrix[0] and matrix[3] values to get the scaled
     * dimensions.
     */
    const scale = `(iw*${clip.matrix[0]}):(ih*${clip.matrix[3]})`;

    // if the clip is an image, we can just calculate the scale and move on
    if (clip.media.type === "image") {
      vFilter += `[v_split${i}]scale=${scale}[${i}v];`;
      continue;
    }

    // define delay, since we need it twice
    const d = (clip.offset * 1000).toFixed(0);

    aFilter += `[a_split${i}]atrim=${start}:${end},adelay=${d}|${d},`;

    // create a series of volume filters for each point in the automation curve
    if (clip.volume.curves.length === 0) {
      aFilter += `volume=${clip.volume.staticVal},`;
    } else {
      for (let j = 0; j < clip.volume.curves.length - 1; j++) {
        const [fromX, fromY] = clip.volume.curves[j];
        const [toX, toY] = clip.volume.curves[j + 1];

        const fromXTime = fromX * clip.media.duration + clip.volume.offset;
        const toXTime = toX * clip.media.duration + clip.volume.offset;

        /**
         * Add a volume filter for the current curve segment. This
         * 1. enables the volume filter between the start and end of the curve
         * 2. defines a function for the volume that is linearly interpolated
         *    between the start and end of the curve
         * 3. evaluates the volume at each frame (i.e. each point in the curve)
         *    so that the volume changes smoothly over time
         */
        aFilter += `volume=enable='between(t,${fromXTime},${toXTime})':volume=${fromY}+((${toY}-${fromY})*(t-${fromXTime})/(${toXTime}-${fromXTime})):eval=frame,`;
      }
    }

    const pan = [clip.pan < 0 ? 1 : 1 - clip.pan, clip.pan > 0 ? 1 : 1 + clip.pan];
    aFilter+=`pan=stereo|c0=${pan[0]}*c0|c1=${pan[1]}*c1[${i}a];`;


    // if the clip is audio, we don't need to do any video processing
    if (clip.media.type === "audio") continue;

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

    // calculate the offset of the clip based on the transform origin and scaling.
    const originOffsetX = ((clip.matrix[0] - 1) * clip.media.dimensions[0] / 2) * (2 * clip.origin[0] - 1);
    const originOffsetY = ((clip.matrix[3] - 1) * clip.media.dimensions[1] / 2) * (2 * clip.origin[1] - 1);

    /**
     * The portion of the ffmpeg filter that defines the position of the clip.
     * (W-w)/2 and (H-h)/2 are used to center the video; we then offset by two
     * values:
     * 1. the x and y values of the clip's transformation matrix
     * 2. the offset of the clip based on the transform origin and scaling
     */
    const overlayPos  = `(W-w)/2+${clip.matrix[4] - originOffsetX}:(H-h)/2+${clip.matrix[5] - originOffsetY}`;

    /**
     * The portion of the ffmpeg filter that defines the period over which the
     * clip is enabled. This starts at clip.offset, and lasts until the the end
     * of the clip (in absolute positioning: offset + calculated duration).
     */
    const enabledPeriod = `enable='between(t\\,${clip.offset},${clip.offset + (clip.media.duration - clip.end - clip.start)})'`;

    //overlay=<overlayW>:<overlayH>:<enabledPeriod>
    vFilter += `${inLink}[${i + 1}v]overlay=${overlayPos}:${enabledPeriod}${outLink};`
  }

  // if there are no video clips, we need to add a null filter to the video filter chain
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

  console.log(`Downloaded export.mp4 (${duration}s)`);
  console.log(["-i", "base.mp4", ...[...loadedMedia.map((src) =>  ["-i", src])].flat(), "-filter_complex", `${vFilter}${aFilter}`, "-map", "[vout]", "-map", "[aout]", "export.mp4"].join(" "));
};
