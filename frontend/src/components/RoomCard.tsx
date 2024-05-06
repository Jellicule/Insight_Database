import { Disclosure, Transition } from "@headlessui/react";
import { ChevronUpIcon } from "@heroicons/react/24/outline";
import { listify } from "radash";
import { ComponentPropsWithoutRef, forwardRef } from "react";
import { twMerge } from "tailwind-merge";
import { Room } from "../model";

interface RoomCardProps extends ComponentPropsWithoutRef<"article"> {
	room: Room;
	withDetails?: boolean | undefined;
}

export const RoomCard = forwardRef<HTMLElement, RoomCardProps>((props, ref) => {
	const { room, withDetails = false, className, children, ...rest } = props;

	return (
		<Disclosure
			{...rest}
			as="article"
			ref={ref}
			className={twMerge("rounded-lg bg-white p-2", className)}
		>
			<header className="flex items-center justify-between">
				<div>
					<h3 className="font-semibold">
						{room.shortname} {room.number}
					</h3>
					<h4 className="text-gray-500">{room.seats} seats</h4>
				</div>
				<span className="flex items-center">
					{withDetails && (
						<Disclosure.Button>
							<ChevronUpIcon className="size-8 stroke-2 p-2 transition-transform duration-300 ui-open:rotate-180" />
						</Disclosure.Button>
					)}
					{children}
				</span>
			</header>
			{withDetails && (
				<Transition
					className="grid transition-all duration-300"
					enterFrom="grid-rows-[0fr]"
					enterTo="grid-rows-[1fr]"
					leaveFrom="grid-rows-[1fr]"
					leaveTo="grid-rows-[0fr]"
					as="section"
				>
					<div className="overflow-hidden">
						<Disclosure.Panel
							as="div"
							className="rounded-lg bg-gray-100 p-2 text-xs text-gray-500 shadow-inner"
						>
							{listify(room, (key, value) => (
								<span
									key={key}
									className="flex justify-between"
								>
									<pre>{key}:</pre>
									<pre className="truncate">{value}</pre>
								</span>
							))}
						</Disclosure.Panel>
					</div>
				</Transition>
			)}
		</Disclosure>
	);
});
