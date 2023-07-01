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

		type A = {
			type: "A";
			foo: string;
			bar: number;
		};

		type B = {
			type: "B";
			baz: string;
			qux: number;
		};

		type C = {
			type: "C";
			fizz: string;
			buzz: number;
		};

		type Media = A | B | C;
	}
}

export {};
