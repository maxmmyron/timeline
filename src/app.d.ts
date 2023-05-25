// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		interface TimelineNode {
			id: string;
			title: string;
			duration: number;
			startOffset: number;
			endOffset: number;
			next: TimelineNode | null;
		}

		interface Timeline {
			head: TimelineNode | null;
			tail: TimelineNode | null;
			runtime: number;
			toArray(): TimelineNode[];
		}
	}
}

export {};
