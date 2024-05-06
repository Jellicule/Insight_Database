import {InsightDatasetKind} from "../controller/IInsightFacade";
import {AnyKey} from "../types/Intermediate";
import type {Context} from "./Context";

const roomsNumberFields: string[] = ["lat", "lon", "seats"];
const roomsStringFields: string[] = ["fullname", "shortname", "number", "name", "address", "type", "furniture", "href"];

const sectionsNumberFields: string[] = ["avg", "pass", "fail", "audit", "year"];
const sectionsStringFields: string[] = ["dept", "id", "instructor", "title", "uuid"];

const numberFields: string[] = [...sectionsNumberFields, ...roomsNumberFields];
const stringFields: string[] = [...sectionsStringFields, ...roomsStringFields];

const roomsFields: string[] = [...roomsNumberFields, ...roomsStringFields];
const sectionsFields: string[] = [...sectionsNumberFields, ...sectionsStringFields];

const isNumberField = (field: string): boolean => numberFields.includes(field);
const isStringField = (field: string): boolean => stringFields.includes(field);

const isRoomsField = (field: string): boolean => roomsFields.includes(field);
const isSectionsField = (field: string): boolean => sectionsFields.includes(field);

export function parseKey(ctx: Context, input: unknown, supportsAggregations: boolean = false): AnyKey {
	if (typeof input !== "string") {
		throw ctx.failure("Key must be a string.");
	}

	if (supportsAggregations && ctx.aggregationKeys.map((k) => k.value).includes(input)) {
		return {type: "number", field: input, value: input};
	}

	const [id, field] = input.split("_", 2);

	if (id === undefined || id.length === 0) {
		throw ctx.failure("Key must start with a dataset ID.");
	}

	if (id.trim().length === 0) {
		throw ctx.failure("Dataset ID cannot be entirely whitespace.");
	}

	// If a dataset id has already been parsed, it must equal the id of the key being parsed.
	if (ctx.id !== undefined && ctx.id !== id) {
		throw ctx.failure(`QUERY references more than one dataset ("${ctx.id}" and "${id}").`);
	}

	ctx.id = id;

	if (field === undefined) {
		throw ctx.failure("Key must have a field name.");
	}

	if (!isRoomsField(field) && !isSectionsField(field)) {
		throw ctx.failure(`Key must have a valid field name ("${field}" is invalid).`);
	}

	const kind = isRoomsField(field) ? InsightDatasetKind.Rooms : InsightDatasetKind.Sections;

	if (ctx.kind !== undefined && ctx.kind !== kind) {
		throw ctx.failure(`QUERY references more than one kind of record ("${ctx.kind}" and "${kind}").`);
	}

	ctx.kind = kind;

	if (isNumberField(field)) {
		return {
			type: "number",
			field,
			value: input,
		};
	} else {
		return {
			type: "string",
			field,
			value: input,
		};
	}
}
