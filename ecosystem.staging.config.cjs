module.exports = {
	apps: [
		{
			name: "hive-backend-staging",
			script: "./app/server.js",
			interpreter: "node",
			exec_mode: "fork",
			instances: 1,
			env: {
				NODE_ENV: "staging",
			},
		},
		{
			name: "hive-workers-staging",
			script: "./app/init.workers.js",
			interpreter: "node",
			exec_mode: "fork",
			instances: 1,
			env: {
				NODE_ENV: "staging",
			},
		},
	],
};
