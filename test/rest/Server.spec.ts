import Server from "../../src/rest/Server";

import {assert, expect, use} from "chai";
import chaiAsPromised from "chai-as-promised";
import {after, before, describe, it} from "mocha";
import request, {Response} from "supertest";
import {InsightDataset, InsightDatasetKind, InsightResult} from "../../src/controller/IInsightFacade";
import {ITestQuery, clearDisk, rawParseContent, readFileQueries} from "../resources/helpers";

use(chaiAsPromised);

function testQuery(query: ITestQuery) {
	it(query.title, async () => {
		try {
			return request("http://localhost:4321")
				.post("/query")
				.send(query.input as JSON)
				.set("Content-Type", "application/json")
				.then((response: Response) => {
					try {
						if (query.errorExpected) {
							return expect(response.status).to.be.equal(400);
						} else {
							if (query.ordered) {
								return expect(response.body.result).to.deep.equal(query.expected);
							} else {
								return expect(response.body.result).to.have.deep.members(query.expected);
							}
						}
					} catch (err: any) {
						assert.fail(`${err.message}`);
					}
				})
				.catch(function (err) {
					assert.fail(`${err.message}`);
				});
		} catch (err: any) {
			assert.fail(`${err.message}`);
		}
		// const resultPromise = facade().performQuery(query.input);
	});
}

function testQueries(queries: ITestQuery[]) {
	for (const query of queries) {
		testQuery(query);
	}
}

