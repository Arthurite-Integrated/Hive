module.exports = {
	apps: [
		{
			name: "hive-backend", // Name of the server
			script: "app/server.js",
			instances: 2, // Start 2 instances of the server
			exec_mode: "cluster", // Use cluster mode to start the server
			env: {
				NODE_ENV: "production",
			},
			env_production: {
				NODE_ENV: "production",
			}
		},
	],
};
