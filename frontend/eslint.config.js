import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import path from "path";
import tseslint from "typescript-eslint";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
	baseDirectory: __dirname,
});

/** @type {import("eslint").Linter.FlatConfig} */
const config = [
	js.configs.recommended,
	...tseslint.configs.recommended,
	...compat.extends(
		"plugin:react-hooks/recommended",
		"plugin:@tanstack/eslint-plugin-query/recommended",
	),
	...compat.plugins("react-refresh", "@tanstack/query"),
	eslintConfigPrettier,
	{
		rules: {
			"react-refresh/only-export-components": [
				"warn",
				{ allowConstantExport: true },
			],
			"@typescript-eslint/no-namespace": "off",
		},
	},
];

export default config;
