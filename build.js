import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import esbuild from "esbuild";

async function build() {
	try {
		console.log("🔨 Building with esbuild...");

		await esbuild.build({
			entryPoints: ["app/server.js"],
			bundle: true,
			platform: "node",
			format: "cjs",
			outfile: "dist/server.cjs",
			minify: true,
			// Keep these external to avoid bundling issues
			external: [
				"email-templates",
				"handlebars",
				"nodemailer",
				"pug",
				"ejs",
				"consolidate",
				"preview-email",
				"googleapis",
			],
		});

		console.log("✅ Build complete!");

		// Copy email templates
		console.log("📧 Copying email templates...");
		execSync('copyfiles -u 1 "src/emails/**/*" dist/', { stdio: "inherit" });
		console.log("✅ Email templates copied!");

		// Verify templates were copied
		const templatesPath = path.join(process.cwd(), "dist/emails");
		if (fs.existsSync(templatesPath)) {
			const folders = fs.readdirSync(templatesPath);
			console.log("📁 Template folders:", folders);
		} else {
			console.error("❌ Templates were not copied!");
			process.exit(1);
		}
	} catch (error) {
		console.error("❌ Build failed:", error);
		process.exit(1);
	}
}

build();
