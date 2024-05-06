import {InsightDatasetKind, InsightError} from "../controller/IInsightFacade";
import {Node, Element, Document} from "parse5/dist/tree-adapters/default";
import JSZip from "jszip";
import {parse} from "parse5";
import {Room} from "./Room";
import * as fs from "fs-extra";
import * as http from "http";
import {BuildingData, RoomData, GeoResponse} from "./RoomHandlerInterfaces";

/**
 * A class that compactly holds all the information required to create a room
 */
class Data {
	public zippedContent: JSZip;
	public buildingPathsArray: string[];
	public buildingDataMap: Map<string, BuildingData>;
	public roomDataMap: Map<string, RoomData[]>;
	public geoLocation: Map<string, GeoResponse>;

	constructor(zippedContent: JSZip) {
		this.zippedContent = zippedContent;
		this.buildingPathsArray = [];
		this.buildingDataMap = new Map();
		this.roomDataMap = new Map();
		this.geoLocation = new Map();
	}
}

/**
 * Creates information for the rooms based on the content
 *
 * @param content The base64 encoded string that represents the data/zip file
 * @param datasetPath The directory path
 */
export async function processContentRooms(content: string, datasetPath: string) {
	try {
		const zippedContent = await JSZip.loadAsync(content, {base64: true});
		let data: Data = new Data(zippedContent);
		await processIndex(data);
		// Error check if there are any valid rooms
		await processBuildings(data);
		await getGeolocation(data);
		return await handleRoomsData(data, datasetPath);
	} catch (err) {
		return Promise.reject(new InsightError("Some error occurred in handling data")); // error handling
	}
}

/**
 * Parses the index.htm file inside content
 *
 * @param data The data structure/object that stores all the information to create rooms
 */
async function processIndex(data: Data) {
	let indexPromise: Promise<string> | undefined = data.zippedContent.file("index.htm")?.async("string");
	let index: string;
	if (indexPromise === undefined) {
		throw new Error("index.htm does not exist");
	}
	index = await indexPromise;
	let parsedIndex = parse(index);
	traverseIndexFindTable(parsedIndex, data);
}

/**
 * A DFS traversal of the html tree that finds the table of buildings
 *
 * @param root Is the root node of the tree representation of the index.htm file
 * @param data The data structure/object that stores all the information to create rooms
 */
function traverseIndexFindTable(root: Document, data: Data) {
	let stack: Node[] = [root];
	while (stack.length !== 0) {
		let node = stack.pop();
		if (node === undefined) {
			break;
		} else if (node.nodeName === "tbody") {
			for (const row of node.childNodes) {
				if (row.nodeName === "tr") {
					traverseIndexTableRows(row, data);
				}
			}
			break;
		} else {
			if ("childNodes" in node) {
				for (const child of node.childNodes) {
					stack.push(child);
				}
			}
		}
	}
}

/**
 * A DFS traversal of a row from the table of buildings found in the index.htm tree representation
 * Stores the information found within {@param data}
 *
 * @param root A table row node
 * @param data The data structure/object that stores all the information to create rooms
 */
function traverseIndexTableRows(root: Element, data: Data) {
	const buildingData: BuildingData = {
		fullname: "",
		shortname: "",
		address: "",
		href: "",
	};
	let stack: Element[] = [];
	for (const child of root.childNodes) {
		if (child.nodeName === "td") {
			stack.push(child);
		}
	}
	while (stack.length !== 0) {
		let node = stack.shift();
		if (node === undefined) {
			break;
		} else if (node.nodeName === "td") {
			for (const attribute of node.attrs) {
				if (attribute.value === "views-field views-field-title") {
					buildingData.fullname = getNestedInformation(node) ?? "unknown";
				} else if (attribute.value === "views-field views-field-field-building-code") {
					buildingData.shortname = getShallowInformation(node) ?? "unknown";
				} else if (attribute.value === "views-field views-field-field-building-address") {
					buildingData.address = getShallowInformation(node) ?? "unknown";
				} else if (attribute.value === "views-field views-field-nothing") {
					buildingData.href = getHref(node) ?? "unknown";
					data.buildingPathsArray.push(buildingData.href.substring(2));
				}
			}
		}
	}

	data.buildingDataMap.set(buildingData.fullname, buildingData);
}

