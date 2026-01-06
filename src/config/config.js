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

  google: {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    redirectUri: env.GOOGLE_REDIRECT_URI,
  },
  
  facebook: {
    clientId: env.FACEBOOK_CLIENT_ID,
    clientSecret: env.FACEBOOK_CLIENT_SECRET,
    redirectUri: env.FACEBOOK_REDIRECT_URI,
  },
  
  apple: {
    clientId: env.APPLE_CLIENT_ID,
    teamId: env.APPLE_TEAM_ID,
    keyId: env.APPLE_KEY_ID,
    privateKey: env.APPLE_PRIVATE_KEY,
    redirectUri: env.APPLE_REDIRECT_URI,
  },
  

  encryption: {
    key: env.ENCRYPTION_KEY,
  },

  env: env.NODE_ENV,
}