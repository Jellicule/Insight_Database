import {InsightDatasetKind, NumberKey} from "../QueryTypes";

export type PathElement = string | number;

export type Path = PathElement[];

/**
 * A query parsing context.
 */
export interface Context {
	/** The current path in the object being parsed */
	readonly path: Path;
	/** The dataset id being referenced in the parsed query */
	id: string | undefined;
	/** The type of records being queried */
	kind: InsightDatasetKind | undefined;
	/** The aggregation keys created in the parsed query */
	readonly aggregationKeys: NumberKey[];

	/**
	 * Creates a new descendant parsing context by appending the given element to the current path.
	 *
	 * @param element The next element in the path
	 * @returns A new parsing context
	 */
	at(element: PathElement): Context;

	/**
	 * Creates an {@link Error} with the current path and the reason for failiure.
	 *
	 * @param reason The reason the parsing failed
	 * @returns An error instance
	 */
	failure(reason: string): Error;
}

/**
 * Creates a new parsing context at the location given in the path or at the root if no path is given.
 * A shared context can be supplied if this is a descendant or a new one with be created with an undefined dataset id.
 *
 * @param path The path in the object currently being parsed
 * @param shared A reference to the shared parsing context for accessing the current dataset id
 * @returns A parsing context instance
 */
export const context = (path: Path = [], shared: SharedContext = sharedContext()): Context => ({
	path,

	get id() {
		return shared.id;
	},
	set id(value) {
		shared.id = value;
	},

	get kind() {
		return shared.kind;
	},
	set kind(value) {
		shared.kind = value;
	},

	get aggregationKeys() {
		return shared.aggregationKeys;
	},

	at: (element) => context([...path, element], shared),
	failure: (reason) => new Error(`Parsing query failed at ${formatPath(path)}: ${reason}`),
});

/**
 * Formats the given object path in a jq style syntax.
 *
 * @example Usage
 * ```
 * const path = ["WHERE", "AND", 0, "GT"];
 * console.log(formatPath(path));
 * // "QUERY.WHERE.AND[0].GT"
 * ```
 *
 * @param path An object path array
 * @returns The formatted path
 */
const formatPath = (path: Path): string =>
	path.reduce<string>(
		(acc, element) => acc + (typeof element === "string" ? `.${element}` : `[${element}]`),
		"QUERY"
	);

/**
 * A shared query parsing context for storing the first dataset id encountered while parsing a query.
 */
interface SharedContext {
	/** The dataset id being referenced in the parsed query */
	id: string | undefined;
	/** The type of records being queried */
	kind: InsightDatasetKind | undefined;
	/** The aggregation keys created in the parsed query */
	aggregationKeys: NumberKey[];
}

/**
 * Creates a new shared parsing context with an undefined dataset id.
 *
 * @returns The shared parsing context instance
 */
const sharedContext = (): SharedContext => ({
	id: undefined,
	kind: undefined,
	aggregationKeys: [],
});
