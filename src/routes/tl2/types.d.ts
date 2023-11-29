type MediaType = 'image' | 'video' | 'audio';

type Clip = {
  media: Media;
  offset: number;
  start: number;
  uuid: string;
  z: number;
};

type Media = {
  uuid: string;
  src: string;
  type: MediaType;
  duration: number;
  title: string;
  audio: AudioBuffer | null;
  thumbnails: string[] | null;
};
