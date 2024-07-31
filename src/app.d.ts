// See https://kit.svelte.dev/docs/types#app
// for informati on about these interfaces

declare global {
	namespace App {
		type PickByType<T, Value> = {
			[P in keyof T as T[P] extends Value | undefined ? P : never]: T[P];
		};
		/**
		 * The extendable base for all media types. This interface is used to implement the properties of an
		 * uploaded media clip, *before* it is added to the timeline.
		 */
		interface MediaBase<T = MediaType> {
			type: T;
			uuid: string;
			title: string;
		}

		type VideoMedia = {
			videoSrc: string;
			audioSrc: string;
			dimensions: [number, number];
			duration: number;
		} & MediaBase<"video">;

		type AudioMedia = {
			audioSrc: string;
			duration: number;
		} & MediaBase<"audio">;

		type ImageMedia = {
			videoSrc: string;
			dimensions: [number, number];
			/**
			 * For images, the duration is 7 by default.
			 */
			duration: number;
		} & MediaBase<"image">

		type Media<T = MediaType> = T extends "video" ? VideoMedia : T extends "image" ? ImageMedia : AudioMedia;

		/**
		 * The extendable base for all clip types. This interface is used to implement an interactive,
		 * render-able representation of some uploaded media that exists on the timeline.
		 */
		interface ClipBase<T = MediaType> {
			type: T;
			uuid: string;
			/**
			 * The media used during rendering
			 */
			media: T extends "video" ? VideoMedia : T extends "image" ? ImageMedia : AudioMedia;
			/**
			 * The absolute offset of the clip from the timeline start point
			 */
			offset: number;
			/**
			 * The number of seconds into the media that the clip will begin from
			 */
			start: number;
			/**
			 * The number of seconds from the end of the media that the clip will stop playing at
			 */
			end: number;
			timelineZ: number;
			filterGraph: App.FilterGraph;
			/**
			 * The node used to render the clip
			 */
			outputNode: EditorNode<(args: any) => Record<string, any>>;
		}

		interface VideoClip extends ClipBase<"video"> {
			matrix: Matrix;
		}

		interface AudioClip extends ClipBase<"audio"> {
			volume: Automation<"volume">;
			pan: number;
		}

		interface ImageClip extends ClipBase<"image"> {
			matrix: Matrix;
		}

		interface FilterGraph {
			nodes: Array<EditorNode<(args: any) => Record<string, any>>>;
			edges: Array<GraphEdge>;
		};

		type GraphEdge = {
			outVertex: EdgeVertex<(args: any) => Record<string, any>, "out">;
			inVertex: EdgeVertex<(args: any) => Record<string, any>, "in">;
			unsubscribe: Unsubscriber;
		};

		type EdgeVertex<T extends (args: any) => Record<string, any>, K extends "in" | "out"> = {
			node: App.EditorNode<T>;
			key: K extends "out" ? keyof ReturnType<T>: keyof Parameters<T>[0];
		};

		type EditorNode<T extends (args: any) => Record<string, any>> = {
			uuid: string;
			title: string;
			pos: [number, number];
			/**
			 * An overridable function that performs the node's primary transform
			 * @param args An object of properties
			 * @returns
			 */
			transform: T;
			ref: HTMLElement | null;
			inputs: Writable<Paramters<T>[0]>;
			outputs: Writable<ReturnType<T>>;
		}

		type Clip<T = MediaType> = T extends "video" ? VideoClip : T extends "image" ? ImageClip : AudioClip;

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

		type ConnectNodes = <T extends (...args: any) => [any, any], U extends (...args: any) => [any, any], K extends keyof ReturnType<T>>(outName: K, inNode: U, inName: keyof PickByType<Parameters<U>[0], ReturnType<T>[K][0]>) => boolean;
	}
}

export {};
