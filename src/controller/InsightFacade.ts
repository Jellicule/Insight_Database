import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
} from "./IInsightFacade";
import * as fs from "fs-extra";
import {Section} from "../sections/Section";
import {Room} from "../rooms/Room";
import {processContentSections} from "../sections/SectionHandler";
import {processContentRooms} from "../rooms/RoomHandler";
import {SectionInternal} from "../interpreter/SectionInternal";
import path from "path";
import {RoomInternal} from "../interpreter/RoomInternal";
import {parseQuery} from "../parser/Parser";
import {evalQuery} from "../interpreter/Interpreter";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	private static DATA_DIR = path.join(".", "data");
	private dataSets: Map<string, [Array<Section | Room>, InsightDatasetKind]>;

	constructor() {
		this.dataSets = new Map<string, [Array<Section | Room>, InsightDatasetKind]>();
	}

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		if (id.includes("_") || id.trim().length === 0) {
			throw new InsightError("id is invalid");
		}

		// Check if the id is valid or if a dataset with this id has been added already
		if (await fs.pathExists(this.getDatasetPath(id))) {
			throw new InsightError("A dataset with this id has been added already");
		}
		const datasetPath = this.getDatasetPath(id);
		try {
			let dataSet: [any[], InsightDatasetKind];
			if (kind === InsightDatasetKind.Sections) {
				dataSet = await processContentSections(content, datasetPath);
				this.dataSets.set(id, dataSet);
			} else if (kind === InsightDatasetKind.Rooms) {
				dataSet = await processContentRooms(content, datasetPath);
				this.dataSets.set(id, dataSet);
			}
		} catch (err: any) {
			return Promise.reject(new InsightError(err.message));
		}
		let arr: string[] = [];
		for (const value of this.dataSets.keys()) {
			arr.push(value);
		}
		return arr;
	}

	public async removeDataset(id: string): Promise<string> {
		if (id.includes("_") || id.trim().length === 0) {
			throw new InsightError("id is invalid");
		}

		const datasetPath = this.getDatasetPath(id);
		if (!(await fs.pathExists(datasetPath))) {
			throw new NotFoundError(`Dataset ID ${id} not found.`);
		}

		await fs.remove(datasetPath);
		this.dataSets.delete(id);

		return id;
	}

	public async listDatasets(): Promise<InsightDataset[]> {
		let fileNames: string[];
		try {
			fileNames = await fs.readdir(InsightFacade.DATA_DIR);
		} catch (err: unknown) {
			if (!(err instanceof Error) || (err as NodeJS.ErrnoException).code !== "ENOENT") {
				throw err;
			}
			return [];
		}

		const ids = fileNames.map((name) => name.slice(0, -5));
		return await Promise.all(
			ids.map((id) =>
				this.get(id).then((dataset) => ({
					id,
					kind: dataset[1],
					numRows: dataset[0].length,
				}))
			)
		);
	}

	/**
	 * Gets the path to where a dataset with the given id would be saved.
	 *
	 * @param id A dataset id
	 * @returns The path to where the dataset with the given id should be saved
	 * @throws {Error}
	 * Throws if the resolved path is outside the data directory, such as when the id contains "../".
	 */
	private getDatasetPath(id: string): string {
		const datasetPath = path.join(InsightFacade.DATA_DIR, `${id}.json`);

		// Checks if the dataset path isn't in the data directory.
		if (path.relative(InsightFacade.DATA_DIR, path.dirname(datasetPath)) !== "") {
			throw new Error("Assertion failed: Dataset path is outside the data directory.");
		}

		return datasetPath;
	}

	/**
	 * Retreives the data from the dataset with the given id from the filesystem.
	 *
	 * @param id The dataset id
	 * @returns An array of sections or rooms
	 * @throws {InsightError}
	 * Throws if a matching dataset has not been added.
	 */
	private async getFromFilesystem(id: string): Promise<[Array<Section | Room>, InsightDatasetKind]> {
		const datasetPath = this.getDatasetPath(id);
		let rawDatas: [Array<Section | Room>, InsightDatasetKind];
		try {
			rawDatas = await fs.readJson(datasetPath);
		} catch (err: unknown) {
			if (!(err instanceof Error) || (err as NodeJS.ErrnoException).code !== "ENOENT") {
				throw err;
			}
			throw new InsightError(`Dataset ID ${id} not found.`);
		}

		let newData = rawDatas[0].map((rawData) => {
			let data;
			if (rawDatas[1] === InsightDatasetKind.Sections) {
				data = Object.create(Section.prototype);
			} else {
				data = Object.create(Room.prototype);
			}
			Object.assign(data, rawData);
			return data as Section | Room;
		});
		return [newData, rawDatas[1]];
	}

	/**
	 * Retreives the data from the dataset with the given id, either from the filesystem or the cache.
	 *
	 * @param id The dataset id
	 * @returns An tuple of an array of sections or rooms and the kind of the dataset
	 * @throws {InsightError}
	 * Throws if a matching dataset has not been added.
	 */
	private async get(id: string): Promise<[Array<Section | Room>, InsightDatasetKind]> {
		const cached = this.dataSets.get(id);
		if (cached !== undefined) {
			return cached;
		}

		const stored = await this.getFromFilesystem(id);
		this.dataSets.set(id, stored);
		return stored;
	}

	/**
	 * Boundary between the dataset engine and query engine.
	 * This function may be used to retreive the requested dataset, either from disk or memory.
	 *
	 * @param id The ID of the requested dataset
	 * @returns A a list of sections or undefined if the dataset does not exist
	 * @throws {InsightError}
	 * Throws if a matching dataset has not been added or the dataset is not of the requested kind.
	 */
	private async getDataset(id: string, kind: InsightDatasetKind): Promise<SectionInternal[] | RoomInternal[]> {
		let [datasetRecords, datasetKind] = await this.get(id);
		if (datasetKind !== kind) {
			throw new InsightError(`Dataset with id ${id} is not of the requested kind`);
		}

		if (datasetKind === InsightDatasetKind.Sections) {
			return datasetRecords.map((section) => this.sectionAdapter(section as Section));
		} else {
			return datasetRecords.map((room) => this.roomAdapter(room as Room));
		}
	}

	/**
	 * Converts a {@link Section} class into the {@link SectionInternal} object required by the query interpreter.
	 * This function could be removed in the future if these two representations are merged.
	 *
	 * @param section The section representation from the dataset engine
	 * @returns The section representation for the query engine
	 */
	private sectionAdapter(section: Section): SectionInternal {
		return {
			uuid: String(section.uuid),
			id: String(section.id),
			title: String(section.title),
			instructor: String(section.instructor),
			dept: String(section.dept),
			year: Number(section.year),
			avg: Number(section.avg),
			pass: Number(section.pass),
			fail: Number(section.fail),
			audit: Number(section.audit),
		};
	}

	/**
	 * Converts a {@link Section} class into the {@link RoomInternal} object required by the query interpreter.
	 * This function could be removed in the future if these two representations are merged.
	 *
	 * @param room The room representation from the dataset engine
	 * @returns The room representation for the query engine
	 */
	private roomAdapter(room: Room): RoomInternal {
		return {
			fullname: String(room.fullName),
			shortname: String(room.shortName),
			number: String(room.roomNumber),
			name: String(room.roomName),
			address: String(room.address),
			lat: Number(room.latitude),
			lon: Number(room.longitude),
			seats: Number(room.seats),
			type: String(room.roomType),
			furniture: String(room.furniture),
			href: String(room.hrefPath),
		};
	}

	public async performQuery(query: unknown): Promise<InsightResult[]> {
		const parsedQuery = parseQuery(query);
		const dataset = await this.getDataset(parsedQuery.dataset, parsedQuery.kind);
		const results = evalQuery(parsedQuery, dataset);
		return results;
	}
}
