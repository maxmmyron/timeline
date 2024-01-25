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
			/**
			 * The 2D transformation matrix of the clip.
			 */
			matrix: Matrix;
		};

			type Media = {
			uuid: string;
			src: string;
			duration: number;
			title: string;
			type: "video" | "audio";
		};

		type Matrix = [number, number, number, number, number, number];
	}
}

export {};
