import {v4 as uuidv4} from "uuid";

export const resolveMedia = (file: File): {uuid: string, title: string, media: Promise<App.Media>} => {
  const uuid = uuidv4();

  return {
    uuid,
    title: file.name,
    media: new Promise(async (resolve, reject) => {
      let fileType = file.type.split('/')[0];
      if (fileType !== "video" && fileType !== "audio" && fileType !== "image") {
        reject(new Error("Unsupported file type."));
      }
      const type = fileType as App.MediaType

      const src = await assertMIME(file, type);
      let duration = 7;
      if (type !== "image") duration = await resolveDuration(src, type);

      let dimensions: [number, number] = [0, 0];
      if (type === "image") {
        const img = new Image();
        img.src = src;
        await img.decode();
        dimensions = [img.width, img.height];
      } else if (type === "video") {
        const video = document.createElement("video");
        video.src = src;
        video.preload = "metadata";
        video.load();
        await new Promise((resolve) => video.addEventListener("loadedmetadata", () => {
          dimensions = [video.videoWidth, video.videoHeight];
          resolve(null);
        }));
      }

      resolve({ uuid, src, duration, title: file.name, type, dimensions });
    }),
  }
}

const assertMIME = async (file: File, type: App.MediaType) => {
  let ext = file.type.split('/')[1];

  if (type === "image") {
    if (ext !== "jpeg" && ext !== "png") {
      throw new Error(`Unsupported image type. (Got ${file.type})`);
    }
    return URL.createObjectURL(file);
  }

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

const resolveDuration = async (src: string, type: Exclude<App.MediaType, "image">) => new Promise<number>((resolve) => {
  let temp: HTMLVideoElement | HTMLAudioElement = document.createElement(type);

  temp.src = src;
  temp.preload = "metadata";
  temp.load();

  temp.addEventListener("loadedmetadata", () => resolve(temp.duration));
});
