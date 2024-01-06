import { get } from "svelte/store";
import {ffmpeg, videoClips} from "./stores";

export const exportVideo = () => {
  const ffmpegInstance =  get(ffmpeg);
  const clips = get(videoClips);
};
