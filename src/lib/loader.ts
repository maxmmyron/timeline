import {v4 as uuidv4} from "uuid";

export const createMediaFromFile = (file: File): {uuid: string, title: string, media: Promise<App.Media>} => {
  const uuid = uuidv4();

  return {
    uuid,
    title: file.name,
    media: resolveMedia(file, uuid)
  }
};

export const resolveMedia = (file: File, uuid: string): Promise<App.Media<App.MediaType>> => new Promise(async (resolve, reject) => {
  // reject if the MIME type is empty (since we can't sus anything out)
  const mime = file.type.split('/')[0] as string;
  if (mime !== "video" && mime !== "audio" && mime !== "image") reject("Unsupported file type.");
  const type = mime as App.MediaType;

  const isSupported = await canMediaPlay(file);
  console.log(isSupported);

  if (!isSupported) reject("Unsupported file type.");

  const src = URL.createObjectURL(file);

  let base: App.Media = {
    uuid,
    src,
    type,
    title: file.name,
  } as App.Media;

  if (type === "image") {
    const dimensions = await resolveDimensions(src, type);

    base = {...base, dimensions} as App.Media<"image">;
  } else if (type === "video") {
    const duration = await resolveDuration(src, type);
    const dimensions = await resolveDimensions(src, type);

    base = {...base, duration, dimensions} as App.Media<"video">;
  } else if (type === "audio") {
    const duration = await resolveDuration(src, type);

    base = {...base, duration} as App.Media<"audio">;
  }

  resolve(base);
});

/**
 * Returns a promise that resolves to a boolean indicating whether the browser can decode and play the media file.
 *
 * @param file the file to check the mime type of
 */
export const canMediaPlay = (file: File): boolean => {
  const supportedVideoType = ["video/mp4", "video/ogg", "video/webm"];
  const supportedAudioType = ["audio/mpeg", "audio/ogg", "audio/wav"];
  const supportedImageType = ["image/jpeg", "image/png"];

  const type = file.type;
  if (![...supportedVideoType, ...supportedAudioType, ...supportedImageType].includes(type)) {
    return false;
  }

  // FIXME: shaky
  if (type.startsWith("image")) return true;

  const media = document.createElement(type.split('/')[0] as Exclude<App.MediaType, "image">);
  return media.canPlayType(type) === "probably" || media.canPlayType(type) === "maybe";
};


export const resolveDuration = (src: string, type: Exclude<App.MediaType, "image">) => new Promise<number>((resolve, reject) => {
  if (type !== "audio" && type !== "video") reject("Invalid MIME type.");

  let temp: HTMLVideoElement | HTMLAudioElement = document.createElement(type);

  temp.src = src;
  temp.preload = "metadata";
  temp.load();

  temp.addEventListener("loadedmetadata", () => resolve(temp.duration));
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
