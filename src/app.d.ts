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
			volume: Automation<"volume">;
			pan: number,
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

		type Automation<T = AutomationType> = {
			uuid: string;
			type: T;
			anchor: "start" | "end";
			offset: number;
			duration: number;
			/**
			 * The points that make up the automation graph. Each point is connected
			 * to the next point by a curve of the same type.
			 */
			curves: Array<[number,number]>;
			/**
			 * A static value to use if the automation is not defined.
			 */
			staticVal: number;
			valueBounds?: [number, number];
		}

		type AutomationType = "volume";
	}
}

export {};