describe("Server Backend", function () {
	let server: Server;
	let allSections: Buffer;
	let twenty: Buffer;
	let fifty: Buffer;
	let hundred: Buffer;
	let allRooms: Buffer;

	before(async function () {
		[allSections, twenty, fifty, hundred, allRooms] = await Promise.all(
			["pair.zip", "twenty.zip", "fifty.zip", "hundred.zip", "campus.zip"].map(rawParseContent)
		);
	});
	describe("Add, Remove, List, Persistence", function () {

		beforeEach(async function () {
			// might want to add some process logging here to keep track of what is going on
			server = new Server(4321);
			try {
				await server.start();
			} catch (err) {
				console.log(err);
			}
			await clearDisk();
		});

		afterEach(async function () {
			// might want to add some process logging here to keep track of what is going on
			try {
				await server.stop();
			} catch (err) {
				console.log(err);
			}
			await clearDisk();
		});

		// Sample on how to format PUT requests
		describe("addDataSetRequest", function () {
			describe("Adding sections", function () {
				it("Should allow a valid Section and dataset", function () {
					try {
						return request("http://localhost:4321")
							.put("/dataset/Sections1/sections")
							.send(twenty)
							.set("Content-Type", "application/x-zip-compressed")
							.expect(200, {result: ["Sections1"]})
							.catch(function (err) {
								assert.fail(`${err}`);
							});
					} catch (err) {
						assert.fail(`${err}`);
					}
				});

				it("Should allow 2 valid ids and dataset", function () {
					try {
						return request("http://localhost:4321")
							.put("/dataset/Sections1/sections")
							.send(twenty)
							.set("Content-Type", "application/x-zip-compressed")
							.expect(200, {result: ["Sections1"]})
							.then(function () {
								// some logging here please!
								return request("http://localhost:4321")
									.put("/dataset/Sections2/sections")
									.send(twenty)
									.set("Content-Type", "application/x-zip-compressed")
									.expect(200, {result: ["Sections1", "Sections2"]})
									.catch(function (err) {
										assert.fail(`${err.message}`);
									});
							})
							.catch(function (err) {
								assert.fail(`${err.message}`);
							});
					} catch (err: any) {
						assert.fail(`${err.message}`);
					}
				});

				it("Should not allow 2 requests with same id", function () {
					try {
						return request("http://localhost:4321")
							.put("/dataset/Sections1/sections")
							.send(twenty)
							.set("Content-Type", "application/x-zip-compressed")
							.expect(200, {result: ["Sections1"]})
							.then(function () {
								// some logging here please!
								return request("http://localhost:4321")
									.put("/dataset/Sections1/sections")
									.send(fifty)
									.set("Content-Type", "application/x-zip-compressed")
									.expect(400)
									.catch(function (err) {
										assert.fail(`${err.message}`);
									});
							})
							.catch(function (err) {
								assert.fail(`${err.message}`);
							});
					} catch (err: any) {
						assert.fail(`${err.message}`);
					}
				});

				it("Should not allow an invalid kind with valid Sections content", function () {
					try {
						return request("http://localhost:4321")
							.put("/dataset/UBC/Blob")
							.send(twenty)
							.set("Content-Type", "application/x-zip-compressed")
							.expect(400)
							.catch(function (err) {
								assert.fail(`${err.message}`);
							});
					} catch (err: any) {
						assert.fail(`${err.message}`);
					}
				});

				it("Should not allow an invalid dataset with Sections", function () {
					try {
						let buffer: Buffer = new Buffer(["Hello"]);
						return request("http://localhost:4321")
							.put("/dataset/UBC/sections")
							.send(buffer)
							.set("Content-Type", "application/x-zip-compressed")
							.expect(400)
							.catch(function (err) {
								assert.fail(`${err.message}`);
							});
					} catch (err: any) {
						assert.fail(`${err.message}`);
					}
				});

				it("Should not allow an empty id", function () {
					try {
						return request("http://localhost:4321")
							.put("/dataset/ /sections")
							.send(twenty)
							.set("Content-Type", "application/x-zip-compressed")
							.expect(400)
							.catch(function (err) {
								assert.fail(`${err.message}`);
							});
					} catch (err: any) {
						assert.fail(`${err.message}`);
					}
				});

				it("Should not allow an all whitespace identifier", function () {
					try {
						return request("http://localhost:4321")
							.put("/dataset/    /sections")
							.send(twenty)
							.set("Content-Type", "application/x-zip-compressed")
							.expect(400)
							.catch(function (err) {
								assert.fail(`${err.message}`);
							});
					} catch (err: any) {
						assert.fail(`${err.message}`);
					}
				});

				it("should not allow adding with an underscore in the identifier", function () {
					try {
						return request("http://localhost:4321")
							.put("/dataset/UBC_1/sections")
							.send(twenty)
							.set("Content-Type", "application/x-zip-compressed")
							.expect(400)
							.catch(function (err) {
								assert.fail(`${err.message}`);
							});
					} catch (err: any) {
						assert.fail(`${err.message}`);
					}
				});

				it("should not allow adding a valid Rooms content with Sections", function () {
					try {
						return request("http://localhost:4321")
							.put("/dataset/UBC1/sections")
							.send(allRooms)
							.set("Content-Type", "application/x-zip-compressed")
							.expect(400)
							.catch(function (err) {
								assert.fail(`${err.message}`);
							});
					} catch (err: any) {
						assert.fail(`${err.message}`);
					}
				});
			});
			describe("Adding Rooms", function () {

				it("Should allow a valid Rooms and dataset", function () {
					try {
						return request("http://localhost:4321")
							.put("/dataset/Rooms1/rooms")
							.send(allRooms)
							.set("Content-Type", "application/x-zip-compressed")
							.expect(200, {result: ["Rooms1"]})
							.catch(function (err) {
								assert.fail(`${err.message}`);
							});
					} catch (err: any) {
						assert.fail(`${err.message}`);
					}
				});

				it("Should allow 2 valid ids and dataset", function () {
					try {
						return request("http://localhost:4321")
							.put("/dataset/Rooms1/rooms")
							.send(allRooms)
							.set("Content-Type", "application/x-zip-compressed")
							.expect(200, {result: ["Rooms1"]})
							.then(function () {
								// some logging here please!
								return request("http://localhost:4321")
									.put("/dataset/Rooms2/rooms")
									.send(allRooms)
									.set("Content-Type", "application/x-zip-compressed")
									.expect(200, {result: ["Rooms1", "Rooms2"]})
									.catch(function (err) {
										assert.fail(`${err.message}`);
									});
							})
							.catch(function (err) {
								assert.fail(`${err.message}`);
							});
					} catch (err: any) {
						assert.fail(`${err.message}`);
					}
				});

				it("Should not allow 2 requests with same id", function () {
					try {
						return request("http://localhost:4321")
							.put("/dataset/Rooms1/rooms")
							.send(allRooms)
							.set("Content-Type", "application/x-zip-compressed")
							.expect(200, {result: ["Rooms1"]})
							.then(function () {
								// some logging here please!
								return request("http://localhost:4321")
									.put("/dataset/Rooms1/rooms")
									.send(allRooms)
									.set("Content-Type", "application/x-zip-compressed")
									.expect(400)
									.catch(function (err) {
										assert.fail(`${err.message}`);
									});
							})
							.catch(function (err) {
								assert.fail(`${err.message}`);
							});
					} catch (err: any) {
						assert.fail(`${err.message}`);
					}
				});

				it("Should not allow an invalid dataset with Rooms", function () {
					try {
						let buffer: Buffer = new Buffer(["Hello"]);
						return request("http://localhost:4321")
							.put("/dataset/UBC/rooms")
							.send(buffer)
							.set("Content-Type", "application/x-zip-compressed")
							.expect(400)
							.catch(function (err) {
								assert.fail(`${err.message}`);
							});
					} catch (err: any) {
						assert.fail(`${err.message}`);
					}
				});

				it("Should not allow an empty id", function () {
					try {
						return request("http://localhost:4321")
							.put("/dataset/ /rooms")
							.send(allRooms)
							.set("Content-Type", "application/x-zip-compressed")
							.expect(400)
							.catch(function (err) {
								assert.fail(`${err.message}`);
							});
					} catch (err: any) {
						assert.fail(`${err.message}`);
					}
				});

				it("Should not allow an all whitespace identifier", function () {
					try {
						return request("http://localhost:4321")
							.put("/dataset/    /rooms")
							.send(allRooms)
							.set("Content-Type", "application/x-zip-compressed")
							.expect(400)
							.catch(function (err) {
								assert.fail(`${err.message}`);
							});
					} catch (err: any) {
						assert.fail(`${err.message}`);
					}
				});

				it("should not allow adding with an underscore in the identifier", function () {
					try {
						return request("http://localhost:4321")
							.put("/dataset/UBC_1/rooms")
							.send(allRooms)
							.set("Content-Type", "application/x-zip-compressed")
							.expect(400)
							.catch(function (err) {
								assert.fail(`${err.message}`);
							});
					} catch (err: any) {
						assert.fail(`${err.message}`);
					}
				});
			});
		});
		describe("removeDatasetRequest", function () {

			it("Should delete an inputted dataset", function () {
				try {
					return request("http://localhost:4321")
						.put("/dataset/Sections1/sections")
						.send(twenty)
						.set("Content-Type", "application/x-zip-compressed")
						.expect(200, {result: ["Sections1"]})
						.then(() => {
							request("http://localhost:4321")
								.delete("/dataset/Sections1")
								.expect(200, {result: "Sections1"})
								.catch(function (err) {
									assert.fail(`${err.message}`);
								});
						})
						.catch(function (err) {
							assert.fail(`${err}`);
						});
				} catch (err) {
					assert.fail(`${err}`);
				}
			});

			it("Should fail while deleting non existent dataset with id", function () {
				try {
					return request("http://localhost:4321")
						.delete("/dataset/UBC")
						.expect(404)
						.catch(function (err) {
							assert.fail(`${err.message}`);
						});
				} catch (err: any) {
					assert.fail(`${err.message}`);
				}
			});

			it("Should fail while deleting with invalid id", function () {
				try {
					request("http://localhost:4321")
						.delete("/dataset/UBC_")
						.expect(400)
						.catch(function (err) {
							assert.fail(`${err.message}`);
						});
				} catch (err: any) {
					assert.fail(`${err.message}`);
				}
			});

			// it("Should fail while deleting with no id", function () {
			// 	try {
			// 		return request("http://localhost:4321")
			// 			.delete("/dataset/")
			// 			.expect(400)
			// 			.catch(function (err) {
			// 				assert.fail(`${err.message}`);
			// 			});
			// 	} catch (err: any) {
			// 		assert.fail(`${err.message}`);
			// 	}
			// });

			// it("Should fail while deleting with id that is just whitespace", function () {
			// 	try {
			// 		return request("http://localhost:4321")
			// 			.delete("/dataset/    ")
			// 			.expect(400)
			// 			.catch(function (err) {
			// 				assert.fail(`${err.message}`);
			// 			});
			// 	} catch (err: any) {
			// 		assert.fail(`${err.message}`);
			// 	}
			// });

			it("Should fail while deleting the same dataset twice", function () {
				try {
					return request("http://localhost:4321")
						.put("/dataset/Sections1/sections")
						.send(twenty)
						.set("Content-Type", "application/x-zip-compressed")
						.expect(200, {result: ["Sections1"]})
						.then(() => {
							request("http://localhost:4321")
								.delete("/dataset/Sections1")
								.expect(200, {result: "Sections1"})
								.then(() => {
									request("http://localhost:4321")
										.delete("/dataset/Sections1")
										.expect(404)
										.catch(function (err) {
											assert.fail(`${err.message}`);
										});
								})
								.catch(function (err) {
									assert.fail(`${err.message}`);
								});
						})
						.catch(function (err) {
							assert.fail(`${err}`);
						});
				} catch (err) {
					assert.fail(`${err}`);
				}
			});
		});
		describe("listDatasetRequest", function () {

			it("Should return an empty array after adding no datasets", function () {
				try {
					return request("http://localhost:4321")
						.get("/datasets")
						.expect(200, {result: []})
						.catch(function (err) {
							assert.fail(`${err.message}`);
						});
				} catch (err: any) {
					assert.fail(`${err.message}`);
				}
			});

			it("Should correctly list the datasets", function () {
				try {
					return request("http://localhost:4321")
						.put("/dataset/UBC/sections")
						.send(twenty)
						.set("Content-Type", "application/x-zip-compressed")
						.expect(200)
						.then(function (res: Response) {
							// some logging here please!
							expect(res.body.result).to.have.members(["UBC"]);
							return request("http://localhost:4321")
								.put("/dataset/SFU/sections")
								.send(fifty)
								.set("Content-Type", "application/x-zip-compressed")
								.expect(200)
								.then(function () {
									return request("http://localhost:4321")
										.get("/datasets")
										.expect(200)
										.then(function (re: Response) {
											let SFUResult: InsightDataset = {
												id: "SFU",
												kind: InsightDatasetKind.Sections,
												numRows: 305,
											};
											let UBCResult: InsightDataset = {
												id: "UBC",
												kind: InsightDatasetKind.Sections,
												numRows: 236,
											};
											expect(re.body.result).to.have.deep.members([SFUResult, UBCResult]);
										})
										.catch(function (err) {
											assert.fail(`${err.message}`);
										});
								})
								.catch(function (err) {
									assert.fail(`${err.message}`);
								});
						})
						.catch(function (err) {
							assert.fail(`${err.message}`);
						});
				} catch (err: any) {
					// and some more logging here!
					assert.fail(`${err.message}`);
				}
			});

			it("Should correctly list the datasets after many add and delete operations", function () {
				try {
					return request("http://localhost:4321")
						.put("/dataset/UBC/sections")
						.send(twenty)
						.set("Content-Type", "application/x-zip-compressed")
						.expect(200, {result: ["UBC"]})
						.then(function () {
							return request("http://localhost:4321")
								.put("/dataset/SFU/sections")
								.send(fifty)
								.set("Content-Type", "application/x-zip-compressed")
								.expect(200, {result: ["UBC", "SFU"]})
								.then(function () {
									return request("http://localhost:4321")
										.put("/dataset/BCIT/sections")
										.send(hundred)
										.set("Content-Type", "application/x-zip-compressed")
										.expect(200, {result: ["UBC", "SFU", "BCIT"]})
										.then(function () {
											return request("http://localhost:4321")
												.delete("/dataset/SFU")
												.expect(200, {result: "SFU"})
												.then(function () {
													return request("http://localhost:4321")
														.get("/datasets")
														.expect(200)
														.then(function (respo: Response) {
															let UBCResult: InsightDataset = {
																id: "UBC",
																kind: InsightDatasetKind.Sections,
																numRows: 236,
															};
															let BCITResult: InsightResult = {
																id: "BCIT",
																kind: InsightDatasetKind.Sections,
																numRows: 545,
															};
															expect(respo.body.result).to.have.deep.members([
																BCITResult,
																UBCResult,
															]);
														})
														.catch(function (err) {
															assert.fail(`${err.message}`);
														});
												})
												.catch(function (err) {
													// some logging here please!
													assert.fail(`${err.message}`);
												});
										})
										.catch(function (err) {
											// some logging here please!
											assert.fail(`${err.message}`);
										});
								})
								.catch(function (err) {
									// some logging here please!
									assert.fail(`${err.message}`);
								});
						})
						.catch(function (err) {
							// some logging here please!
							assert.fail(`${err.message}`);
						});
				} catch (err: any) {
					// and some more logging here!
					assert.fail(`${err.message}`);
				}
			});
		});
		//
		describe("Persistence", () => {
			it("Should allow access to datasets across multiple instances", () => {
				try {
					return request("http://localhost:4321")
						.put("/dataset/UBC/sections")
						.send(twenty)
						.set("Content-Type", "application/x-zip-compressed")
						.expect(200, {result: ["UBC"]})
						.then(() => {
							// some logging here please!
							return request("http://localhost:4321")
								.put("/dataset/SFU/rooms")
								.send(allRooms)
								.set("Content-Type", "application/x-zip-compressed")
								.expect(200, {result: ["UBC", "SFU"]})
								.then(() => {
									return request("http://localhost:4321")
										.put("/dataset/BCIT/sections")
										.send(hundred)
										.set("Content-Type", "application/x-zip-compressed")
										.expect(200, {result: ["UBC", "SFU", "BCIT"]})
										.then(async () => {
											try {
												await server.stop();
												await server.start();
											} catch (err) {
												console.log(err);
											}
											return request("http://localhost:4321")
												.get("/datasets")
												.expect(200)
												.then(function (respons: Response) {
													let UBCResult: InsightDataset = {
														id: "UBC",
														kind: InsightDatasetKind.Sections,
														numRows: 236,
													};
													let SFUResult: InsightDataset = {
														id: "SFU",
														kind: InsightDatasetKind.Rooms,
														numRows: 364,
													};
													let BCITResult: InsightDataset = {
														id: "BCIT",
														kind: InsightDatasetKind.Sections,
														numRows: 545,
													};
													expect(respons.body.result).to.have.deep.members([
														BCITResult,
														SFUResult,
														UBCResult,
													]);
												})
												.catch((err) => {
													assert.fail(`${err.message}`);
												});
										})
										.catch((err) => {
											assert.fail(`${err.message}`);
										});
								})
								.catch((err) => {
									assert.fail(`${err.message}`);
								});
						})
						.catch((err) => {
							assert.fail(`${err.message}`);
						});
				} catch (err: any) {
					assert.fail(`${err.message}`);
				}
			});

			it("Should not restore datasets that have been removed from the disk: Sections", () => {
				try {
					return request("http://localhost:4321")
						.put("/dataset/UBC/sections")
						.send(twenty)
						.set("Content-Type", "application/x-zip-compressed")
						.expect(200, {result: ["UBC"]})
						.then(() => {
							return request("http://localhost:4321")
								.put("/dataset/SFU/sections")
								.send(fifty)
								.set("Content-Type", "application/x-zip-compressed")
								.expect(200, {result: ["UBC", "SFU"]})
								.then(() => {
									return request("http://localhost:4321")
										.delete("/dataset/UBC")
										.expect(200, {result: "UBC"})
										.then(async () => {
											try {
												await server.stop();
												await server.start();
											} catch (err) {
												console.log(err);
											}
											return request("http://localhost:4321")
												.get("/datasets")
												.expect(200)
												.then((response: Response) => {
													let SFUResult: InsightDataset = {
														id: "SFU",
														kind: InsightDatasetKind.Sections,
														numRows: 305,
													};
													expect(response.body.result).to.have.deep.members([SFUResult]);
												})
												.catch((err) => {
													assert.fail(`${err.message}`);
												});
										})
										.catch((err) => {
											assert.fail(`${err.message}`);
										});
								})
								.catch((err) => {
									assert.fail(`${err.message}`);
								});
						})
						.catch((err) => {
							assert.fail(`${err.message}`);
						});
				} catch (err: any) {
					assert.fail(`${err.message}`);
				}
			});

			it("Should not restore datasets that have been removed from the disk: Rooms", () => {
				try {
					return request("http://localhost:4321")
						.put("/dataset/UBC/rooms")
						.send(allRooms)
						.set("Content-Type", "application/x-zip-compressed")
						.expect(200, {result: ["UBC"]})
						.then(() => {
							return request("http://localhost:4321")
								.put("/dataset/SFU/rooms")
								.send(allRooms)
								.set("Content-Type", "application/x-zip-compressed")
								.expect(200, {result: ["UBC", "SFU"]})
								.then(() => {
									return request("http://localhost:4321")
										.delete("/dataset/UBC")
										.expect(200, {result: "UBC"})
										.then(async () => {
											try {
												await server.stop();
												await server.start();
											} catch (err) {
												console.log(err);
											}
											return request("http://localhost:4321")
												.get("/datasets")
												.expect(200)
												.then((response: Response) => {
													let SFUResult: InsightDataset = {
														id: "SFU",
														kind: InsightDatasetKind.Rooms,
														numRows: 364,
													};
													expect(response.body.result).to.have.deep.members([SFUResult]);
												})
												.catch((err) => {
													assert.fail(`${err.message}`);
												});
										})
										.catch((err) => {
											assert.fail(`${err.message}`);
										});
								})
								.catch((err) => {
									assert.fail(`${err.message}`);
								});
						})
						.catch((err) => {
							assert.fail(`${err.message}`);
						});
				} catch (err: any) {
					assert.fail(`${err.message}`);
				}
			});
		});

		// The other endpoints work similarly. You should be able to find all instructions at the supertest documentation
	});

	describe("Query", async function () {
		before(async () => {
			await clearDisk();
			server = new Server(4321);
			try {
				await server.start();
			} catch (err) {
				console.log(err);
			}
			try {
				return request("http://localhost:4321")
					.put("/dataset/rooms/rooms")
					.send(allRooms)
					.set("Content-Type", "application/x-zip-compressed")
					.expect(200, {result: ["rooms"]})
					.then(() => {
						return request("http://localhost:4321")
							.put("/dataset/sections/sections")
							.send(allSections)
							.set("Content-Type", "application/x-zip-compressed")
							.expect(200, {result: ["rooms", "sections"]})
							.catch(function (err) {
								assert.fail(`${err.message}`);
							});
					})
					.catch(function (err) {
						assert.fail(`${err.message}`);
					});
			} catch (err: any) {
				assert.fail(`${err.message}`);
			}
		});

		after(async () => {
			try {
				await server.stop();
			} catch (err) {
				console.log(err);
			}
			await clearDisk();
		});

		describe("valid queries", () => {
			const queries = readFileQueries("valid");
			testQueries(queries);
		});

		describe("invalid queries", () => {
			const queries = readFileQueries("invalid");
			testQueries(queries);
		});
	});
});
