/**
 * Intent Detection System for Hayalhanem Video Recommender Bot
 * 
 * This module handles natural language intent detection for Turkish WhatsApp messages.
 * It analyzes user input to determine what type of content they're requesting.
 * 
 * Supported Intents:
 * - 'short': User wants a short video recommendation
 * - 'long': User wants a long/detailed video recommendation  
 * - 'info': User wants information about the bot or help
 * - 'unknown': User input doesn't match any known intent
 * 
 * The system is designed to be flexible and handle various ways users might
 * express their requests in casual Turkish conversation.
 */

const INTENT_WORDS: Record<Exclude<DetectedIntent, 'unknown'>, string[]> = {
	info: ['bilgi', 'info', 'help', 'yardım', 'komut', 'tanıtım', 'geliştirici', 'yazılımcı', 'kimsin'],
	short: ['kısa', 'short', 'reels'],
	long: ['uzun', 'long', 'detaylı', 'ayrıntılı']
};

export function detectIntent(input: string | null | undefined): DetectedIntent {
	const raw = (input ?? '').trim();
	if (!raw.length) return 'unknown';

	const text = normalizeText(raw);

	for (const [intent, words] of Object.entries(INTENT_WORDS)) {
		if (includesAny(text, words)) {
			return intent as DetectedIntent;
		}
	}

	return 'unknown';
}

function normalizeText(s: string): string {
	return s
		.toLowerCase()
		.replace(/ı/g, 'i')
		.replace(/İ/g, 'i')
		.replace(/ş/g, 's')
		.replace(/ç/g, 'c')
		.replace(/ğ/g, 'g')
		.replace(/ö/g, 'o')
		.replace(/ü/g, 'u')
		.replace(/[~_*`]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

function includesAny(haystack: string, needles: string[]): boolean {
	for (const n of needles) {
		if (haystack.includes(normalizeText(n))) return true;
	}
	return false;
}

export type DetectedIntent = 'short' | 'long' | 'info' | 'unknown';
