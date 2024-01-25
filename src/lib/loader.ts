import {v4 as uuidv4} from "uuid";

export const resolveMedia = async (file: File): Promise<App.Media> => {
  const type = file.type.split('/')[0] as 'video' | 'audio';
  const src = await assertMIME(file, type);
  const duration = await resolveDuration(src, type);

  return { uuid: uuidv4(), src, duration, title: file.name, type };
}

const assertMIME = async (file: File, type: 'video' | 'audio') => {
  let ext = file.type.split('/')[1];

  // create a template element to check if the browser can play the file
  const temp = document.createElement(type).canPlayType(file.type);

  // if the browser can play the file, return the file's URL (if the MIME type
  // is valid)
  if(temp === "maybe" || temp === "probably") {
    if (type === "video" && ext !== "mp4" && ext !== "m4v") {
      throw new Error(`Non MP4 video files are not supported. (Got ${file.type})`);
    } else if (type === "audio" && ext !== "mpeg") {
      throw new Error(`Non MP3 audio files are not supported. (Got ${file.type})`);
    }
    return URL.createObjectURL(file);
  }
  else throw new Error('Your browser does not support this format.');
};

const resolveDuration = async (src: string, type: 'video' | 'audio') => new Promise<number>((resolve) => {
  let temp: HTMLVideoElement | HTMLAudioElement = document.createElement(type);

  temp.src = src;
  temp.preload = "metadata";
  temp.load();

  temp.addEventListener("loadedmetadata", () => resolve(temp.duration));
});
