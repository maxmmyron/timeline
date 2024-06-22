import {v4 as uuidv4} from "uuid";

/**
 * Creates a promise-wrapped media object from an uploaded file.
 *
 * @param file the uploaded File
 */
export const createMediaFromFile = (file: File): {uuid: string, title: string, media: Promise<App.Media>} => {
  const uuid = uuidv4();

  return {
    uuid,
    title: file.name,
    media: resolveMedia(file, uuid, file.name)
  }
};

/**
 * Creates a Promise-wrapped media object from a Blob.
 *
 * @param blob the uploaded Blob file
 * @param title A title for the media. This is necessary because the Blob interface does not have a "name" property
 */
export const createMediaFromBlob = (blob: Blob, title: string): {uuid: string, title: string, media: Promise<App.Media>} => {
  const uuid = uuidv4();

  return {
    uuid,
    title,
    media: resolveMedia(blob, uuid, title)
  }
};

export const resolveMedia = (file: File | Blob, uuid: string, title?: string): Promise<App.Media> => new Promise(async (resolve, reject) => {
  // reject if the MIME type is empty (since we can't sus anything out)
  const mime = file.type.split('/')[0] as string;
  if (mime !== "video" && mime !== "audio" && mime !== "image") reject("Unsupported file type.");
  const type = mime as App.MediaType;

  const isSupported = await canMediaPlay(file);
  console.log(isSupported);

  if (!isSupported) reject("Unsupported file type.");

  const src = URL.createObjectURL(file);

  if (!title && !(<File>file)?.name) reject("No title provided");

  let base: App.MediaBase = {
    uuid,
    type,
    title: title ?? (<File>file)?.name,
  };

  let media: App.Media;

  if (type === "image") {
    const dimensions = await resolveDimensions(src, type);

    media = {
      ...base as App.MediaBase<"image">,
      videoSrc: src,
      dimensions,
      duration: 7,
    } as App.ImageMedia;
  } else if (type === "video") {
    const duration = await resolveDuration(src, type);
    const dimensions = await resolveDimensions(src, type);

    // const audioSrc = await extractAudio(src, type);

    media = {
      ...base as App.MediaBase<"video">,
      duration,
      dimensions,
      audioSrc: src,
      videoSrc: src,
    } as App.VideoMedia;
  } else {
    const duration = await resolveDuration(src, type);

    media = {
      ...base as App.MediaBase<"audio">,
      duration,
      audioSrc: src,
    } as App.AudioMedia;
  }

  resolve(media);
});

/**
 * Returns a promise that resolves to a boolean indicating whether the browser can decode and play the media file.
 *
 * @param file the file to check the mime type of
 */
export const canMediaPlay = (file: File | Blob): boolean => {
  const supportedVideoType = ["video/mp4", "video/ogg", "video/webm"];
  const supportedAudioType = ["audio/mpeg", "audio/ogg", "audio/wav", "audio/mp3"];
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
