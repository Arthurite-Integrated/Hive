import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
	resolve: {
		alias: {
			"#config": path.resolve("src/config"),
			"#services": path.resolve("src/services"),
			"#middlewares": path.resolve("src/middlewares"),
			"#errors": path.resolve("src/errors"),
			"#helpers": path.resolve("src/helpers"),
			"#utils": path.resolve("src/utils"),
			"#constants": path.resolve("src/constants"),
			"#enums": path.resolve("src/enums"),
			"#modules": path.resolve("src/modules"),
			"#models": path.resolve("src/models"),
			"#routes": path.resolve("src/routes"),
			"#connection": path.resolve("src/connection"),
			"#validator": path.resolve("src/validator"),
		},
	},
	test: {
		globals: true,
		testTimeout: 30000,
		hookTimeout: 30000,
		fileParallelism: false,
	},
});
