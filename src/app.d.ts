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
			origin: [number, number];
			volume: number;
			pan: number;
		};

		type Media = {
			uuid: string;
			/**
			 * The Blob URL of the media
			 */
			src: string;
			duration: number;
			/**
			 * The original file name of the media
			 */
			title: string;
			dimensions: [number, number];
			type: MediaType;
		};

		type Matrix = [number, number, number, number, number, number];

		type MediaType = "video" | "audio" | "image";
	}
}

export {};
