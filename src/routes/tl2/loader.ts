export const resolveMedia = async (file: File): Promise<Media> => {
  const { src, type } = await assertMIME(file).catch(err => { throw err; });

  let duration: number = 5;
  let audio: AudioBuffer | null = null;
  let thumbnails: string[] | null = null;
  if(type === "image") {

  } else if(type === "video") {
    duration = await resolveDuration(src, type).catch(err => { throw err; });
  } else if(type === "audio") {
    duration = await resolveDuration(src, type).catch(err => { throw err; });
    audio = await resolveAudioBuffer(src, type).catch(err => { throw err; });
  }

  let uuid = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

  return { uuid, src, type, duration, title: file.name, audio, thumbnails };
}

const assertMIME = async (file: File) => {
  let type: MediaType = file.type.includes('video') ? 'video' : file.type.includes('audio') ? 'audio' : 'image';
  let ext = file.type.split('/')[1];

  if(type === "video" || type === "audio") {
    const temp = document.createElement('video').canPlayType(file.type)
    if(temp === "maybe" || temp === "probably") {
      if(ext === "mp4") {
        return { src: URL.createObjectURL(file), type };
      } else {
        throw new Error('Non MP4 video files are not supported.');
      }
    }
    else throw new Error('Your browser does not support this video format.');
  } else if(type === "image") {
    const avif = "data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUEAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAABYAAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAEAAAABAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgSAAAAAAABNjb2xybmNseAACAAIABoAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAAB5tZGF0EgAKBzgADlAgIGkyCR/wAABAAACvcA==";
    return await fetch(avif).then(res => res.blob()).then(blob => createImageBitmap(blob).then(() => {
      return { src: URL.createObjectURL(file), type };
    }).catch(() => {
      throw new Error('Your browser does not support AVIF images.');
    }));
  }

  throw new Error('Unknown error.');
};

const resolveDuration = async (src: string, type: string) => new Promise<number>((resolve, reject) => {
 if(type === "audio") {
    const audio = document.createElement("audio");
    audio.src = src;
    audio.preload = "metadata";
    audio.load();

    audio.addEventListener("loadedmetadata", () => {
      console.log("finished loading media duration");
      resolve(audio.duration);
    });
  }
  else if(type === "video") {
    const video = document.createElement("video");
    video.src = src;
    video.preload = "metadata";
    video.load();

    video.addEventListener("loadedmetadata", () => resolve(video.duration));
  }
  resolve(5);
});

const resolveThumbnails = async (src: string, type: string) => {};

const resolveAudioBuffer = async (src: string, type: string): Promise<AudioBuffer> => {
  const aCtx = new AudioContext();
  const res = await fetch(src);
  const arrayBuffer = await res.arrayBuffer();
  const audioBuffer = await aCtx.decodeAudioData(arrayBuffer);
  return audioBuffer;
};
