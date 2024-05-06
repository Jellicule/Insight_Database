import {InsightDatasetKind} from "../controller/IInsightFacade";

export interface Key<T extends "string" | "number"> {
	type: T;
	value: string;
	field: string;
}

export interface NumberKey {
	type: "number";
	value: string;
	field: string;
}

export interface StringKey {
	type: "string";
	value: string;
	field: string;
}

export type AnyKey = NumberKey | StringKey;

export type KeyList = [AnyKey, ...AnyKey[]];

export interface Greater {
	type: "gt";
	key: NumberKey;
	value: number;
}

export interface Lesser {
	type: "lt";
	key: NumberKey;
	value: number;
}

export interface Equal {
	type: "eq";
	key: NumberKey;
	value: number;
}

export interface Like {
	type: "is";
	key: StringKey;
	value: string;
}

export interface Not {
	type: "not";
	filter: Filter;
}

export interface And {
	type: "and";
	filters: [Filter, ...Filter[]];
}

export interface Or {
	type: "or";
	filters: [Filter, ...Filter[]];
}

export interface None {
	type: "none";
}

export type Filter = Greater | Lesser | Equal | Like | Not | And | Or;

export interface Max {
	type: "max";
	key: NumberKey;
}

export interface Min {
	type: "min";
	key: NumberKey;
}

export interface Avg {
	type: "avg";
	key: NumberKey;
}

export interface Sum {
	type: "sum";
	key: NumberKey;
}

export interface Count {
	type: "count";
	key: AnyKey;
}

export type Aggregate = Max | Min | Avg | Sum | Count;

export interface Aggregation {
	key: NumberKey;
	aggregate: Aggregate;
}

export type Aggregations = Aggregation[];

export type Direction = "ascending" | "descending";

export interface SimpleOrder {
	type: "simple";
	key: AnyKey;
}

export interface ComplexOrder {
	type: "complex";
	keys: KeyList;
	direction: Direction;
}

export type Order = SimpleOrder | ComplexOrder;

export interface Options {
	columns: KeyList;
	order: Order | undefined;
}

export interface Transformation {
	groupBy: KeyList;
	aggregations: Aggregations;
}

export interface StandardQuery {
	dataset: string;
	kind: InsightDatasetKind;
	columns: KeyList;
	filter: Filter | None;
	order: Order | undefined;
	transformation: undefined;
}

export interface AggregateQuery {
	dataset: string;
	kind: InsightDatasetKind;
	columns: KeyList;
	filter: Filter | None;
	order: Order | undefined;
	transformation: Transformation;
}

export type Query = StandardQuery | AggregateQuery;
