export class Section {
	private _uuid: string;
	private _id: string;
	private _title: string;
	private _instructor: string;
	private _dept: string;
	private _year: number;
	private _avg: number;
	private _pass: number;
	private _fail: number;
	private _audit: number;

	constructor(
		uuid: string,
		id: string,
		title: string,
		instructor: string,
		dept: string,
		year: number,
		avg: number,
		pass: number,
		fail: number,
		audit: number
	) {
		this._uuid = uuid;
		this._id = id;
		this._title = title;
		this._instructor = instructor;
		this._dept = dept;
		this._year = year;
		this._avg = avg;
		this._pass = pass;
		this._fail = fail;
		this._audit = audit;
	}

	public get uuid(): string {
		return this._uuid;
	}

	public get id(): string {
		return this._id;
	}

	public get title(): string {
		return this._title;
	}

	public get instructor(): string {
		return this._instructor;
	}

	public get dept(): string {
		return this._dept;
	}

	public get year(): number {
		return this._year;
	}

	public get avg(): number {
		return this._avg;
	}

	public get pass(): number {
		return this._pass;
	}

	public get fail(): number {
		return this._fail;
	}

	public get audit(): number {
		return this._audit;
	}
}
