/**
 * A representation of a room from a dataset in a format that the interpreter understands.
 */
export interface RoomInternal {
	readonly fullname: string;
	readonly shortname: string;
	readonly number: string;
	readonly name: string;
	readonly address: string;
	readonly lat: number;
	readonly lon: number;
	readonly seats: number;
	readonly type: string;
	readonly furniture: string;
	readonly href: string;
}
