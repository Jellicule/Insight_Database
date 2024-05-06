import {readdirSync, readFile, readJSONSync, rm} from "fs-extra";
import {InsightResult} from "../../src/controller/IInsightFacade";

export interface ITestQueryError {
	title: string;
	input: unknown;
	errorExpected: true;
	expected: string;
}

export interface ITestQuerySuccess {
	title: string;
	input: unknown;
	errorExpected: false;
	ordered: boolean;
	expected: InsightResult[];
}

export type ITestQuery = ITestQueryError | ITestQuerySuccess;

/**
 * The directory where data is persisted.
 *
 * NOTE: this variable should _not_ be referenced from production code.
 */
const persistDir = "./data";

/**
 * Convert a file into a base64 string.
 *
 * @param name  The name of the file to be converted.
 *
 * @return Promise A base 64 representation of the file
 */
export async function getContentFromArchives(name: string): Promise<string> {
	const buffer = await readFile("./test/resources/archives/" + name);
	return buffer.toString("base64");
}

/**
 * Removes all files within the persistDir.
 */
export async function clearDisk(): Promise<void> {
	try {
		await rm(persistDir, {recursive: true, force: true});
	} catch (err: unknown) {
		console.error("WARNING: Failed to clear data directory.", err);
	}
}

/**
 * Searches for test query JSON files in the path.
 * @param path The path to the sample query JSON files.
 */
export function readFileQueries(path: string): ITestQuery[] {
	return readdirSync(`./test/resources/queries/${path}`).map((fileName) =>
		readJSONSync(`./test/resources/queries/${path}/${fileName}`)
	);
}
export async function rawParseContent(name: string): Promise<Buffer> {
	return await readFile("./test/resources/archives/" + name);
}
