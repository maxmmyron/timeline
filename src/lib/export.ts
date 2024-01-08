import { get } from "svelte/store";
import { ffmpeg, videoClips } from "./stores";
import { fetchFile } from "@ffmpeg/ffmpeg";

export const exportVideo = async () => {
  const ffmpegInstance =  get(ffmpeg);
  let clips = get(videoClips);

  if (!ffmpegInstance.isLoaded()) {
    throw new Error("ffmpeg.wasm did not load on editor startup. Please refresh the page.");
  }

  for (const { uuid, media } of clips) {
    ffmpegInstance.FS("writeFile", `${uuid}.mp4`, await fetchFile(media.src));
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

  // sort clips by z index, lowest to highest. we do this so we properly layer the videos.
  clips = clips.sort((a, b) => a.z - b.z);

  let vfilter = "";
  let afilter = "";

  // -----------------------
  // TRIM AND DELAY COMPONENTS
  for (let i = 1; i <= clips.length; i++) {
    const clip = clips[i - 1];
    const start = clip.start;
    const end = (clip.media.duration - clip.end);

    /**
     * trim=duration: trim the video so it doesn't go past clip.end (otherwise,
     * it video will keep playing as if video was still playing, despite it not
     * being visible/audible)
     *
     * setpts=PTS-STARTPTS+delay: resync video presentation timestamp to start
     * such that the video's start is "delayed" by the clip.start when it
     * starts playing
     */
    vfilter += `[${i}:v]trim=duration=${end-start},setpts=PTS-STARTPTS+${clip.offset-clip.start}/TB[${i}v];`

    /**
     * atrim=duration: trim the audio
     *
     * adelay=delay: delay the audio by clip.offset so it starts playing
     * at the same time as the video. NOTE: we use offset * 1000 since it
     * seems like adelay doesn't work with decimal second notation (i.e "3.54s")
     */
    afilter += `[${i}:a]atrim=${start}:${end},adelay=${(clip.offset * 1000).toFixed(0)}[${i}a];`
  }

  // -----------------------
  // VIDEO FILTER COMPONENT

  for (let i = 0; i < clips.length; i++) {
    // define inLink. If this is the first video, use [0:v], otherwise use [vbase${i}]
    const inLink = i === 0 ? `[0:v]` : `[vbase${i}]`;
    // define outLink. If this is the last video, use [vout], otherwise use [vbase${i+1}]
    const outLink = i === clips.length - 1 ? `[vout]` : `[vbase${i + 1}]`;
    // NOTE: if there's a single clip, the above logic will result in [v:0] -> [vout] (which is correct)

    const clip = clips[i];

    /**
     * overlay=
     *  - (W-w)/2:(H-h)/2: center the video within the frame
     *  - enable='between(t,offset,offset+duration)': only show the video when it's supposed to be shown
     */
    vfilter += `${inLink}[${i + 1}v]overlay=(W-w)/2:(H-h)/2:enable='between(t\\,${clip.offset},${clip.offset + (clip.media.duration - clip.end - clip.start)})'${outLink};`;
  }

  // -----------------------
  // AUDIO FILTER COMPONENT

  // we can map all audio tracks to the base audio track at the same time (thank god)
  // keep in mind, no semicolon here!
  // FIXME: audio works fine in stereo for first clip, but after that
  // they only play in left ear.
  afilter += `[0:a]${clips.map((_,i)=>`[${i+1}a]`).join('')}amix=inputs=${clips.length+1}:duration=first[aout]`;

  // -----------------------
  // RUN FFMPEG

  await ffmpegInstance.run("-i", "base.mp4", ...clips.map(({uuid}) => ["-i", `${uuid}.mp4`]).flat(), "-filter_complex", `${vfilter}${afilter}`, "-map", "[vout]", "-map", "[aout]", "export.mp4");

  // -----------------------
  // EXPORT VIDEO FILE

  const exportData = ffmpegInstance.FS("readFile", "export.mp4");

  const link = document.createElement("a");
  link.download = "export.mp4";
  link.href = URL.createObjectURL(new Blob([exportData.buffer], { type: "video/mp4" }));
  document.body.appendChild(link);
  link.dispatchEvent(new MouseEvent("click"));
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(link.href), 7000);

  console.log(`Downloaded export.mp4 (${duration}s)`);
  console.log(["-i", "base.mp4", ...clips.map(({uuid}) => ["-i", `${uuid}.mp4`]).flat(), "-filter_complex", `${vfilter}${afilter}`, "-map", "[vout]", "-map", "[aout]", "export.mp4"].join(" "));
};
