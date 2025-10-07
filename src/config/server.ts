/**
 * Server Configuration
 * 
 * Configuration for Express.js server.
 */

export const SERVER_CONFIG = {
	PORT: Number(process.env.PORT ?? 3000),
	APP_NAME: process.env.APP_NAME ?? 'WhatsApp Bot'
} as const;