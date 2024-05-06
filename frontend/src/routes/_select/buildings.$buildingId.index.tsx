import { PlusCircleIcon } from "@heroicons/react/24/outline";
import {
	ArrowLeftCircleIcon,
	BuildingOfficeIcon,
	CheckCircleIcon,
} from "@heroicons/react/24/solid";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { toggle } from "radash";
import { RoomCard } from "../../components/RoomCard";
import { Building } from "../../model";
import { getRoomsByBuilding } from "../../queries";

export const Route = createFileRoute("/_select/buildings/$buildingId/")({
	beforeLoad: ({ params }) => ({ currentBuilding: params.buildingId }),
	component: BuildingRooms,
	loader: ({ context, params }) =>
		context.queryClient.ensureQueryData(
			getRoomsByBuilding(params.buildingId),
		),
});

function BuildingRooms() {
	const { roomNames } = Route.useSearch();
	const { buildingId } = Route.useParams();

	const roomsQuery = useSuspenseQuery(getRoomsByBuilding(buildingId));

	const rooms = roomsQuery.data;
	const building: Building = rooms[0];

	return (
		<>
			<header className="mb-8">
				{roomNames.length >= 5 && (
					<p className="mb-4 rounded-lg border-2 border-yellow-300 bg-yellow-50 p-2 text-center text-sm text-yellow-800">
						Since you have already added 5 rooms, adding more will
						prevent you from finding a route.
					</p>
				)}
				<span className="flex justify-between">
					<Link from={Route.fullPath} to="/" search={true}>
						<ArrowLeftCircleIcon className="size-8" />
					</Link>
				</span>
				<BuildingOfficeIcon className="mx-auto size-16" />
				<h3 className="text-center text-3xl font-bold">
					{building.fullname}
				</h3>
				<h4 className="text-center font-semibold text-gray-500">
					{building.address}
				</h4>
			</header>
			<section>
				<ul>
					{rooms.map((room) => (
						<li key={room.name}>
							<RoomCard withDetails room={room}>
								<Link
									from={Route.fullPath}
									search={{
										roomNames: toggle(
											[...roomNames],
											room.name,
										),
									}}
									preload={false}
								>
									{roomNames.includes(room.name) ? (
										<CheckCircleIcon className="size-8 p-1 text-blue-600" />
									) : (
										<PlusCircleIcon className="size-8 p-1" />
									)}
								</Link>
							</RoomCard>
						</li>
					))}
				</ul>
			</section>
		</>
	);
}
