/**
 * WhatsApp-specific Configuration
 * 
 * Configuration for WhatsApp bot functionality.
 * Only loaded when WhatsApp features are needed.
 */

// WhatsApp Environment validation
function validateWhatsAppEnv() {
	const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
	const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

	if (!accessToken) {
		throw new Error('❌ WHATSAPP_ACCESS_TOKEN environment variable not set!');
	}

	if (!verifyToken) {
		throw new Error('❌ WHATSAPP_VERIFY_TOKEN environment variable not set!');
	}

	return { accessToken, verifyToken };
}

// WhatsApp Configuration
let envTokens: { ACCESS_TOKEN: string; VERIFY_TOKEN: string } | null = null;

export const WHATSAPP_CONFIG = {
	// Environment variable
	get ACCESS_TOKEN() {
		if (!envTokens) {
			const { accessToken, verifyToken } = validateWhatsAppEnv();
			envTokens = { ACCESS_TOKEN: accessToken, VERIFY_TOKEN: verifyToken };
		}
		return envTokens.ACCESS_TOKEN;
	},

	get VERIFY_TOKEN() {
		if (!envTokens) {
			const { accessToken, verifyToken } = validateWhatsAppEnv();
			envTokens = { ACCESS_TOKEN: accessToken, VERIFY_TOKEN: verifyToken };
		}
		return envTokens.VERIFY_TOKEN;
	},

	// Static configuration
	MESSAGE_MAX_LENGTH: 4000, // Safe limit (actual API limit is 4096)
	BUTTON_MESSAGE_MAX_LENGTH: 1024, // WhatsApp Interactive Messages body text limit
	API_VERSION: 'v23.0' as const,
	MESSAGE_DELAY_BETWEEN_CHUNKS: 1200, // milliseconds
	BUTTON_DELAY: 500, // milliseconds

	// Memory management for WhatsApp specific features
	MEMORY: {
		PROCESSED_IDS_MAX_SIZE: 10_000,
		PROCESSED_IDS_CLEANUP_SIZE: 5_000,
		LAST_SEEN_MAX_SIZE: 1_000,
		LAST_SEEN_CLEANUP_SIZE: 500
	},

	// Time constants for WhatsApp features
	TIME: {
		REINTRO_MS: 12 * 60 * 60 * 1000, // 12 hours
		REQUEST_TIMEOUT: 10_000 // milliseconds
	},

	// Feature flags for WhatsApp functionality
	FEATURES: {
		SPECIAL_MESSAGES_ENABLED: process.env.SPECIAL_MESSAGES_ENABLED === 'true'
	}
} as const;