export class Room {
	private _fullName: string;
	private _shortName: string;
	private _number: string;
	private _name: string;
	private _address: string;
	private _lat: number;
	private _lon: number;
	private _seats: number;
	private _type: string;
	private _furniture: string;
	private _href: string;

	constructor(
		fullName: string,
		shortName: string,
		number: string,
		name: string,
		address: string,
		lat: number,
		lon: number,
		seats: number,
		type: string,
		furniture: string,
		href: string
	) {
		this._fullName = fullName;
		this._shortName = shortName;
		this._number = number;
		this._name = name;
		this._address = address;
		this._lat = lat;
		this._lon = lon;
		this._seats = seats;
		this._type = type;
		this._furniture = furniture;
		this._href = href;
	}

	public get fullName(): string {
		return this._fullName;
	}

	public get shortName(): string {
		return this._shortName;
	}

	public get roomNumber(): string {
		return this._number;
	}

	public get roomName(): string {
		return this._name;
	}

	public get address(): string {
		return this._address;
	}

	public get latitude(): number {
		return this._lat;
	}

	public get longitude(): number {
		return this._lon;
	}

	public get seats(): number {
		return this._seats;
	}

	public get roomType(): string {
		return this._type;
	}

	public get furniture(): string {
		return this._furniture;
	}

	public get hrefPath(): string {
		return this._href;
	}
}