/**
 * Parses each buildings' html file into tree representations
 * using the buildingPathsArray gathered from traversing index.htm
 *
 * @param data The data structure/object that stores all the information to create rooms
 */
async function processBuildings(data: Data) {
	let buildingPromises: Array<Promise<string>> = [];
	for (const path of data.buildingPathsArray) {
		let buildingPromise = data.zippedContent.file(path)?.async("string");
		if (buildingPromise === undefined) {
			throw new Error("This building does not exist");
		} else {
			buildingPromises.push(buildingPromise);
		}
	}
	let buildings: string[] = await Promise.all(buildingPromises);
	let buildingRoots = buildings.map((building) => parse(building));
	let buildingNames = [...data.buildingDataMap.keys()];
	buildingRoots.forEach(function (buildingRoot, index) {
		traverseBuildingFindTable(buildingRoot, data, buildingNames[index]);
	});
}

/**
 * Uses a DFS traversal to traverse a building.htm file.
 * Finds the table of rooms listed, if there are any, then calls another traversal for each table row
 *
 * @param root Is the root node of a tree representation of a building.htm file
 * @param data The data structure/object that stores all the information to create rooms
 * @param buildingName The building's name to keep track of which file it is traversing
 */
function traverseBuildingFindTable(root: Document, data: Data, buildingName: string) {
	let stack: Node[] = [root];
	let rooms: RoomData[] = [];
	while (stack.length !== 0) {
		let node = stack.pop();
		if (node === undefined) {
			break;
		} else if (node.nodeName === "tbody") {
			for (const row of node.childNodes) {
				if (row.nodeName === "tr") {
					traverseBuildingTableRows(row, rooms);
				}
			}
			data.roomDataMap.set(buildingName, rooms);
			break;
		} else {
			if ("childNodes" in node) {
				for (const child of node.childNodes) {
					stack.push(child);
				}
			}
		}
	}
}

/**
 * Uses DFS traversal to gather information about each room and stores it in @param rooms
 * Stores the information found with {@param rooms}
 *
 * @param root Is the table row node of the table of rooms listed in the building
 * @param rooms An array of tuples containing information about each room
 */
function traverseBuildingTableRows(root: Element, rooms: RoomData[]) {
	const room: RoomData = {
		number: "",
		type: "",
		furniture: "",
		seats: 0,
		href: "",
	};
	let stack: Element[] = [];
	for (const child of root.childNodes) {
		if (child.nodeName === "td") {
			stack.push(child);
		}
	}
	while (stack.length !== 0) {
		let node = stack.shift();
		if (node === undefined) {
			break;
		} else if (node.nodeName === "td") {
			for (const attribute of node.attrs) {
				if (attribute.value === "views-field views-field-field-room-number") {
					room.number = getNestedInformation(node) ?? "unknown";
				} else if (attribute.value === "views-field views-field-field-room-furniture") {
					room.furniture = getShallowInformation(node) ?? "unknown";
				} else if (attribute.value === "views-field views-field-field-room-type") {
					room.type = getShallowInformation(node) ?? "unknown";
				} else if (attribute.value === "views-field views-field-field-room-capacity") {
					room.seats = Number(getShallowInformation(node) ?? "0");
				} else if (attribute.value === "views-field views-field-nothing") {
					room.href = getHref(node) ?? "unknown";
				}
			}
		}
	}
	rooms.push(room);
}

/**
 * Sends a GET request to get the lon(gitude) and lat(itude) of each building
 *
 * @param data The data structure/object that stores all the information to create rooms
 */
async function getGeolocation(data: Data) {
	let baseURL = "http://cs310.students.cs.ubc.ca:11316/api/v1/project_team194/";
	let geoResponsesPromises: Array<Promise<GeoResponse>> = [];
	for (const buildingName of data.roomDataMap.keys()) {
		let buildingData = data.buildingDataMap.get(buildingName);
		if (buildingData === undefined) {
			throw new Error("This building does not exist");
		}
		let encodedBuildingAddress = encodeURIComponent(buildingData.address);
		let URL = baseURL.concat(encodedBuildingAddress);
		let geoResponse = sendHttpRequest(URL);
		geoResponsesPromises.push(geoResponse);
	}
	let geoResponses = await Promise.all(geoResponsesPromises);
	let i = 0;
	for (const buildingName of data.roomDataMap.keys()) {
		data.geoLocation.set(buildingName, geoResponses[i]);
		i++;
	}
}

