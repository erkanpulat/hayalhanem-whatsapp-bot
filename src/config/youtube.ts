/**
 * YouTube-specific Configuration
 * 
 * Configuration for YouTube data fetching functionality.
 * This can be used independently from WhatsApp functionality.
 * Only loads when explicitly requested.
 */

/**
 * Validate YouTube channel ID format
 */
function isValidYouTubeChannelId(channelId: string): boolean {
	const validPattern = /^UC[a-zA-Z0-9_-]{22}$/;
	return validPattern.test(channelId);
}

// YouTube Environment validation
function validateYouTubeEnv() {
	const youtubeApiKey = process.env.YOUTUBE_API_KEY;
	if (!youtubeApiKey) {
		throw new Error('❌ YOUTUBE_API_KEY environment variable not set!');
	}

	return youtubeApiKey;
}

function getChannelIds(): readonly string[] {
	const channelIds = process.env.YOUTUBE_CHANNEL_IDS;
	if (!channelIds) {
		throw new Error('❌ YOUTUBE_CHANNEL_IDS environment variable not set!');
	}

	const ids = channelIds.split(',').map(id => id.trim()).filter(Boolean);
	if (!ids.length) {
		throw new Error('❌ No valid channel IDs found in YOUTUBE_CHANNEL_IDS');
	}

	// Validate YouTube channel ID format using utility
	const invalidIds = ids.filter(id => !isValidYouTubeChannelId(id));
	if (invalidIds.length) {
		throw new Error(`❌ Invalid YouTube channel IDs: ${invalidIds.join(', ')}`);
	}

	console.log(`📺 Loaded ${ids.length} channels to fetch videos from`);

	return ids;
}

// Lazy-loaded YouTube Configuration - only env vars are lazy loaded
let envConfig: { API_KEY: string; CHANNEL_IDS: readonly string[] } | null = null;

export const YOUTUBE_CONFIG = {
	// Environment variables - lazy loaded
	get API_KEY(): string {
		if (!envConfig) {
			envConfig = {
				API_KEY: validateYouTubeEnv(),
				CHANNEL_IDS: getChannelIds()
			};
		}
		return envConfig.API_KEY;
	},

	get CHANNEL_IDS(): readonly string[] {
		if (!envConfig) {
			envConfig = {
				API_KEY: validateYouTubeEnv(),
				CHANNEL_IDS: getChannelIds()
			};
		}
		return envConfig.CHANNEL_IDS;
	},

	// Static configuration - no need for getters
	BASE_URL: 'https://www.googleapis.com/youtube/v3' as const,
	TIMEOUT: 10_000,
	BATCH_SIZES: {
		PLAYLIST_ITEMS: 50,
		VIDEO_DETAILS: 50
	} as const,
	SHORT_THRESHOLD_SEC: 90,

	// Time constants for YouTube operations
	TIME: {
		BACKOFF_MS: 30 * 60 * 1000 // 30 minutes
	}
} as const;