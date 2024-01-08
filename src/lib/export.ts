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

  for (const { uuid, media } of clips) {
    ffmpegInstance.FS("writeFile", `${uuid}.mp4`, await fetchFile(media.src));
    // ffmpegInstance.FS("writeFile", `${uuid}_trimmed.mp4`, "");
  }

  ffmpegInstance.FS("writeFile", "base.mp4", "");
  ffmpegInstance.FS("writeFile", "export.mp4", "");

  const duration = Math.max(...clips.map((clip) => clip.offset + (clip.media.duration - clip.end - clip.start)));
  if(duration < 0) {
    console.warn("duration is negative", duration);
    return;
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
    const start = clip.start;
    const end = (clip.media.duration - clip.end);
    vfilter += `[${i}:v]trim=duration=${end-start},setpts=PTS-STARTPTS+${clip.offset-clip.start}/TB[${i}v];`
    // NOTE: here we use offset * 1000 since adelay doesn't seem to work with decimal second notation (i.e "3.54s")
    afilter += `[${i}:a]atrim=${start}:${end},adelay=${(clip.offset * 1000).toFixed(0)}[${i}a];`
  }

  // add initial video/audio overlay
  // this is done outside the loop because we're using the base video as the first in link ([0:v], [0:a])
  // if there's only one clip, we don't need to do this
  if(clips.length > 1) {
    vfilter += `[0:v][1v]overlay=enable='between(t\\,${clips[0].offset},${clips[0].offset + (clips[0].media.duration - clips[0].end - clips[0].start)})'[vbase1];`;
  }

  // add video/audio overlays for each clip (except for first/last)
  // start from 2, since we already added the first clip
  for (let i = 2; i <= clips.length - 1; i++) {
    const clip = clips[i - 1];

    vfilter += `[vbase${i - 1}][${i}v]overlay=enable='between(t\\,${clip.offset},${clip.offset + (clip.media.duration - clip.end - clip.start)})'[vbase${i}];`;
  }

  // add final video/audio overlay
  // this is done outside the loop because the out link is [vout], or [aout]

  if(clips.length == 1) {
    const inLink = `[0:v]`;
    vfilter += `${inLink}[1v]overlay=enable='between(t\\,${clips[0].offset},${clips[0].offset + (clips[0].media.duration - clips[0].end - clips[0].start)})'[vout];`
  } else {
    const lastClipIdx = clips.length - 1;
    const lastClip = clips[lastClipIdx];
    const inLink = `[vbase${lastClipIdx}]`;
    vfilter += `${inLink}[${clips.length}v]overlay=enable='between(t\\,${lastClip.offset},${lastClip.offset + (lastClip.media.duration - lastClip.end - lastClip.start)})'[vout];`;
  }

  // keep in mind, no semicolon here!
  afilter += `[0:a]${clips.map((_,i)=>`[${i+1}a]`).join('')}amix=inputs=${clips.length+1}:duration=first[aout]`;

  const filter = `${vfilter}${afilter}`;

  await ffmpegInstance.run("-i", "base.mp4", ...clips.map(({uuid}) => ["-i", `${uuid}.mp4`]).flat(), "-filter_complex", filter, "-map", "[vout]", "-map", "[aout]", "export.mp4");

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
