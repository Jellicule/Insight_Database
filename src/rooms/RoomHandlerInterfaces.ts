export interface GeoResponse {
	lat?: number;
	lon?: number;
	error?: string;
}

export interface BuildingData {
	fullname: string;
	shortname: string;
	address: string;
	href: string;
}

export interface RoomData {
	number: string;
	type: string;
	furniture: string;
	seats: number;
	href: string;
}
