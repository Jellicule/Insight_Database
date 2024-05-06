import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Link, RouterProvider, createRouter } from "@tanstack/react-router";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { routeTree } from "./routeTree.gen";

const queryClient = new QueryClient();

const router = createRouter({
	routeTree,
	context: { queryClient },
	defaultPreload: "intent",
	defaultPreloadStaleTime: 0,
	defaultNotFoundComponent: () => {
		return (
			<div>
				<p>Not found!</p>
				<Link search={{ roomNames: [] }} to="/">
					Go home
				</Link>
			</div>
		);
	},
});

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

async function enableMocking() {
	if (process.env.NODE_ENV !== "development") {
		return;
	}
	const { worker } = await import("./mocks/browser");
	return worker.start({
		onUnhandledRequest(req, print) {
			const url = new URL(req.url);
			if (url.pathname.startsWith("/api/")) {
				print.warning();
			}
		},
	});
}

(async () => {
	await enableMocking();

	const rootElement = document.getElementById("app")!;
	if (!rootElement.innerHTML) {
		const root = ReactDOM.createRoot(rootElement);
		root.render(
			<StrictMode>
				<QueryClientProvider client={queryClient}>
					<RouterProvider router={router} />
				</QueryClientProvider>
			</StrictMode>,
		);
	}
})();
