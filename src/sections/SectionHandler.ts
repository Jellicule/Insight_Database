import {InsightDatasetKind} from "../controller/IInsightFacade";
import JSZip from "jszip";
import {Section} from "./Section";
import * as fs from "fs-extra";

/**
 * Parses each file inside the zip file
 *
 * @param content The base64 encoded string of the zip file of data that is to be added
 * @param kind The kind of dataset that is to be added. Should be InsightDatasetKind.Section
 * @param datasetPath The directory file path for when this dataSet is added
 */
export async function processContentSections(
	content: string,
	datasetPath: string
): Promise<[Section[], InsightDatasetKind]> {
	const zip = await JSZip.loadAsync(content, {base64: true});
	let arrPromises: Array<Promise<string>> = [];
	// Go into Courses folder, if there is one signified by the (?), and create a Promise<string> for each file
	// and put that into an array containing Promises<string> which corresponds to the json data in each file
	zip.folder("courses")?.forEach(async (_, course) => {
		arrPromises.push(course.async("string"));
	});
	let arrCourses: string[] = await Promise.all(arrPromises);
	if (arrCourses.length === 0) {
		throw Error;
	}
	return await handleSectionsData(arrCourses, datasetPath);
}

/**
 * Parses each json file in @param arrCourses, gathers information from each file and writes the section information
 * to the disk.
 *
 * @param arrCourses An array containing the json files to be parsed
 * @param datasetPath The directory file path for when this dataSet is added
 * @returns A tuple containing the array of sections and the InsightDatasetKind
 */
async function handleSectionsData(arrCourses: string[], datasetPath: string): Promise<[Section[], InsightDatasetKind]> {
	let arrSections: Section[] = [];
	// Iterate through each json file in arrCourses
	for (const course of arrCourses) {
		// Parse each json file
		let sections = JSON.parse(course);
		for (const section of sections.result.values()) {
			let uuid: string = section.id;
			let idd: string = section.Course;
			let title: string = section.Title;
			let instructor: string = section.Professor;
			let dept: string = section.Subject;
			let year: number;
			if (section.Section === "overall") {
				year = 1900;
			} else {
				year = section.Year;
			}
			let avg: number = section.Avg;
			let pass: number = section.Pass;
			let fail: number = section.Fail;
			let audit: number = section.Audit;
			// Create a new section and then push that into an array
			let newSection = new Section(uuid, idd, title, instructor, dept, year, avg, pass, fail, audit);
			arrSections.push(newSection);
		}
	}
	let dataSet: [Section[], InsightDatasetKind] = [arrSections, InsightDatasetKind.Sections];
	await fs.outputJson(datasetPath, dataSet);
	return dataSet;
}
