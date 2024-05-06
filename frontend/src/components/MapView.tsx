import {
	RouteMatch,
	useNavigate,
	useRouter,
	useSearch,
} from "@tanstack/react-router";
import { FeatureVisibility, Map, Marker } from "mapkit-react";
import { unique } from "radash";
import { z } from "zod";
import { initialMapRegion } from "../constants";
import { getMapKit } from "../mapkit";
import { Building } from "../model";

const CurrentBuildingContext = z.object({
	currentBuilding: z.string(),
});

function useCurrentBuilding() {
	const router = useRouter();
	return router.state.matches.reduce(currentBuildingReducer, undefined);
}

function currentBuildingReducer(
	acc: string | undefined,
	match: RouteMatch,
): string | undefined {
	const parsed = CurrentBuildingContext.safeParse(match.routeContext);
	if (!parsed.success) return acc;
	return parsed.data.currentBuilding;
}

export interface MapViewParams {
	buildings: Building[];
}

export default function MapView({ buildings }: MapViewParams) {
	const navigate = useNavigate();
	const search = useSearch({ from: "/_select" });
	const currentBuilding = useCurrentBuilding();

	const selectedBuildings = unique(
		search.roomNames.map((room) => room.split("_")[0]),
	);

	return (
		<Map
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
					selected={building.shortname === currentBuilding}
					color={
						selectedBuildings.includes(building.shortname)
							? "#4169e1"
							: "#ff5b40"
					}
					onSelect={() =>
						navigate({
							to: "/buildings/$buildingId",
							params: { buildingId: building.shortname },
							search: true,
						})
					}
					onDeselect={() =>
						navigate({
							to: "/",
							search: true,
						})
					}
				/>
			))}
		</Map>
	);
}
