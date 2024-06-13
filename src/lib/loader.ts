import {v4 as uuidv4} from "uuid";

export const createMediaFromFile = (file: File): {uuid: string, title: string, media: Promise<App.Media>} => {
  const uuid = uuidv4();

  return {
    uuid,
    title: file.name,
    media: resolveMedia(file, uuid)
  }
};

export const resolveMedia = (file: File, uuid: string): Promise<App.Media> => new Promise(async (resolve, reject) => {
  // reject if the MIME type is empty (since we can't sus anything out)
  if(file.type === "") reject("Unsupported file type.");

  const mime = file.type.split('/')[0] as App.MediaType;
  if (mime !== "video" && mime !== "audio" && mime !== "image") reject("Unsupported file type.");

  const isSupported = await canMediaPlay(file);
  console.log(isSupported);

  if (!isSupported) reject("Unsupported file type.");

  const src = URL.createObjectURL(file);
  console.log(src);
  const duration = await resolveDuration(src, mime);
  console.log(duration);
  const dimensions = await resolveDimensions(src, mime);
  console.log(dimensions);

  resolve({
    uuid,
    src,
    duration,
    title: file.name,
    dimensions,
    type: mime
  });
});

/**
 * Returns a promise that resolves to a boolean indicating whether the browser can decode and play the media file.
 *
 * @param file the file to check the mime type of
 */
export const canMediaPlay = (file: File): Promise<boolean> => {
  const supportedVideoType = ["video/mp4", "video/ogg", "video/webm"];
  const supportedAudioType = ["audio/mpeg", "audio/ogg", "audio/wav"];
  const supportedImageType = ["image/jpeg", "image/png"];

  return new Promise((resolve) => {
    const type = file.type;
    if (![...supportedVideoType, ...supportedAudioType, ...supportedImageType].includes(type)) {
      resolve(false);
    }

    if (type.startsWith("image")) resolve(true);

    const media = document.createElement(type.split('/')[0] as Exclude<App.MediaType, "image">);
    resolve(media.canPlayType(type) === "probably");
  });
};


export const resolveDuration = (src: string, type: App.MediaType) => new Promise<number>((resolve) => {
  // TODO: don't hardcode the duration for images
  if (type === "image") resolve(7)
  else {
    let temp: HTMLVideoElement | HTMLAudioElement = document.createElement(type);

    temp.src = src;
    temp.preload = "metadata";
    temp.load();

    temp.addEventListener("loadedmetadata", () => resolve(temp.duration));
  }
});

export const resolveDimensions = (src: string, type: App.MediaType) => new Promise<[number, number]>((resolve) => {
  switch (type) {
    case "image":
      const img = new Image();
      img.src = src;
      img.onload = () => resolve([img.width, img.height]);
      break;
    case "video":
      const video = document.createElement("video");
      video.src = src;
      video.preload = "metadata";
      video.load();
      video.addEventListener("loadedmetadata", () => resolve([video.videoWidth, video.videoHeight]));
      break;
    default:
      resolve([0, 0]);
  }
});
