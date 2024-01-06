import { get } from "svelte/store";
import { ffmpeg, videoClips } from "./stores";
import { fetchFile } from "@ffmpeg/ffmpeg";

// TODO: black video when no clips present at time
export const exportVideo = async () => {
  const ffmpegInstance =  get(ffmpeg);
  const clips = get(videoClips);

  if (!ffmpegInstance.isLoaded()) {
    throw new Error("ffmpeg.wasm did not load on editor startup. Please refresh the page.");
  }

  for (const { uuid, media } of clips) {
    ffmpegInstance.FS("writeFile", `${uuid}.mp4`, await fetchFile(media.src));
    ffmpegInstance.FS("writeFile", `${uuid}_trimmed.mp4`, "");
  }

  ffmpegInstance.FS("writeFile", "export.mp4", "");

  // trim each clip

  for (const clip of clips) {
    const [baseFile, trimmedFile] = [`${clip.uuid}.mp4`, `${clip.uuid}_trimmed.mp4`];

    await ffmpegInstance.run("-i", baseFile, "-ss", clip.start.toString(), "-to", (clip.media.duration - clip.end).toString(), trimmedFile);
  }

  // concat all clips
  // see: https://stackoverflow.com/a/11175851/9473692
  //      https://superuser.com/a/972615
  //      https://ffmpeg.org/ffmpeg-filters.html#concat

  const ftr = "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:-1:-1:color=black,setsar=1,fps=30,format=yuv420p";
  const filters = [
    `-filter_complex`,
    clips.map((_, i) => `[${i}:v]${ftr}[v${i}];`).join("") + clips.map((_, i) => `[v${i}][${i}:a]`).join("") + "concat=n=" + clips.length + `:v=1:a=1[v][a]`,
  ];

  await ffmpegInstance.run(
    // describe all inputs
    ...clips.map(({ uuid }) => ["-i", `${uuid}_trimmed.mp4`]).flat(),
    // describe filter set
    ...filters,
    // describe output
    ...[`-map`, `[v]`, `-map`, `[a]`, `-c:v`, `libx264`, `-c:a`, `aac`, "export.mp4"]
  );

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
