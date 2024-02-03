// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		type Clip = {
			media: Media;
			offset: number;
			start: number;
			end: number;
			uuid: string;
			z: number;
			matrix: Matrix;
			volume: number;
			pan: number;
		};

		type Media = {
			uuid: string;
			src: string;
			duration: number;
			title: string;
			type: MediaType;
		};

		type Matrix = [number, number, number, number, number, number];

		type MediaType = "video" | "audio" | "image";
	}
}

export {};
