type Clip = {
  media: Media;
  offset: number;
  start: number;
  end: number;
  uuid: string;
  z: number;
};

type Media = {
  uuid: string;
  src: string;
  duration: number;
  title: string;
};
