import { queryOptions } from "@tanstack/react-query";
import { notFound } from "@tanstack/react-router";
import { all, objectify, tryit, zip } from "radash";
import { z } from "zod";
import { getMapKitWithLibraries, getRoute } from "./mapkit";
import { Building, Room } from "./model";

function QueryResponse<const T extends z.ZodTypeAny>(record: T) {
	return z.object({
		result: z.array(record),
	});
}

const ErrorResponse = z.object({
	error: z.string(),
});

function createQueryFnMany<const T extends z.ZodTypeAny>(
	record: T,
	query: unknown,
) {
	return async () => {
		const requestBody = JSON.stringify(query);
		const response = await fetch("http://localhost:4321/query", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: requestBody,
		});

		if (!response.ok) {
			try {
				const json = await response.json();
				const errorResponse = ErrorResponse.parse(json);
				return Promise.reject(
					new Error(`Request failed: ${errorResponse.error}`),
				);
			} catch {
				throw new Error(`Request failed: ${response.status}`);
			}
		}

		const [err, json] = await tryit(response.json.bind(response))();
		if (err) {
			throw new Error(`Request failed: ${err}`);
		}

		const queryResponse = QueryResponse(record).safeParse(json);

		if (!queryResponse.success) {
			throw new Error(`Request failed: ${queryResponse.error}`);
		}

		return queryResponse.data.result;
	};
}

function createQueryFnOne<const T extends z.ZodTypeAny>(
	record: T,
	query: unknown,
) {
	const many = createQueryFnMany(record, query);
	return async () => {
		const results = await many();
		if (results.length === 0) {
			throw notFound();
		}
		if (results.length > 1) {
			throw new Error(
				"Request failed: Query for one record returned more than one result",
			);
		}
		return results[0];
	};
}

export function getBuildingById(buildingId: string) {
	return queryOptions({
		queryKey: ["building", buildingId],
		queryFn: createQueryFnOne(Building, {
			WHERE: {
				IS: {
					rooms_shortname: buildingId,
				},
			},
			OPTIONS: {
				COLUMNS: [
					"rooms_fullname",
					"rooms_shortname",
					"rooms_lat",
					"rooms_lon",
					"rooms_address",
				],
			},
			TRANSFORMATIONS: {
				GROUP: [
					"rooms_fullname",
					"rooms_shortname",
					"rooms_lat",
					"rooms_lon",
					"rooms_address",
				],
				APPLY: [],
			},
		}),
	});
}

export function getBuildings() {
	return queryOptions({
		queryKey: ["buildings"],
		queryFn: createQueryFnMany(Building, {
			WHERE: {},
			OPTIONS: {
				COLUMNS: [
					"rooms_fullname",
					"rooms_shortname",
					"rooms_lat",
					"rooms_lon",
					"rooms_address",
				],
			},
			TRANSFORMATIONS: {
				GROUP: [
					"rooms_fullname",
					"rooms_shortname",
					"rooms_lat",
					"rooms_lon",
					"rooms_address",
				],
				APPLY: [],
			},
		}),
	});
}

export function getRoomByName(name: string) {
	return queryOptions({
		queryKey: ["room", name],
		queryFn: createQueryFnOne(Room, {
			WHERE: {
				IS: {
					rooms_name: name,
				},
			},
			OPTIONS: {
				COLUMNS: [
					"rooms_fullname",
					"rooms_shortname",
					"rooms_number",
					"rooms_name",
					"rooms_address",
					"rooms_lat",
					"rooms_lon",
					"rooms_seats",
					"rooms_type",
					"rooms_furniture",
					"rooms_href",
				],
			},
		}),
	});
}

export function getRoomsByBuilding(buildingShortname: string) {
	return queryOptions({
		queryKey: ["building", buildingShortname, "rooms"],
		queryFn: createQueryFnMany(Room, {
			WHERE: {
				IS: {
					rooms_shortname: buildingShortname,
				},
			},
			OPTIONS: {
				COLUMNS: [
					"rooms_fullname",
					"rooms_shortname",
					"rooms_number",
					"rooms_name",
					"rooms_address",
					"rooms_lat",
					"rooms_lon",
					"rooms_seats",
					"rooms_type",
					"rooms_furniture",
					"rooms_href",
				],
			},
		}),
	});
}

export function getRoomsByNames(roomNames: string[]) {
	return queryOptions({
		queryKey: ["rooms", roomNames],
		queryFn: async () => {
			if (roomNames.length === 0) {
				return [];
			}
			const rooms = await createQueryFnMany(Room, {
				WHERE: {
					OR: roomNames.map((name) => ({
						IS: {
							rooms_name: name,
						},
					})),
				},
				OPTIONS: {
					COLUMNS: [
						"rooms_fullname",
						"rooms_shortname",
						"rooms_number",
						"rooms_name",
						"rooms_address",
						"rooms_lat",
						"rooms_lon",
						"rooms_seats",
						"rooms_type",
						"rooms_furniture",
						"rooms_href",
					],
				},
			})();
			const roomsMap = objectify(rooms, (room) => room.name);
			return roomNames.map((name) => roomsMap[name]);
		},
	});
}

export interface MiddleRoute {
	type: "middle";
	room: Room;
	route: mapkit.Route;
}

export interface EndRoute {
	type: "end";
	room: Room;
}

export type Route = MiddleRoute | EndRoute;

export function getRoutes(rooms: Room[]) {
	return queryOptions({
		queryKey: ["route", rooms],
		queryFn: async (): Promise<Route[]> => {
			if (rooms.length < 2 || rooms.length > 5) {
				throw new Error(
					"Can't get a route for less than 2 or greater than 5 rooms.",
				);
			}

			const mk = await getMapKitWithLibraries(["services", "overlays"]);

			const coordinatesOf = (room: Room) =>
				new mk.Coordinate(room.lat, room.lon);

			const pairs = zip(rooms.slice(0, -1), rooms.slice(1));

			const directions = new mk.Directions();

			const routes: MiddleRoute[] = await all(
				pairs.map(async ([origin, destination]) => {
					const response = await getRoute(directions, {
						origin: coordinatesOf(origin),
						destination: coordinatesOf(destination),
						requestsAlternateRoutes: false,
						transportType: mk.Directions.Transport.Walking,
					});
					return {
						type: "middle",
						room: origin,
						route: response.routes[0],
					} as const;
				}),
			);

			return [
				...routes,
				{
					type: "end",
					room: rooms.at(-1)!,
				},
			];
		},
	});
}
