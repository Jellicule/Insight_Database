import {
	DndContext,
	DragEndEvent,
	DragOverlay,
	DragStartEvent,
	KeyboardSensor,
	PointerSensor,
	closestCenter,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	SortableContext,
	arrayMove,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Transition } from "@headlessui/react";
import { Bars4Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { GlobeAmericasIcon } from "@heroicons/react/24/solid";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import {
	ComponentPropsWithoutRef,
	useCallback,
	useLayoutEffect,
	useState,
} from "react";
import { RoomCard } from "../../components/RoomCard";
import { Room } from "../../model";
import { getRoomsByNames } from "../../queries";

interface DraggableRoomCardProps extends ComponentPropsWithoutRef<"article"> {
	room: Room;
}

function DraggableRoomCard({
	room,
	children,
	...rest
}: DraggableRoomCardProps) {
	const {
		attributes,
		listeners,
		transform,
		transition,
		setNodeRef,
		setActivatorNodeRef,
		isDragging,
	} = useSortable({
		id: room.name,
	});

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	return (
		<li {...rest} ref={setNodeRef} style={style} className="relative">
			<RoomCard
				room={room}
				withDetails={!isDragging}
				className={isDragging ? "opacity-0" : ""}
			>
				{children}
				<Link
					from={Route.fullPath}
					search={({ roomNames }) => ({
						roomNames: roomNames.filter(
							(name) => name != room.name,
						),
					})}
					preload={false}
				>
					<XMarkIcon className="size-8 stroke-2 p-2" />
				</Link>
				<button
					{...listeners}
					{...attributes}
					ref={setActivatorNodeRef}
				>
					<Bars4Icon className="size-8 stroke-2 p-2" />
				</button>
			</RoomCard>
			{isDragging && (
				<div className="absolute inset-1 rounded-lg border border-gray-300" />
			)}
		</li>
	);
}

export const Route = createFileRoute("/_select/")({
	component: SelectBuilding,
	loaderDeps: (opts) => ({ rooms: opts.search.roomNames }),
	loader: (opts) =>
		opts.context.queryClient.ensureQueryData(
			getRoomsByNames(opts.deps.rooms),
		),
});

function roomByName(rooms: Room[], id: string): Room | undefined {
	return rooms.find((room) => room.name === id);
}

function SelectBuilding() {
	const search = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });

	const roomsQuery = useSuspenseQuery(getRoomsByNames(search.roomNames));
	const rooms = roomsQuery.data;

	const [activeRoom, setActiveRoom] = useState<Room | undefined>(undefined);
	const [roomNames, setRoomNames] = useState<string[]>([]);

	useLayoutEffect(() => setRoomNames(search.roomNames), [search.roomNames]);

	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	const handleDragStart = useCallback(
		({ active }: DragStartEvent) => {
			setActiveRoom(roomByName(rooms, active.id as string));
		},
		[rooms],
	);

	const handleDragEnd = useCallback(
		({ active, over }: DragEndEvent) => {
			setActiveRoom(undefined);
			if (!over || active.id === over.id) {
				return;
			}
			const oldIndex = roomNames.indexOf(active.id as string);
			const newIndex = roomNames.indexOf(over.id as string);
			const newRoomNames = arrayMove(roomNames, oldIndex, newIndex);
			setRoomNames(newRoomNames);
			navigate({
				search: {
					roomNames: newRoomNames,
				},
			});
		},
		[navigate, roomNames],
	);

	return (
		<div className="flex h-full flex-col gap-8">
			<header>
				<span className="flex justify-between text-gray-500">
					<p>
						<span
							className={
								roomNames.length > 5 ? "text-red-500" : ""
							}
						>
							{roomNames.length}
						</span>
						/5
					</p>
					<Link
						from={Route.fullPath}
						preload={false}
						search={{
							roomNames: [],
						}}
					>
						Clear
					</Link>
				</span>
				<GlobeAmericasIcon className="mx-auto size-16" />
				<h3 className="text-center text-3xl font-bold">
					Campus Explorer
				</h3>
				<h4 className="text-center font-semibold text-gray-500">
					Choose a building to add more rooms
				</h4>
			</header>
			<section className="grow overflow-y-auto">
				<ul>
					<DndContext
						sensors={sensors}
						collisionDetection={closestCenter}
						onDragStart={handleDragStart}
						onDragEnd={handleDragEnd}
					>
						<SortableContext
							items={roomNames}
							strategy={verticalListSortingStrategy}
						>
							{roomNames.map((name) => {
								const room = roomByName(rooms, name);
								if (room === undefined) return null;
								return (
									<DraggableRoomCard key={name} room={room} />
								);
							})}
						</SortableContext>
						<DragOverlay wrapperElement="li">
							<Transition
								appear
								show={!!activeRoom}
								className="relative"
							>
								<RoomCard room={activeRoom!}>
									<button>
										<Bars4Icon className="size-8 stroke-2 p-2" />
									</button>
								</RoomCard>
								<Transition.Child
									as="div"
									aria-hidden
									className="absolute inset-0 rounded-lg shadow-2xl transition-opacity duration-300"
									enterFrom="opacity-0"
									enterTo="opacity-100"
								/>
							</Transition>
						</DragOverlay>
					</DndContext>
				</ul>
			</section>
			<footer className="flex justify-center">
				<Link
					from={Route.fullPath}
					to="/navigate"
					search={{ roomNames }}
					disabled={roomNames.length < 2 || roomNames.length > 5}
					className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white aria-disabled:opacity-50"
				>
					Find Route
				</Link>
			</footer>
		</div>
	);
}
