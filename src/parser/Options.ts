import type {Direction, KeyList, Options, Order} from "../types/Intermediate";
import type {Context} from "./Context";
import {parseKey} from "./Helpers";

export function parseOptions(ctx: Context, input: unknown): Options {
	if (input === null || typeof input !== "object" || Array.isArray(input)) {
		throw ctx.failure("OPTIONS must be an object.");
	}

	// Checks if the input has a key that isn't COLUMNS or ORDER.
	if (Object.keys(input).some((key) => !["COLUMNS", "ORDER"].includes(key))) {
		throw ctx.failure("OPTIONS can only have COLUMNS and ORDER clauses.");
	}

	if (!("COLUMNS" in input)) {
		throw ctx.failure("OPTIONS must have a COLUMNS clause.");
	}

	const options: Options = {
		columns: parseColumns(ctx.at("COLUMNS"), input.COLUMNS),
		order: undefined,
	};

	if ("ORDER" in input) {
		options.order = parseOrder(ctx.at("ORDER"), input.ORDER);
	}

	return options;
}

function parseColumns(ctx: Context, input: unknown): KeyList {
	if (!Array.isArray(input)) {
		throw ctx.failure("COLUMNS must be an array.");
	}

	const [first, ...rest] = input.map((key, i) => parseKey(ctx.at(i), key, true));

	if (first === undefined) {
		throw ctx.failure("COLUMNS must have at least one key.");
	}

	return [first, ...rest];
}

function parseOrder(ctx: Context, input: unknown): Order | undefined {
	if (typeof input === "undefined") {
		return undefined;
	}

	if (typeof input === "string") {
		return {
			type: "simple",
			key: parseKey(ctx, input, true),
		};
	}

	if (input === null || typeof input !== "object" || Array.isArray(input)) {
		throw ctx.failure("ORDER must be a string or an object.");
	}

	if (!("dir" in input)) {
		throw ctx.failure("ORDER object must have a DIR clause.");
	}

	if (!("keys" in input)) {
		throw ctx.failure("ORDER object must have a KEYS clause.");
	}

	if (Object.keys(input).length !== 2) {
		throw ctx.failure("ORDER object must only have DIR and KEYS clauses.");
	}

	const direction = parseDirection(ctx.at("DIR"), input.dir);
	const keys = parseOrderKeys(ctx.at("KEYS"), input.keys);

	return {
		type: "complex",
		direction,
		keys,
	};
}

function parseDirection(ctx: Context, input: unknown): Direction {
	if (input === "UP") {
		return "ascending";
	}

	if (input === "DOWN") {
		return "descending";
	}

	throw ctx.failure(`DIR must be "UP" or "DOWN" ("${input}" is invalid).`);
}

function parseOrderKeys(ctx: Context, input: unknown): KeyList {
	if (!Array.isArray(input)) {
		throw ctx.failure("KEYS must be an array.");
	}

	const [first, ...rest] = input.map((key, i) => parseKey(ctx.at(i), key, true));

	if (first === undefined) {
		throw ctx.failure("KEYS must have at least one key.");
	}

	return [first, ...rest];
}
