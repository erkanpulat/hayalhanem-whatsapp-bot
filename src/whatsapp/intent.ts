/**
 * Intent Detection System for Hayalhanem Video Recommender Bot
 * 
 * This module handles natural language intent detection for Turkish WhatsApp messages.
 * It analyzes user input to determine what type of content or service they're requesting.
 * 
 * Supported Intents:
 * - 'short': User wants a short video recommendation (YouTube Shorts, Reels)
 * - 'long': User wants a long/detailed video recommendation  
 * - 'info': User wants information about the bot, help, or developer info
 * - 'risale': User wants to access Risale-i Nur content (Sözler collection)
 * - 'unknown': User input doesn't match any known intent
 * 
 * The system uses Turkish text normalization and flexible keyword matching
 * to handle various ways users might express their requests in casual conversation.
 */

import { normalizeText, textMatches } from '../utils/text-utils.js';

const INTENT_WORDS: Record<Exclude<DetectedIntent, 'unknown'>, string[]> = {
	info: ['bilgi', 'info', 'help', 'yardım', 'komut', 'tanıtım', 'geliştirici', 'yazılımcı', 'kimsin'],
	short: ['kısa', 'short', 'reels', 'kisavideo'],
	long: ['uzun', 'long', 'detaylı', 'ayrıntılı', 'uzunvideo'],
	risale: ['risale', 'rnk', 'külliyat'],
};

export function detectIntent(input: string | null | undefined): DetectedIntent {
	const raw = (input ?? '').trim();
	if (!raw.length) return 'unknown';

	const text = normalizeText(raw);

	for (const [intent, words] of Object.entries(INTENT_WORDS)) {
		if (textMatches(text, words)) {
			return intent as DetectedIntent;
		}
	}

	return 'unknown';
}

export type DetectedIntent = 'short' | 'long' | 'info' | 'risale' | 'unknown';
