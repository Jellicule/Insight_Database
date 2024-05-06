import Decimal from "decimal.js";
import {InsightResult, ResultTooLargeError} from "../controller/IInsightFacade";
import {
	And,
	Equal,
	Filter,
	Greater,
	Like,
	Lesser,
	None,
	Not,
	Or,
	Query,
	Aggregations,
	StandardQuery,
	AggregateQuery,
	Order,
} from "../types/Intermediate";
import {SectionInternal} from "./SectionInternal";
import {RoomInternal} from "./RoomInternal";

interface PartialResult {
	[key: string]: string | number | undefined;
}

/**
 * Evaluates a query and returns the filtered, ordered results where each result
 * contains only the selected columns.
 *
 * @param query The intermediate representation of a query
 * @param dataset The records in the dataset
 * @returns The results of the query
 * @throws {ResultTooLargeError}
 * Throws if the query would return more than 5000 results.
 */
export function evalQuery(query: Query, dataset: ReadonlyArray<SectionInternal | RoomInternal>): InsightResult[] {
	const records: PartialResult[] = dataset.map((record) => ({...record}));

	if (query.transformation !== undefined) {
		return evalAggregateQuery(query, records);
	} else {
		return evalStandardQuery(query, records);
	}
}

function evalStandardQuery(query: StandardQuery, records: readonly PartialResult[]): InsightResult[] {
	const {order, columns, filter, dataset} = query;

	// Filter the sections by evaluating the query filter on each section.
	const filtered = filterWithLimit((record) => evalFilter(filter, record), records, 5000);

	// Sort the records by the query's ordering
	const sorted = sortByOrder(
		order,
		filtered.map((r) => prefixKeys(r, dataset))
	);

	// Maps each of the records to a query result containing only the requested fields.
	return sorted.map((record) => pick(record, ...columns.map((k) => k.value))) as InsightResult[];
}

const prefixKeys = <T>(object: Record<string, T>, prefix: string) =>
	Object.fromEntries(Object.entries(object).map(([k, v]) => [`${prefix}_${k}`, v]));

function evalAggregateQuery(query: AggregateQuery, records: readonly PartialResult[]): InsightResult[] {
	const {order, columns, filter, dataset, transformation} = query;

	const filtered = records.filter((record) => evalFilter(filter, record));

	const groups = groupByWithLimit(
		filtered,
		(record) => pick(record, ...transformation.groupBy.map((k) => k.field)),
		5000
	);

	const aggregated = [...groups.values()].map(([groupByFields, group]) => ({
		...prefixKeys(groupByFields, dataset),
		...evalAggregations(transformation.aggregations, group),
	}));

	const sorted = sortByOrder(order, aggregated);

	const selected = sorted.map((section) => pick(section, ...columns.map((k) => k.value)));

	return selected as InsightResult[];
}

function groupByWithLimit<T, K>(
	array: readonly T[],
	keyFn: (element: T) => K,
	limit: number
): Map<string, [K, readonly T[]]> {
	const groups = new Map<string, [K, readonly T[]]>();

	for (const element of array) {
		const keyObject = keyFn(element);
		const key = JSON.stringify(keyObject);
		const group = groups.get(key);
		if (group === undefined) {
			groups.set(key, [keyObject, [element]]);
		} else {
			groups.set(key, [keyObject, [...group[1], element]]);
		}
		if (groups.size > limit) {
			throw new ResultTooLargeError("Too many groups in aggregation query result.");
		}
	}

	return groups;
}

const pick = <T>(object: Record<string, T>, ...keys: string[]): Record<string, T> =>
	keys.reduce((acc, key) => ({...acc, [key]: object[key]}), {});

const assertNumber = (value: unknown): number => {
	if (typeof value !== "number") {
		throw new Error("Assertion error: Record field is not a number.");
	}
	return value;
};

const assertString = (value: unknown): string => {
	if (typeof value !== "string") {
		throw new Error("Assertion error: Record field is not a string.");
	}
	return value;
};

const assertNumbers = (values: readonly unknown[]): readonly number[] => values.map((value) => assertNumber(value));

const assertNotNulls = <T>(values: ReadonlyArray<T | undefined | null>): readonly T[] =>
	values.map((value) => {
		if (typeof value === "undefined" || value === null) {
			throw new Error("Assertion error: Required record field is missing.");
		}
		return value;
	});

