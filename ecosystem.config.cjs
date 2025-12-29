module.exports = {
  apps: [
    {
      name: "hive-backend", // Name of the server
      script: "dist/server.js",
      instances: 2, // Start 2 instances of the server
      exec_mode: "cluster", // Use cluster mode to start the server
      env: {
        NODE_ENV: "production", // Set the environment to production
        PORT: 5000, // Set the port to 5000
      },
      env_development: {
        NODE_ENV: "development", // Set the environment to development
        PORT: 5000, // Set the port to 5000
      },
    },
  ],
};
