import {
	ArrowLeftCircleIcon,
	ClockIcon,
	MapIcon,
} from "@heroicons/react/24/solid";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import relativeTime from "dayjs/plugin/relativeTime";
import { FeatureVisibility, Map, Marker } from "mapkit-react";
import { unique } from "radash";
import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { RoomCard } from "../../components/RoomCard";
import { initialMapRegion } from "../../constants";
import { getMapKit } from "../../mapkit";
import { Building } from "../../model";
import { MiddleRoute, getRoomsByNames, getRoutes } from "../../queries";

dayjs.extend(duration);
dayjs.extend(relativeTime);

const SelectedRoomsParams = z.object({
	roomNames: z.array(z.string()).catch([]),
});

type SelectedRoomsParams = z.infer<typeof SelectedRoomsParams>;

export const Route = createFileRoute("/navigate/")({
	component: NavigateRoute,
	validateSearch: SelectedRoomsParams,
	loaderDeps: ({ search: { roomNames } }) => ({ roomNames }),
	loader: async ({ context, deps }) => {
		const rooms = await context.queryClient.fetchQuery(
			getRoomsByNames(deps.roomNames),
		);
		await context.queryClient.ensureQueryData(getRoutes(rooms));
	},
});

function colorForIndex(index: number): string {
	switch (index) {
		case 0:
			return "#c084fc";
		case 1:
			return "#60a5fa";
		case 2:
			return "#4ade80";
		default:
			return "#fbbf24";
	}
}

function NavigateRoute() {
	const { roomNames } = Route.useSearch();
	const roomsQuery = useSuspenseQuery(getRoomsByNames(roomNames));
	const routesQuery = useSuspenseQuery(getRoutes(roomsQuery.data));
	const routes = routesQuery.data;

	const buildings = unique(
		routes.map(
			(route) =>
				({
					fullname: route.room.fullname,
					shortname: route.room.shortname,
					address: route.room.address,
					lat: route.room.lat,
					lon: route.room.lon,
				}) satisfies Building,
		),
		(building) => building.shortname,
	);

	const totalDuration = dayjs
		.duration(
			routes.reduce(
				(acc, route) =>
					"route" in route
						? acc + route.route.expectedTravelTime
						: acc,
				0,
			),
			"s",
		)
		.humanize();

	const [map, setMap] = useState<mapkit.Map | undefined>(undefined);
	const ref = useCallback((instance: mapkit.Map | null) => {
		if (!instance) return;
		setMap(instance);
	}, []);

	useEffect(() => {
		if (!map) {
			return;
		}

		const overlays = routes
			.filter((route): route is MiddleRoute => route.type === "middle")
			.map((route, i) => {
				const overlay = route.route.polyline;
				overlay.style.lineWidth = 3;
				overlay.style.strokeColor = colorForIndex(i);
				return overlay;
			});

		map.addOverlays(overlays);

		return () => {
			map.removeOverlays(overlays);
		};
	}, [map, routes]);

	return (
		<main className="grid h-full grid-rows-5 overflow-hidden md:grid-cols-3 md:grid-rows-1">
			<aside className="row-span-2 md:col-span-2 md:row-span-1">
				<Map
					ref={ref}
					token=""
					load={async () => {
						await getMapKit();
					}}
					initialRegion={initialMapRegion}
					showsCompass={FeatureVisibility.Hidden}
				>
					{buildings.map((building) => (
						<Marker
							key={building.shortname}
							latitude={building.lat}
							longitude={building.lon}
							title={building.shortname}
							subtitle={building.fullname}
							color="#4169e1"
						/>
					))}
				</Map>
			</aside>
			<article className="row-span-3 overflow-y-auto p-4 md:row-span-1 md:p-8">
				<header>
					<span className="flex justify-between">
						<Link from={Route.fullPath} to="/" search={true}>
							<ArrowLeftCircleIcon className="size-8" />
						</Link>
					</span>
					<MapIcon className="mx-auto size-16" />
					<h3 className="text-center text-3xl font-bold">
						Your Route
					</h3>
					<h4 className="text-center font-semibold text-gray-500">
						{totalDuration} total
					</h4>
				</header>
				<section>
					<ul>
						{routes.map((route, i) => {
							if (route.type === "middle") {
								const duration = dayjs
									.duration(
										route.route.expectedTravelTime,
										"s",
									)
									.humanize();
								return (
									<li key={route.room.name}>
										<RoomCard room={route.room} />
										<div className="flex items-center gap-2 px-2">
											<div className="grow border-b-4 border-dotted border-gray-500" />
											<div
												className="flex items-center gap-2"
												style={{
													color: colorForIndex(i),
												}}
											>
												<ClockIcon className="size-4" />
												<p>{duration}</p>
											</div>
											<div className="grow border-b-4 border-dotted border-gray-500" />
										</div>
									</li>
								);
							} else {
								return (
									<li key={route.room.name}>
										<RoomCard room={route.room} />
									</li>
								);
							}
						})}
					</ul>
				</section>
			</article>
		</main>
	);
}
