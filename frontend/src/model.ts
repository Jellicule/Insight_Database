import { mapKeys } from "radash";
import { z } from "zod";

type TrimPrefix<
	Prefix extends string,
	Input extends string,
> = Input extends `${Prefix}${infer Output}` ? Output : Input;

type TrimPrefixes<
	Prefix extends string,
	T extends Record<string | number | symbol, unknown>,
> = {
	[K in keyof T as K extends string ? TrimPrefix<Prefix, K> : K]: T[K];
};

function trimPrefixes<
	const Prefix extends string,
	const T extends z.ZodObject<z.ZodRawShape>,
>(
	prefix: Prefix,
	schema: T,
): z.ZodEffects<T, TrimPrefixes<Prefix, z.output<T>>, z.input<T>> {
	return schema.transform(
		(object) =>
			mapKeys(object, (key) =>
				typeof key === "string" ? key.replace(prefix, "") : key,
			) as TrimPrefixes<Prefix, z.output<T>>,
	);
}

const PrefixedRoom = z.object({
	rooms_fullname: z.string(),
	rooms_shortname: z.string(),
	rooms_number: z.string(),
	rooms_name: z.string(),
	rooms_address: z.string(),
	rooms_lat: z.number(),
	rooms_lon: z.number(),
	rooms_seats: z.number(),
	rooms_type: z.string(),
	rooms_furniture: z.string(),
	rooms_href: z.string(),
});

export const Room = trimPrefixes("rooms_", PrefixedRoom);

export type Room = z.infer<typeof Room>;

const PrefixedBuilding = PrefixedRoom.pick({
	rooms_fullname: true,
	rooms_shortname: true,
	rooms_address: true,
	rooms_lat: true,
	rooms_lon: true,
});

export const Building = trimPrefixes("rooms_", PrefixedBuilding);

export type Building = z.infer<typeof Building>;
