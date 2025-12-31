import { env } from "#config/env";

export const config = {
  jwt: {
    privateKey: env.JWT_PRIVATE_KEY,
    publicKey: env.JWT_PUBLIC_KEY,
    expiresIn: env.JWT_EXPIRES_IN,
    issuer: env.JWT_ISSUER || "Hive",
  },

  db: {
    uri: env.MONGO_URI,
  },

  redis: {
    uri: env.REDIS_URI,
  },

  server: {
    hostname: env.HOSTNAME,
    port: env.PORT,
    serverDomain: env.SERVER_DOAMIN,
    rootDomain: env.ROOT_DOMAIN,
  },

  mail: {
    gmail: {
      host: env.GMAIL_HOST,
      port: {
        ssl: env.GMAIL_PORT_SSL,
        tls: env.GMAIL_PORT_TLS,
      },
      user: env.GMAIL_USER,
      pass: env.GMAIL_PASSWORD,
      secure: env.GMAIL_SECURE,
    },
    hostinger: {
      host: env.HOSTINGER_HOST,
      port: {
        ssl: env.HOSTINGER_PORT_SSL,
        tls: env.HOSTINGER_PORT_TLS,
      },
      user: env.HOSTINGER_USER,
      pass: env.HOSTINGER_PASSWORD,
      secure: env.HOSTINGER_SECURE,
    },
  },

  encryption: {
    key: env.ENCRYPTION_KEY,
  },

  env: env.NODE_ENV,
}