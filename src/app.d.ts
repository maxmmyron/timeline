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

		type Automation<T = AutomationType> = {
			uuid: string;
			type: T;
			anchor: "start" | "end";
			offset: number;
			duration: number;
			/**
			 * The curves that make up the automation graph. Each curve is defined by:
			 * 1. The start point, defined as [time, value]
			 * 2. The end point, defined as [time, value]
			 * 3. The type of curve, defined as a string. This can be one of several
			 * types as defined by App.CurveType.
			 */
			curves: Array<[[number, number], [number, number], CurveType]>;
			/**
			 * A static value to use if the automation is not defined.
			 */
			staticVal: number;
		}

		type AutomationType = "volume" | "pan";
		type CurveType = "linear" | "quadratic" | "cubic";
	}
}

export {};
