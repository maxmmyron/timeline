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
    ffmpegInstance.FS("writeFile", `${uuid}_trimmed.mp4`, "");
  }

  ffmpegInstance.FS("writeFile", "export.mp4", "");

  const duration = Math.max(...clips.map((clip) => clip.offset + (clip.media.duration - clip.end - clip.start)));
  if(duration < 0) {
    console.warn("duration is negative", duration);
    return;
  }

  // create black video with empty audio track for duration of video
  await ffmpegInstance.run("-t", duration.toString(), "-f", "lavfi", "-i", "color=c=black:s=1280x720:r=30", "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100", "-pix_fmt", "yuv420p", "-shortest", "export.mp4");

  // trim each clip
  for (const clip of clips) {
    const [baseFile, trimmedFile] = [`${clip.uuid}.mp4`, `${clip.uuid}_trimmed.mp4`];

    await ffmpegInstance.run("-i", baseFile, "-ss", clip.start.toString(), "-to", (clip.media.duration - clip.end).toString(), trimmedFile);
  }

  // order clips by z-index
  clips = clips.sort((a, b) => a.z - b.z);

  // [1:v]setpts=PTS-STARTPTS[v1];
  // [2:v]setpts=PTS-STARTPTS[v2];
  // ...
  // [0:v][v1]overlay=enable=gte(t\,${clips[0].offset})[base1];
  // [base1][v2]overlay=enable=gte(t\,${clips[1].offset})[base2];
  // ...
  // [basen][vn]overlay=enable=gte(t\,${clips[n].offset})[out];
  const ftr = "setpts=PTS-STARTPTS";
  let filterPTSResetComponent = clips.map((_, i) => `[${i+1}:v]${ftr}[v${i+1}];`).join("");
  let filterFirstOverlayComponent = `[0:v][v1]overlay=enable=gte(t\\,${clips[0].offset})[base1];`;
  let filterOverlayMapComponent = clips.slice(0,clips.length - 2).map((_, i) => `[base${i+1}][v${i+2}]overlay=enable=gte(t\\,${clips[i+1].offset})[base${i+2}];`).join("");
  let filterLastOverlayComponent = `[base${clips.length - 1}][v${clips.length}]overlay=enable=gte(t\\,${clips[clips.length - 1].offset})[out];`;

  const filter = filterPTSResetComponent + filterFirstOverlayComponent + filterOverlayMapComponent + filterLastOverlayComponent;

  console.log(filterPTSResetComponent + filterFirstOverlayComponent + filterOverlayMapComponent + filterLastOverlayComponent);

  console.log(["-i", "export.mp4", ...clips.map(({uuid}) => ["-i", `${uuid}_trimmed.mp4`]).flat(),
    "-filter_complex", `"${filter}"`, "-map", "[out]", "-map", "0:a", "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", "-c:a", "aac", "export.mp4"].join(" "));

  // -map [out] -map 0:a -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac export.mp4
  await ffmpegInstance.run("-i", "export.mp4", ...clips.map(({uuid}) => ["-i", `${uuid}_trimmed.mp4`]).flat(),
    "-filter_complex", `"${filter}"`, "-map", "[out]", "-map", "0:a", "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", "-c:a", "aac", "export.mp4");

  // concat all clips
  /**
   * clips: [a, b, c]
   *
   * -i a.mp4 -i b.mp4 -i c.mp4
   *
   * -filter_complex
   * []
   */

  // // concat all clips
  // // see: https://stackoverflow.com/a/11175851/9473692
  // //      https://superuser.com/a/972615
  // //      https://ffmpeg.org/ffmpeg-filters.html#concat

  // const ftr = "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:-1:-1:color=black,setsar=1,fps=30,format=yuv420p";
  // const filters = [
  //   `-filter_complex`,
  //   clips.map((_, i) => `[${i}:v]${ftr}[v${i}];`).join("") + clips.map((_, i) => `[v${i}][${i}:a]`).join("") + "concat=n=" + clips.length + `:v=1:a=1[v][a]`,
  // ];

  // await ffmpegInstance.run(
  //   // describe all inputs
  //   ...clips.map(({ uuid }) => ["-i", `${uuid}_trimmed.mp4`]).flat(),
  //   // describe filter set
  //   ...filters,
  //   // describe output
  //   ...[`-map`, `[v]`, `-map`, `[a]`, `-c:v`, `libx264`, `-c:a`, `aac`, "export.mp4"]
  // );

  // export
  const exportData = ffmpegInstance.FS("readFile", "export.mp4");

  const link = document.createElement("a");
  link.download = "export.mp4";
  link.href = URL.createObjectURL(new Blob([exportData.buffer], { type: "video/mp4" }));
  document.body.appendChild(link);
  link.dispatchEvent(new MouseEvent("click"));
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(link.href), 7000);
};
