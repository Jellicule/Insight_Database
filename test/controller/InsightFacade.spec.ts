import {IInsightFacade, InsightDatasetKind, InsightError, NotFoundError} from "../../src/controller/IInsightFacade";
import {expect, use} from "chai";
import {clearDisk, getContentFromArchives, ITestQuery, readFileQueries} from "../resources/helpers";
import InsightFacade from "../../src/controller/InsightFacade";
import chaiAsPromised from "chai-as-promised";
import {before, beforeEach, it, describe, after} from "mocha";

use(chaiAsPromised);

function testQuery(query: ITestQuery, facade: () => IInsightFacade) {
	it(query.title, async () => {
		const resultPromise = facade().performQuery(query.input);
		if (query.errorExpected) {
			await expect(resultPromise)
				.to.be.rejectedWith(Error)
				.and.eventually.have.property("constructor")
				.that.has.property("name", query.expected);
		} else {
			if (query.ordered) {
				await expect(resultPromise).to.eventually.deep.equal(query.expected);
			} else {
				await expect(resultPromise).to.eventually.have.deep.members(query.expected);
			}
		}
	});
}

function testQueries(queries: ITestQuery[], facade: () => IInsightFacade) {
	for (const query of queries) {
		testQuery(query, facade);
	}
}

describe("InsightFacade", () => {
	let all: string;
	let twenty: string;
	let fifty: string;
	let hundred: string;
	let allRooms: string;

	before(async () => {
		[all, twenty, fifty, hundred, allRooms] = await Promise.all(
			["pair.zip", "twenty.zip", "fifty.zip", "hundred.zip", "campus.zip"].map(getContentFromArchives)
		);
	});

	after(async () => {
		await clearDisk();
	});

	describe("addDataset", () => {
		let facade: InsightFacade;

		beforeEach(async () => {
			await clearDisk();
			facade = new InsightFacade();
		});
		describe("adding Sections", () => {
			it("should not allow adding an empty identifier", async () => {
				const resultPromise = facade.addDataset("", twenty, InsightDatasetKind.Sections);
				await expect(resultPromise).to.eventually.be.rejectedWith(InsightError);
			});

			it("should not allow adding an all whitespace identifier", async () => {
				const resultPromise = facade.addDataset("     ", twenty, InsightDatasetKind.Sections);
				await expect(resultPromise).to.eventually.be.rejectedWith(InsightError);
			});

			it("should not allow adding with an underscore in the identifier", async () => {
				const resultPromise = facade.addDataset("sections_1", twenty, InsightDatasetKind.Sections);
				await expect(resultPromise).to.eventually.be.rejectedWith(InsightError);
			});

			it("should not allow adding a dataset with invalid content", async () => {
				let invalidContent = "hello!";
				const resultPromise = facade.addDataset("sections", invalidContent, InsightDatasetKind.Sections);
				await expect(resultPromise).to.eventually.be.rejectedWith(InsightError);
			});

			it("should add the dataset", async () => {
				const result = await facade.addDataset("sections", twenty, InsightDatasetKind.Sections);
				expect(result).to.have.members(["sections"]);
				const datasets = await facade.listDatasets();
				expect(datasets.map((d) => d.id)).to.have.members(["sections"]);
			});

			it("should return the ids of all available datasets", async () => {
				const result1 = await facade.addDataset("sections", twenty, InsightDatasetKind.Sections);
				expect(result1).to.have.members(["sections"]);
				const result2 = await facade.addDataset("bananas", twenty, InsightDatasetKind.Sections);
				expect(result2).to.have.members(["sections", "bananas"]);
			});

			it("should not allow adding a dataset with a duplicate identifier", async () => {
				await facade.addDataset("sections", twenty, InsightDatasetKind.Sections);
				const resultPromise = facade.addDataset("sections", twenty, InsightDatasetKind.Sections);
				await expect(resultPromise).to.eventually.be.rejectedWith(InsightError);
			});

			it("should not allow adding Sections content with InsightDataKind.Rooms ", async () => {
				const resultPromise = facade.addDataset("rooms", twenty, InsightDatasetKind.Rooms);
				await expect(resultPromise).to.eventually.be.rejectedWith(InsightError);
			});
		});
		describe("adding Rooms", () => {
			it("should not allow adding an empty identifier", async () => {
				const resultPromise = facade.addDataset("", allRooms, InsightDatasetKind.Rooms);
				await expect(resultPromise).to.eventually.be.rejectedWith(InsightError);
			});

			it("should not allow adding an all whitespace identifier", async () => {
				const resultPromise = facade.addDataset("     ", allRooms, InsightDatasetKind.Rooms);
				await expect(resultPromise).to.eventually.be.rejectedWith(InsightError);
			});

			it("should not allow adding with an underscore in the identifier", async () => {
				const resultPromise = facade.addDataset("rooms_1", allRooms, InsightDatasetKind.Rooms);
				await expect(resultPromise).to.eventually.be.rejectedWith(InsightError);
			});

			it("should not allow adding a dataset with invalid content", async () => {
				let invalidContent = "hello!";
				const resultPromise = facade.addDataset("rooms", invalidContent, InsightDatasetKind.Rooms);
				await expect(resultPromise).to.eventually.be.rejectedWith(InsightError);
			});

			it("should add the dataset", async () => {
				const result = await facade.addDataset("rooms", allRooms, InsightDatasetKind.Rooms);
				expect(result).to.have.members(["rooms"]);
				const datasets = await facade.listDatasets();
				expect(datasets.map((d) => d.id)).to.have.members(["rooms"]);
			});

			it("should return the ids of all available datasets", async () => {
				const result1 = await facade.addDataset("rooms", allRooms, InsightDatasetKind.Rooms);
				expect(result1).to.have.members(["rooms"]);
				const result2 = await facade.addDataset("bananas", allRooms, InsightDatasetKind.Rooms);
				expect(result2).to.have.members(["rooms", "bananas"]);
			});

			it("should not allow adding a dataset with a duplicate identifier", async () => {
				await facade.addDataset("rooms", allRooms, InsightDatasetKind.Rooms);
				const resultPromise = facade.addDataset("rooms", allRooms, InsightDatasetKind.Rooms);
				await expect(resultPromise).to.eventually.be.rejectedWith(InsightError);
			});

			it("should not allow adding Rooms content with InsightDataKind.Section ", async () => {
				const resultPromise = facade.addDataset("rooms", allRooms, InsightDatasetKind.Sections);
				await expect(resultPromise).to.eventually.be.rejectedWith(InsightError);
			});
		});

		describe("Adding Rooms and Sections", () => {
			it("should not allow adding a dataset with a duplicate identifier", async () => {
				await facade.addDataset("rooms", allRooms, InsightDatasetKind.Rooms);
				const resultPromise = facade.addDataset("rooms", twenty, InsightDatasetKind.Sections);
				await expect(resultPromise).to.eventually.be.rejectedWith(InsightError);
			});

			it("should allow adding a dataset with a removed identifier but with different Kind", async () => {
				await facade.addDataset("rooms", allRooms, InsightDatasetKind.Rooms);
				await facade.removeDataset("rooms");
				const resultPromise = facade.addDataset("sections", twenty, InsightDatasetKind.Sections);
				await expect(resultPromise).to.eventually.have.members(["sections"]);
			});
		});
	});

	describe("removeDataset", () => {
		let facade: InsightFacade;

		beforeEach(async () => {
			await clearDisk();
			facade = new InsightFacade();
		});

		it("should not allow deleting an empty identifier", async () => {
			const resultPromise = facade.removeDataset("");
			await expect(resultPromise).to.eventually.be.rejectedWith(InsightError);
		});

		it("should not allow deleting an all whitespace identifier", async () => {
			const resultPromise = facade.removeDataset("     ");
			await expect(resultPromise).to.eventually.be.rejectedWith(InsightError);
		});

		it("should not allow deleting with an underscore in the identifier", async () => {
			const resultPromise = facade.removeDataset("sections_1");
			await expect(resultPromise).to.eventually.be.rejectedWith(InsightError);
		});

		it("should not allow removing a nonexistent identifier", async () => {
			await facade.addDataset("sections", twenty, InsightDatasetKind.Sections);
			const resultPromise = facade.removeDataset("nonexistent");
			await expect(resultPromise).to.eventually.be.rejectedWith(NotFoundError);
		});

		it("should remove the correct dataset", async () => {
			for (let i = 0; i < 6; i++) {
				await facade.addDataset(`sections${i}`, twenty, InsightDatasetKind.Sections);
			}

			const allSections = await facade.listDatasets();

			const resultPromise = facade.removeDataset("sections2");
			await expect(resultPromise).to.become("sections2");

			const sections = await facade.listDatasets();

			expect(sections).to.deep.equal(allSections.filter((s) => s.id !== "sections2"));
		});

		it("should not allow deleting the same dataset twice", async () => {
			await facade.addDataset("sections", twenty, InsightDatasetKind.Sections);
			await facade.removeDataset("sections");
			const resultPromise = facade.removeDataset("sections");
			await expect(resultPromise).to.eventually.be.rejectedWith(NotFoundError);
		});
	});

	describe("performQuery", () => {
		let facade: InsightFacade;

		before(async () => {
			await clearDisk();
			facade = new InsightFacade();
			await facade.addDataset("sections", all, InsightDatasetKind.Sections);
			await facade.addDataset("rooms", allRooms, InsightDatasetKind.Rooms);
		});

		describe("valid queries", () => {
			const queries = readFileQueries("valid");
			testQueries(queries, () => facade);
		});

		describe("invalid queries", () => {
			const queries = readFileQueries("invalid");
			testQueries(queries, () => facade);
		});
	});

	describe("listDatasets", () => {
		let facade: InsightFacade;

		beforeEach(async function () {
			await clearDisk();
			facade = new InsightFacade();
		});

		it("should be empty when no datasets have been added", async () => {
			const resultPromise = facade.listDatasets();
			await expect(resultPromise).to.eventually.be.empty;
		});

		it("should correctly list the datasets", async () => {
			await facade.addDataset("twenty", twenty, InsightDatasetKind.Sections);
			await facade.addDataset("fifty", fifty, InsightDatasetKind.Sections);
			await facade.addDataset("hundred", hundred, InsightDatasetKind.Sections);

			const datasets = await facade.listDatasets();

			// TODO: Check entire object, not only id.
			expect(datasets.map((d) => d.id)).to.have.members(["twenty", "fifty", "hundred"]);
		});

		it("should correctly list the datasets", async () => {
			await facade.addDataset("twenty", allRooms, InsightDatasetKind.Rooms);
			await facade.addDataset("fifty", allRooms, InsightDatasetKind.Rooms);
			await facade.addDataset("hundred", allRooms, InsightDatasetKind.Rooms);

			const datasets = await facade.listDatasets();

			// TODO: Check entire object, not only id.
			expect(datasets.map((d) => d.id)).to.have.members(["twenty", "fifty", "hundred"]);
		});

		it("should list the correct datasets after many add and delete operations", async () => {
			await facade.addDataset("apples", twenty, InsightDatasetKind.Sections);
			await facade.addDataset("pears", twenty, InsightDatasetKind.Sections);
			await facade.addDataset("mangos", twenty, InsightDatasetKind.Sections);
			await facade.removeDataset("pears");
			await facade.addDataset("bananas", twenty, InsightDatasetKind.Sections);
			await facade.removeDataset("bananas");

			const datasets = await facade.listDatasets();

			// TODO: Check entire object, not only id.
			expect(datasets.map((d) => d.id)).to.have.members(["apples", "mangos"]);
		});
	});

	describe("persistence", () => {
		beforeEach(async () => {
			await clearDisk();
		});

		it("should allow access to datasets across multiple instances", async () => {
			const facade1 = new InsightFacade();
			await facade1.addDataset("ubc", twenty, InsightDatasetKind.Sections);
			await facade1.addDataset("sfu", allRooms, InsightDatasetKind.Rooms);
			await facade1.addDataset("bcit", twenty, InsightDatasetKind.Sections);
			await facade1.removeDataset("sfu");
			const datasets1 = await facade1.listDatasets();

			const facade2 = new InsightFacade();
			const datasets2 = await facade2.listDatasets();

			expect(datasets1).to.deep.equal(datasets2);
		});

		it("should not restore datasets that have been removed from the disk: Sections", async () => {
			const facade1 = new InsightFacade();
			await facade1.addDataset("sections", twenty, InsightDatasetKind.Sections);

			await clearDisk();

			const facade2 = new InsightFacade();
			const datasets = await facade2.listDatasets();

			expect(datasets).to.be.empty;
		});

		it("should not restore datasets that have been removed from the disk: Rooms", async () => {
			const facade1 = new InsightFacade();
			await facade1.addDataset("rooms", allRooms, InsightDatasetKind.Rooms);

			await clearDisk();

			const facade2 = new InsightFacade();
			const datasets = await facade2.listDatasets();

			expect(datasets).to.be.empty;
		});

		it("should handle dataset ids with special characters", async () => {
			const facade1 = new InsightFacade();
			await facade1.addDataset('!@#]$%^&[*(\\)+////~,.././=:<\\\\>?;"{}/|', twenty, InsightDatasetKind.Sections);
			const datasets1 = await facade1.listDatasets();

			const facade2 = new InsightFacade();
			const datasets2 = await facade2.listDatasets();

			expect(datasets1).to.deep.equal(datasets2);
		});
	});

	describe("User Stories", () => {
		let facade: InsightFacade;

		beforeEach(async function () {
			await clearDisk();
			facade = new InsightFacade();
		});

		it("should not allow querying a nonexistent dataset", async () => {
			const resultPromise = facade.performQuery({
				WHERE: {},
				OPTIONS: {
					COLUMNS: ["rooms_name", "rooms_seats"],
				},
			});
			await expect(resultPromise).to.eventually.be.rejectedWith(InsightError);
		});
	});
});
