import type {
	Aggregate,
	Aggregation,
	Aggregations,
	Avg,
	Count,
	KeyList,
	Max,
	Min,
	NumberKey,
	Sum,
	Transformation,
} from "../QueryTypes";
import type {Context} from "./Context";
import {parseKey} from "./Helpers";

export function parseTransformation(ctx: Context, input: unknown): Transformation {
	if (input === null || typeof input !== "object" || Array.isArray(input)) {
		throw ctx.failure("TRANSFORMATIONS must be an object.");
	}

	if (!("GROUP" in input)) {
		throw ctx.failure("TRANSFORMATIONS must have a GROUP clause.");
	}

	if (!("APPLY" in input)) {
		throw ctx.failure("TRANSFORMATIONS must have an APPLY clause.");
	}

	if (Object.keys(input).length !== 2) {
		throw ctx.failure("TRANSFORMATIONS must only have GROUP and APPLY clauses.");
	}

	const groupBy = parseGroupBy(ctx.at("GROUP"), input.GROUP);
	const aggregations = parseApply(ctx.at("APPLY"), input.APPLY);

	return {
		groupBy,
		aggregations,
	};
}

function parseGroupBy(ctx: Context, input: unknown): KeyList {
	if (!Array.isArray(input)) {
		throw ctx.failure("GROUP must be an array.");
	}

	const [first, ...rest] = input.map((key, i) => parseKey(ctx.at(i), key));

	if (first === undefined) {
		throw ctx.failure("GROUP must have at least one key.");
	}

	return [first, ...rest];
}

function parseApply(ctx: Context, input: unknown): Aggregations {
	if (!Array.isArray(input)) {
		throw ctx.failure("APPLY must be an array.");
	}

	return input.map((aggregation, i) => parseAggregation(ctx.at(i), aggregation));
}

function parseAggregation(ctx: Context, input: unknown): Aggregation {
	if (input === null || typeof input !== "object" || Array.isArray(input)) {
		throw ctx.failure("Aggregation must be an object.");
	}

	// This cast is safe because it only changes `any` to `unknown`.
	const [entry, ...rest] = Object.entries(input) as Array<[string, unknown] | undefined>;

	if (entry === undefined || rest.length !== 0) {
		throw ctx.failure("Aggregation must have exactly one key.");
	}

	const [rawKey, aggregate] = entry;

	if (rawKey.length === 0) {
		throw ctx.failure("Aggregation key must not be empty.");
	}

	if (rawKey.indexOf("_") !== -1) {
		throw ctx.failure("Aggregation key must not contain an underscore.");
	}

	if (ctx.aggregationKeys.map((k) => k.value).includes(rawKey)) {
		throw ctx.failure(`Aggregation key must be unique (${rawKey} already exists).`);
	}

	const key: NumberKey = {
		type: "number",
		field: rawKey,
		value: rawKey,
	};

	ctx.aggregationKeys.push(key);

	return {
		key,
		aggregate: parseAggregate(ctx.at(rawKey), aggregate),
	};
}

function parseAggregate(ctx: Context, input: unknown): Aggregate {
	if (input === null || typeof input !== "object" || Array.isArray(input)) {
		throw ctx.failure("Aggregate must be an object.");
	}

	const keys = Object.keys(input);

	if (keys.length !== 1) {
		throw ctx.failure("Aggregate must have exactly one key.");
	}

	if ("MAX" in input) {
		return parseMax(ctx.at("MAX"), input.MAX);
	} else if ("MIN" in input) {
		return parseMin(ctx.at("MIN"), input.MIN);
	} else if ("AVG" in input) {
		return parseAvg(ctx.at("AVG"), input.AVG);
	} else if ("SUM" in input) {
		return parseSum(ctx.at("SUM"), input.SUM);
	} else if ("COUNT" in input) {
		return parseCount(ctx.at("COUNT"), input.COUNT);
	} else {
		throw ctx.failure(`Aggregate must be one of the valid aggregate types (${keys[0]} is invalid).`);
	}
}

function parseMax(ctx: Context, input: unknown): Max {
	const key = parseKey(ctx, input);

	if (key.type !== "number") {
		throw ctx.failure(`MAX can only be used on numeric keys (${key.value} is a string key).`);
	}

	return {
		type: "max",
		key,
	};
}

function parseMin(ctx: Context, input: unknown): Min {
	const key = parseKey(ctx, input);

	if (key.type !== "number") {
		throw ctx.failure(`MIN can only be used on numeric keys (${key.value} is a string key).`);
	}

	return {
		type: "min",
		key,
	};
}

function parseAvg(ctx: Context, input: unknown): Avg {
	const key = parseKey(ctx, input);

	if (key.type !== "number") {
		throw ctx.failure(`AVG can only be used on numeric keys (${key.value} is a string key).`);
	}

	return {
		type: "avg",
		key,
	};
}

function parseSum(ctx: Context, input: unknown): Sum {
	const key = parseKey(ctx, input);

	if (key.type !== "number") {
		throw ctx.failure(`SUM can only be used on numeric keys (${key.value} is a string key).`);
	}

	return {
		type: "sum",
		key,
	};
}

function parseCount(ctx: Context, input: unknown): Count {
	const key = parseKey(ctx, input);
	return {
		type: "count",
		key,
	};
}