/**
 * I honestly couldn't tell you how this works cuz a TA basically gave this to me when I was on the brink of tears
 *
 * @param encodedURL The URL to send the request to
 */
function sendHttpRequest(encodedURL: string): Promise<GeoResponse> {
	// const http = require("node:http");
	return new Promise(function (myResolve, myReject) {
		http.get(encodedURL, (res) => {
			const {statusCode} = res;
			const contentType = res.headers["content-type"];

			let error;
			// Any 2xx status code signals a successful response but
			// here we're only checking for 200.
			if (statusCode !== 200) {
				error = new Error("Request Failed.\n" + `Status Code: ${statusCode}`);
			} else if (!/^application\/json/.test(contentType ?? "")) {
				error = new Error("Invalid content-type.\n" + `Expected application/json but received ${contentType}`);
			}
			if (error) {
				// Consume response data to free up memory
				res.resume();
				myReject(error.message);
				return;
			}

			res.setEncoding("utf8");
			let rawData = "";
			res.on("data", (chunk: any) => {
				rawData += chunk;
			});
			res.on("end", () => {
				try {
					const parsedData = JSON.parse(rawData);
					myResolve(parsedData);
				} catch (e: any) {
					myReject(e.message);
				}
			});
		}).on("error", (e: any) => {
			myReject(e.message);
		});
	});
}

/**
 * Combines all the information gathered from the dataset and combines them into Room objects
 *
 * @param data The data structure/object that stores all the information to create rooms
 * @param datasetPath Is the directory path
 * @returns [Room[], InsightDatasetKind.Rooms]
 */
async function handleRoomsData(data: Data, datasetPath: string) {
	let rooms: Room[] = [];
	for (const buildingFullName of data.roomDataMap.keys()) {
		let buildingData = data.buildingDataMap.get(buildingFullName);
		let geoLocation = data.geoLocation.get(buildingFullName);
		if (buildingData === undefined || geoLocation === undefined) {
			throw new Error("Either this building or geo location does not exist");
		}
		if (geoLocation.lat === undefined || geoLocation.lon === undefined) {
			throw new Error("Something went wrong when retrieving the lat and lon");
		}
		let roomDataList = data.roomDataMap.get(buildingFullName);
		if (roomDataList === undefined) {
			throw new Error(`The rooms for ${buildingFullName} do not exist`);
		}
		for (const roomData of roomDataList) {
			let newRoom: Room = new Room(
				buildingData.fullname,
				buildingData.shortname,
				roomData.number,
				buildingData.shortname + "_" + roomData.number,
				buildingData.address,
				geoLocation.lat,
				geoLocation.lon,
				roomData.seats,
				roomData.type,
				roomData.furniture,
				roomData.href
			);
			rooms.push(newRoom);
		}
	}
	let dataSet: [Room[], InsightDatasetKind] = [rooms, InsightDatasetKind.Rooms];
	await fs.outputJson(datasetPath, dataSet);
	return dataSet;
}

/**
 * Retrieves information from a table cell that is contained within its many children
 * Used for getting roomNumber and fullName
 *
 * @param node The table cell containing the href
 */
function getNestedInformation(node: Element): string | undefined {
	for (const child of node.childNodes) {
		if (child.nodeName === "a") {
			return getShallowInformation(child);
		}
	}
}

/**
 * Retrieves information from a table cell that is contained within its singular child
 * Used for shortName, address, type, furniture, seats
 *
 * @param node The table cell containing the href
 */
function getShallowInformation(node: Element): string | undefined {
	const textNode = node.childNodes[0];
	if ("value" in textNode) {
		return textNode.value.trim();
	}
}

/**
 *
 * @param node The table cell containing the href
 * @param data The data structure/object that stores all the information to create rooms
 */
function getHref(node: Element): string | undefined {
	for (const child of node.childNodes) {
		if (child.nodeName === "a") {
			for (const attribute of child.attrs) {
				if (attribute.name === "href") {
					return attribute.value;
				}
			}
		}
	}
}
