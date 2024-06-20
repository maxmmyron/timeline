// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		type Clip<T = MediaType> = {
			type: T;
			media: Media<T>;
			offset: number;
			start: number;
			end: number;
			uuid: string;
			timelineZ: number;
		} & (T extends "video" ? {
			matrix: Matrix;
		} : T extends "audio" ? {
			volume: Automation<"volume">;
			pan: number;
		} : T extends "image" ? {
			matrix: Matrix;
		} : {});

		type Media<T = MediaType> = {
			type: T;
			uuid: string;
			/**
			 * The Blob URL of the media
			 */
			src: string;
			/**
			 * The original file name of the media
			 */
			title: string;
			/**
			 * The duration of a clip
			 */
			duration: number;
		} & (T extends "video" ? {
			dimensions: [number, number];
		} : T extends "image" ? {
			dimensions: [number, number];
		} : {});

		type Matrix = [Automation<"scale">, number, number, Automation<"scale">, Automation<"position">, Automation<"position">];

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
			valueBounds: [number, number] | null;
		}

		type AutomationType = "volume" | "position" | "scale";

		type Icon = "Automation" | "BeginningSkip"
		| "ClipInspector" | "Close" | "EndSkip" | "Export" | "Import"
		| "Link" | "MediaPool" | "Pause" | "Play" | "Pointer"
		| "Reset" | "SplitClip" |  "Unlink" | "ZoomIn" | "ZoomOut";
	}
}

export {};
