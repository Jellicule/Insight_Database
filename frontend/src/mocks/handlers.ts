import {http, HttpResponse, PathParams} from "msw";
import dataset from "./dataset.json";
import {evalQuery} from "./interpreter/Interpreter";
import {parseQuery} from "./parser/Parser";
import {InsightDatasetKind} from "./QueryTypes";

interface QueryResponseOk {
	result: unknown[];
}

interface QueryResponseError {
	error: string;
}

type QueryResponse = QueryResponseOk | QueryResponseError;

export const handlers = [
	http.post<PathParams, Record<string, unknown>, QueryResponse>("http://localhost:4321/query", async ({request}) => {
		const input = await request.json();
		// console.log(input);
		const query = parseQuery(input);
		if (query.kind !== InsightDatasetKind.Rooms) {
			return HttpResponse.json({error: "Only rooms queries are supported"}, {status: 500});
		}
		const result = evalQuery(query, dataset);
		// console.log(result);
		return HttpResponse.json({
			result,
		});
	}),
];
