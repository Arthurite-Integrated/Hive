module.exports = {
	apps: [
		{
			name: "hive-backend",
			script: "./app/server.js",
			interpreter: "node",
			exec_mode: "fork",
			instances: 2,
			env: {
				NODE_ENV: "production",
			},
		},
		{
			name: "hive-workers",
			script: "./app/init.workers.js",
			interpreter: "node",
			exec_mode: "fork",
			instances: 1,
			env: {
				NODE_ENV: "production",
			},
		},
	],
};
