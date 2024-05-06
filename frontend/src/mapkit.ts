declare global {
	namespace mapkit {
		const loadedLibraries: string[];

		function load(libraries: string | string[]): void;
	}

	interface Window {
		initMapKit?(): void;
	}
}

let ready = false;

export async function getMapKit(): Promise<typeof mapkit> {
	if (!window.mapkit || window.mapkit.loadedLibraries.length === 0) {
		await new Promise<void>((resolve) => {
			window.initMapKit = resolve;
		});
		delete window.initMapKit;
	}
	if (!ready) {
		window.mapkit.init({
			authorizationCallback: (done) => {
				done(import.meta.env.VITE_MAPKIT_TOKEN);
			},
		});
		ready = true;
	}
	return window.mapkit;
}

function checkMapKitLibrariesLoaded(
	mk: typeof mapkit,
	libraries: string[],
): boolean {
	const loaded = new Set(mk.loadedLibraries);
	return libraries.every((library) => loaded.has(library));
}

export async function getMapKitWithLibraries(
	libraries: string[],
): Promise<typeof mapkit> {
	const mk = await getMapKit();
	if (!checkMapKitLibrariesLoaded(mk, libraries)) {
		await new Promise<void>((resolve) => {
			function loadHandler() {
				if (checkMapKitLibrariesLoaded(mk, libraries)) {
					resolve();
					mk.removeEventListener(
						"load" as mapkit.InitializationEventType,
						loadHandler,
					);
				}
			}
			mk.load(libraries);
			mk.addEventListener(
				"load" as mapkit.InitializationEventType,
				loadHandler,
			);
		});
	}
	return mk;
}

export function getRoute(
	directions: mapkit.Directions,
	request: mapkit.DirectionsRequest,
): Promise<mapkit.DirectionsResponse> {
	return new Promise((resolve, reject) => {
		directions.route(request, (err, response) => {
			if (err) {
				reject(err);
			} else {
				resolve(response);
			}
		});
	});
}
