import { connect, connection } from "mongoose";
import { beforeAll, afterAll, afterEach } from "vitest";
import { config } from "#config/config";
import { CacheService } from "#services/cache.service";

const cacheService = CacheService.getInstance();

beforeAll(async () => {
	await connect(config.db.uri, { timeoutMS: 30000 });
});

afterEach(async () => {
	const collections = connection.collections;
	for (const key in collections) {
		await collections[key].deleteMany({});
	}

	await cacheService.flush();
});

afterAll(async () => {
	await connection.dropDatabase();
	await connection.close();
	await cacheService.disconnect();
});
