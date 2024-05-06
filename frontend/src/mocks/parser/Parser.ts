import type {Query, Transformation} from "../QueryTypes";
import {context} from "./Context";
import {parseOptions} from "./Options";
import {parseTransformation} from "./Transformations";
import {parseWhere} from "./Where";

/**
 * A recursive descent parser that validates the structure of a given query and
 * parses it into an intermediate representation that the interpreter understands.
 *
 * @param input The query to be parsed. Must satisfy the query EBNF grammar
 * @returns The intermediate representation of the query
 * @throws {InsightError}
 * Thrown if the input does not satisfy the query EBNF grammar or references more than one dataset id.
 */
export function parseQuery(input: unknown): Query {
	const ctx = context();

	if (input === null || typeof input !== "object" || Array.isArray(input)) {
		throw ctx.failure("QUERY must be an object.");
	}

	// Checks if the input has a key that isn't WHERE or OPTIONS.
	if (Object.keys(input).some((key) => !["WHERE", "OPTIONS", "TRANSFORMATIONS"].includes(key))) {
		throw ctx.failure("QUERY can only have WHERE and OPTIONS clauses.");
	}

	if (!("WHERE" in input)) {
		throw ctx.failure("QUERY must have a WHERE clause.");
	}

	if (!("OPTIONS" in input)) {
		throw ctx.failure("QUERY must have an OPTIONS clause.");
	}

	const filter = parseWhere(ctx.at("WHERE"), input.WHERE);

	// Transformations need to be parsed before the options as the columns and order may refer to keys created by the transformations.
	let transformation: Transformation | undefined;
	if ("TRANSFORMATIONS" in input) {
		transformation = parseTransformation(ctx.at("TRANSFORMATIONS"), input.TRANSFORMATIONS);
	}

	const options = parseOptions(ctx.at("OPTIONS"), input.OPTIONS);

	if (ctx.id === undefined) {
		throw new Error("Assertion failed: a query can't have been parsed successfully without setting a dataset ID.");
	}

	if (ctx.kind === undefined) {
		throw new Error("Assertion failed: a query can't have been parsed successfully without setting a record kind.");
	}

	return {
		dataset: ctx.id,
		kind: ctx.kind,
		transformation,
		filter,
		...options,
	};
}
