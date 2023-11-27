type MediaType = 'image' | 'video' | 'audio';

type Clip = {
    file: File;
    type: MediaType;
    duration: number;
    offset: number;
    start: number;
    uuid: string;
    z: number;
  };
