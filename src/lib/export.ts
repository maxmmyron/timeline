import { get } from "svelte/store";
import { ffmpeg, videoClips } from "./stores";
import { fetchFile } from "@ffmpeg/ffmpeg";

// TODO: black video when no clips present at time
export const exportVideo = async () => {
  const ffmpegInstance =  get(ffmpeg);
  let clips = get(videoClips);

  if (!ffmpegInstance.isLoaded()) {
    throw new Error("ffmpeg.wasm did not load on editor startup. Please refresh the page.");
  }

  /**
   * TODO: this can be removed by refactoring timeline positioning system to use {offset + start} to define physical position,
   * and then using PTS in ffmpeg to define timestamps.
   *
   * e.g. setpts=PTS+{offset+start}/TB for video, atrim={start}:{duration-end},adelay={offset+start}s for audio
   */
  for (const { uuid, media } of clips) {
    ffmpegInstance.FS("writeFile", `${uuid}.mp4`, await fetchFile(media.src));
    ffmpegInstance.FS("writeFile", `${uuid}_trimmed.mp4`, "");
  }

  ffmpegInstance.FS("writeFile", "base.mp4", "");
  ffmpegInstance.FS("writeFile", "export.mp4", "");

  const duration = Math.max(...clips.map((clip) => clip.offset + (clip.media.duration - clip.end - clip.start)));
  if(duration < 0) {
    console.warn("duration is negative", duration);
    return;
  }

  // trim clips
  for (const clip of clips) {
    const [baseFile, trimmedFile] = [`${clip.uuid}.mp4`, `${clip.uuid}_trimmed.mp4`];

    await ffmpegInstance.run("-i", baseFile, "-ss", clip.start.toString(), "-to", (clip.media.duration - clip.end).toString(), trimmedFile);
  }

  // create black video with empty audio track for duration of video
  await ffmpegInstance.run("-t", duration.toString(), "-f", "lavfi", "-i", "color=c=black:s=1280x720:r=30", "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100", "-pix_fmt", "yuv420p", "-shortest", "base.mp4");

  // sort clips by z index
  clips = clips.sort((a, b) => a.z - b.z);

  let vfilter = "";
  let afilter = "";


  // define timestamp/audio offsets
  // this starts at 1 because the base video is at index 0
  for (let i = 1; i <= clips.length; i++) {
    const clip = clips[i - 1];
    const dur = (clip.media.duration - clip.end - clip.start);
    vfilter += `[${i}:v]setpts=PTS+${clip.offset}/TB[${i}v];`
    afilter += `[${i}:a]atrim=0:${dur},adelay=${clip.offset}s[${i}a];`
  }

  // add initial video/audio overlay
  // this is done outside the loop because we're using the base video as the first in link ([0:v], [0:a])
  vfilter += `[0:v][1v]overlay=enable='between(t\\,${clips[0].offset},${clips[0].offset + (clips[0].media.duration - clips[0].end - clips[0].start)})'[vbase1];`;
  afilter += `[0:a][1a]amix=inputs=2:duration=first[abase1];`;

  // add video/audio overlays for each clip (except for first/last)
  // start from 2, since we already added the first clip
  for (let i = 2; i <= clips.length - 1; i++) {
    const clip = clips[i - 1];

    vfilter += `[vbase${i - 1}][${i}v]overlay=enable='between(t\\,${clip.offset},${clip.offset + (clip.media.duration - clip.end - clip.start)})'[vbase${i}];`;
    afilter += `[abase${i - 1}][${i}a]amix=inputs=2:duration=first[abase${i}];`;
  }

  // add final video/audio overlay
  // this is done outside the loop because the out link is [vout], or [aout]
  const lastClip = clips[clips.length - 1];
  vfilter += `[vbase${clips.length - 1}][${clips.length}v]overlay=enable='between(t\\,${lastClip.offset},${lastClip.offset + (lastClip.media.duration - lastClip.end - lastClip.start)})'[vout];`;

  // keep in mind, no semicolon here!
  afilter += `[abase${clips.length - 1}][${clips.length}a]amix=inputs=2:duration=first[aout]`;

  const filter = `${vfilter}${afilter}`;

  await ffmpegInstance.run("-i", "base.mp4", ...clips.map(({uuid}) => ["-i", `${uuid}_trimmed.mp4`]).flat(), "-filter_complex", filter, "-map", "[vout]", "-map", "[aout]", "export.mp4");

  // export
  const exportData = ffmpegInstance.FS("readFile", "export.mp4");

  const link = document.createElement("a");
  link.download = "export.mp4";
  link.href = URL.createObjectURL(new Blob([exportData.buffer], { type: "video/mp4" }));
  document.body.appendChild(link);
  link.dispatchEvent(new MouseEvent("click"));
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(link.href), 7000);

  console.log(duration);
  console.log(filter);
  console.log(["-i", "base.mp4", ...clips.map(({uuid}) => ["-i", `${uuid}_trimmed.mp4`]).flat(), "-filter_complex", filter, "-map", "[vout]", "-map", "[aout]", "export.mp4"].join(" "));
};
