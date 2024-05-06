import type {And, AnyKey, Equal, Filter, Greater, Lesser, Like, None, Not, NumberKey, Or} from "../types/Intermediate";
import type {Context} from "./Context";
import {parseKey} from "./Helpers";

export function parseWhere(ctx: Context, input: unknown): Filter | None {
	if (input === null || typeof input !== "object" || Array.isArray(input)) {
		throw ctx.failure("WHERE must be an object.");
	}

	if (Object.keys(input).length === 0) {
		return {
			type: "none",
		};
	}

	return parseFilter(ctx, input);
}

function parseFilter(ctx: Context, input: unknown): Filter {
	if (input === null || typeof input !== "object" || Array.isArray(input)) {
		throw ctx.failure("Filter must be an object.");
	}

	const keys = Object.keys(input);

	if (keys.length !== 1) {
		throw ctx.failure("Filter must have exactly one key.");
	}

	if ("GT" in input) {
		return parseGT(ctx.at("GT"), input.GT);
	} else if ("LT" in input) {
		return parseLT(ctx.at("LT"), input.LT);
	} else if ("EQ" in input) {
		return parseEQ(ctx.at("EQ"), input.EQ);
	} else if ("IS" in input) {
		return parseIS(ctx.at("IS"), input.IS);
	} else if ("NOT" in input) {
		return parseNOT(ctx.at("NOT"), input.NOT);
	} else if ("AND" in input) {
		return parseAND(ctx.at("AND"), input.AND);
	} else if ("OR" in input) {
		return parseOR(ctx.at("OR"), input.OR);
	} else {
		throw ctx.failure(`Filter must be one of the valid filter types (${keys[0]}) is invalid).`);
	}
}

function parseGT(ctx: Context, input: unknown): Greater {
	const [key, value] = parseNumericComparison(ctx, input);
	return {
		type: "gt",
		key,
		value,
	};
}

function parseLT(ctx: Context, input: unknown): Lesser {
	const [key, value] = parseNumericComparison(ctx, input);
	return {
		type: "lt",
		key,
		value,
	};
}

function parseEQ(ctx: Context, input: unknown): Equal {
	const [key, value] = parseNumericComparison(ctx, input);
	return {
		type: "eq",
		key,
		value,
	};
}

function parseIS(ctx: Context, input: unknown): Like {
	const [key, value] = parseComparison(ctx, input);

	if (key.type !== "string") {
		throw ctx.failure(`IS can only be used on string keys (${key.value} is a numeric key).`);
	}

	if (typeof value !== "string") {
		throw ctx.failure("IS value must be a string.");
	}

	// Finds the indicies of every asterisk in the string.
	const asterisks = value.split("").reduce<number[]>((acc, char, i) => (char === "*" ? [...acc, i] : acc), []);

	// Checks if there is an asterisk that isn't at the start or end of the value.
	if (asterisks.some((i) => i !== 0 && i !== value.length - 1)) {
		throw ctx.failure("IS value can only have asterisks at the beginning and end.");
	}

	return {
		type: "is",
		key,
		value,
	};
}

function parseNOT(ctx: Context, input: unknown): Not {
	return {
		type: "not",
		filter: parseFilter(ctx, input),
	};
}

function parseAND(ctx: Context, input: unknown): And {
	if (!Array.isArray(input)) {
		throw ctx.failure("AND must be an array.");
	}

	const [first, ...rest] = input.map((filter, i) => parseFilter(ctx.at(i), filter));

	if (first === undefined) {
		throw ctx.failure("AND must have at least one filter.");
	}

	return {
		type: "and",
		filters: [first, ...rest],
	};
}

function parseOR(ctx: Context, input: unknown): Or {
	if (!Array.isArray(input)) {
		throw ctx.failure("OR must be an array.");
	}

	const [first, ...rest] = input.map((filter, i) => parseFilter(ctx.at(i), filter));

	if (first === undefined) {
		throw ctx.failure("OR must have at least one filter.");
	}

	return {
		type: "or",
		filters: [first, ...rest],
	};
}

function parseNumericComparison(ctx: Context, input: unknown): [NumberKey, number] {
	const [key, value] = parseComparison(ctx, input);

	if (key.type !== "number") {
		throw ctx.failure(`LT/GT/EQ can only be used on numeric keys (${key.value} is a string key).`);
	}

	if (typeof value !== "number") {
		throw ctx.failure("Comparison value must be a number.");
	}

	return [key, value];
}

function parseComparison(ctx: Context, input: unknown): [AnyKey, unknown] {
	if (input === null || typeof input !== "object" || Array.isArray(input)) {
		throw ctx.failure("Comparison must be an object.");
	}

	// This cast is safe because it only changes `any` to `unknown`.
	const [entry, ...rest] = Object.entries(input) as Array<[string, unknown] | undefined>;

	if (entry === undefined || rest.length !== 0) {
		throw ctx.failure("Comparison must have exactly one key.");
	}

	const key = parseKey(ctx, entry[0]);
	const value = entry[1];

	return [key, value];
}