function evalAggregations(aggregations: Aggregations, group: readonly PartialResult[]): PartialResult {
	const result: PartialResult = {};

	for (const {key, aggregate} of aggregations) {
		const values = group.map((record) => record[aggregate.key.field]);

		switch (aggregate.type) {
			case "avg": {
				const decimals = assertNumbers(values).map((value) => new Decimal(value));
				const sum = decimals.reduce((a, b) => a.add(b), new Decimal(0));
				const avg = sum.toNumber() / decimals.length;
				result[key.value] = Number(avg.toFixed(2));
				break;
			}
			case "max":
				result[key.value] = Math.max(...assertNumbers(values));
				break;
			case "min":
				result[key.value] = Math.min(...assertNumbers(values));
				break;
			case "sum": {
				const sum = assertNumbers(values).reduce((a, b) => a + b, 0);
				result[key.value] = Number(sum.toFixed(2));
				break;
			}
			case "count":
				result[key.value] = new Set(assertNotNulls(values)).size;
				break;
		}
	}

	return result;
}

function sortByOrder(order: Order | undefined, sections: readonly PartialResult[]): readonly PartialResult[] {
	const cloned = [...sections] as InsightResult[];
	if (order !== undefined) {
		cloned.sort(getComparator(order));
	}
	return cloned;
}

function getComparator(order: Order): (a: PartialResult, b: PartialResult) => number {
	if (order.type === "simple") {
		return (a, b) => {
			const valA = a[order.key.value];
			const valB = b[order.key.value];
			if (valA === undefined || valB === undefined) {
				throw new Error("Assertion error: ORDER key not found.");
			}
			if (valA > valB) {
				return 1;
			}
			if (valA < valB) {
				return -1;
			}
			return 0;
		};
	}

	const greater = order.direction === "ascending" ? 1 : -1;

	return (a, b) => {
		for (const key of order.keys) {
			const valA = a[key.value];
			const valB = b[key.value];
			if (valA === undefined || valB === undefined) {
				throw new Error("Assertion error: ORDER key not found.");
			}
			if (valA > valB) {
				return greater;
			}
			if (valA < valB) {
				return -greater;
			}
		}
		return 0;
	};
}

/**
 * Returns the elements of the array that meet the condition in the predicate but never
 * more than `limit` elements.
 *
 * @param predicate The predicate function
 * @param array The source array
 * @param limit The maximum number of results to be returned
 * @returns An array of no more than `limit` elements
 * @throws {ResultTooLargeError}
 * Throws if the filter would result in more than `limit` elements meeting the predicate.
 */
function filterWithLimit<T>(
	predicate: (value: T, index: number, array: readonly T[]) => boolean,
	array: readonly T[],
	limit: number
): readonly T[] {
	let count = 0;
	return array.filter((value, index) => {
		const result = predicate(value, index, array);
		if (result) {
			count++;
		}
		if (count > limit) {
			throw new ResultTooLargeError("Too many records in query result.");
		}
		return result;
	});
}

function evalEQ(filter: Equal, record: PartialResult): boolean {
	return assertNumber(record[filter.key.field]) === filter.value;
}

function evalLT(filter: Lesser, record: PartialResult): boolean {
	return assertNumber(record[filter.key.field]) < filter.value;
}

function evalGT(filter: Greater, record: PartialResult): boolean {
	return assertNumber(record[filter.key.field]) > filter.value;
}

function evalIS(filter: Like, record: PartialResult): boolean {
	const {key, value} = filter;
	const start = filter.value.startsWith("*");
	const end = filter.value.endsWith("*");

	const recordField = assertString(record[key.field]);

	if (start && end) {
		return recordField.includes(value.slice(1, -1));
	} else if (start) {
		return recordField.endsWith(value.slice(1));
	} else if (end) {
		return recordField.startsWith(value.slice(0, -1));
	} else {
		return recordField === value;
	}
}

function evalNOT(filter: Not, record: PartialResult): boolean {
	return !evalFilter(filter.filter, record);
}

function evalAND(filter: And, record: PartialResult): boolean {
	return filter.filters.every((f) => evalFilter(f, record));
}

function evalOR(filter: Or, record: PartialResult): boolean {
	return filter.filters.some((f) => evalFilter(f, record));
}

function evalFilter(filter: Filter | None, record: PartialResult): boolean {
	switch (filter.type) {
		case "eq":
			return evalEQ(filter, record);
		case "lt":
			return evalLT(filter, record);
		case "gt":
			return evalGT(filter, record);
		case "is":
			return evalIS(filter, record);
		case "not":
			return evalNOT(filter, record);
		case "and":
			return evalAND(filter, record);
		case "or":
			return evalOR(filter, record);
		case "none":
			return true;
	}
}
