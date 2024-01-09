import {v4 as uuidv4} from "uuid";

export const resolveMedia = async (file: File): Promise<App.Media> => {
  const src = await assertMIME(file).catch(err => { throw err; });
  const duration = await resolveDuration(src).catch(err => { throw err; })

  return { uuid: uuidv4(), src, duration, title: file.name };
}

const assertMIME = async (file: File) => {
  if(!file.type.includes('video')) throw new Error('Only video files are supported.');

  let ext = file.type.split('/')[1];

    const temp = document.createElement('video').canPlayType(file.type)
    if(temp === "maybe" || temp === "probably") {
      if(ext !== "mp4") {
        throw new Error('Non MP4 video files are not supported.');
      }
      return URL.createObjectURL(file);
    }
    else throw new Error('Your browser does not support this video format.');
};

const resolveDuration = async (src: string) => new Promise<number>((resolve) => {
  const video = document.createElement("video");
  video.src = src;
  video.preload = "metadata";
  video.load();

  video.addEventListener("loadedmetadata", () => resolve(video.duration));
});
