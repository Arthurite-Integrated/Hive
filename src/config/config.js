import { env } from "#config/env";

export const config = {
	jwt: {
		privateKey: env.JWT_PRIVATE_KEY,
		publicKey: env.JWT_PUBLIC_KEY,
		expiresIn: env.JWT_EXPIRES_IN,
		refreshExpiresIn: env.REFRESH_TOKEN_EXPIRES_IN,
		issuer: env.JWT_ISSUER,
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
		serverDomain: env.SERVER_DOMAIN,
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
		configId: env.FACEBOOK_CONFIG_ID,
	},
	encryption: {
		key: env.ENCRYPTION_KEY,
	},
	resend: {
		apiKey: env.RESEND_API_KEY,
		email: env.RESEND_EMAIL,
	},

	aws: {
		region: env.AWS_REGION,
		accessKeyId: env.AWS_ACCESS_KEY_ID,
		secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
		s3: {
			bucket: env.AWS_S3_BUCKET,
			bucketPrivate: env.AWS_S3_BUCKET_PRIVATE,
			endpoint: env.AWS_S3_ENDPOINT,
		},
		cloudfront: {
			domain: env.AWS_CLOUDFRONT_DOMAIN,
			keyPairId: env.AWS_CLOUDFRONT_KEY_PAIR_ID,
			privateKey: env.AWS_CLOUDFRONT_PRIVATE_KEY,
		},
		mediaConvert: {
			endpoint: env.AWS_MEDIACONVERT_ENDPOINT,
			roleArn: env.AWS_MEDIACONVERT_ROLE_ARN,
		},
	},

	// Legacy alias — existing code references config.s3.*
	s3: {
		region: env.AWS_REGION,
		accessKeyId: env.AWS_ACCESS_KEY_ID,
		secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
		bucket: env.AWS_S3_BUCKET,
		endpoint: env.AWS_S3_ENDPOINT,
	},

	paystack: {
		secretKey: env.PAYSTACK_SECRET_KEY,
		publicKey: env.PAYSTACK_PUBLIC_KEY,
		webhookSecret: env.PAYSTACK_WEBHOOK_SECRET,
	},
	flutterwave: {
		secretKey: env.FLW_SECRET_KEY,
		publicKey: env.FLW_PUBLIC_KEY,
		webhookHash: env.FLW_WEBHOOK_HASH,
	},
	stripe: {
		secretKey: env.STRIPE_SECRET_KEY,
		publicKey: env.STRIPE_PUBLIC_KEY,
		webhookSecret: env.STRIPE_WEBHOOK_SECRET,
	},

	notifications: {
		fcmServerKey: env.FCM_SERVER_KEY,
		fcmServiceAccount: env.FCM_SERVICE_ACCOUNT_JSON,
		termiiApiKey: env.TERMII_API_KEY,
	},

	features: {
		payments: env.FEATURE_PAYMENTS,
		liveClasses: env.FEATURE_LIVE_CLASSES,
		certificates: env.FEATURE_CERTIFICATES,
		referrals: env.FEATURE_REFERRALS,
	},

	env: env.NODE_ENV,
};
