import { useSuspenseQuery } from "@tanstack/react-query";
import { Outlet, createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import MapView from "../../components/MapView";
import { getBuildings } from "../../queries";

const SelectSearchParams = z.object({
	roomNames: z.array(z.string()).catch([]),
});

type SelectSearchParams = z.infer<typeof SelectSearchParams>;

export const Route = createFileRoute("/_select")({
	component: CompareView,
	validateSearch: SelectSearchParams,
	loader: ({ context }) =>
		context.queryClient.ensureQueryData(getBuildings()),
});

function CompareView() {
	// Force this component to re-render on navigation so that relative links will work.
	Route.useMatch();

	const buildingsQuery = useSuspenseQuery(getBuildings());
	const buildings = buildingsQuery.data;

	return (
		<main className="grid h-full grid-rows-5 overflow-hidden md:grid-cols-3 md:grid-rows-1">
			<aside className="row-span-2 md:col-span-2 md:row-span-1">
				<MapView buildings={buildings} />
			</aside>
			<article className="row-span-3 overflow-y-auto p-4 md:row-span-1 md:p-8">
				<Outlet />
			</article>
		</main>
	);
}
