/**
 * A representation of a section from a dataset in a format that the interpreter understands.
 */
export interface SectionInternal {
	readonly uuid: string;
	readonly id: string;
	readonly title: string;
	readonly instructor: string;
	readonly dept: string;
	readonly year: number;
	readonly avg: number;
	readonly pass: number;
	readonly fail: number;
	readonly audit: number;
}
