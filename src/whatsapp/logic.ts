import type { IncomingMessage, WhatsAppResponse } from '../types/whatsapp.js';
import { detectIntent } from './intent.js';
import {
	buildWelcomeMessage,
	buildCommandResponse,
	unknownCommandText,
	createInfoContent
} from './templates.js';
import { handleRisale, handleRisaleCallback } from './handlers/risale.handler.js';
import { handleVideoRequest, handleVideoCallback } from './handlers/youtube.handler.js';
import { BUTTON_TEXTS, RESPONSE_MESSAGES } from './constants.js';
import { WHATSAPP_CONFIG } from '../config/whatsapp.js';

// Callback ID Constants  
export const CALLBACK_IDS = {
	// Video callbacks
	ANOTHER_SHORT: 'another_short',
	ANOTHER_LONG: 'another_long',
	SWITCH_TO_LONG: 'switch_to_long',
	SWITCH_TO_SHORT: 'switch_to_short',

	// Risale callbacks
	START_RISALE: 'start_risale',
	RISALE_TOC: 'risale_toc',
	RISALE_HELP: 'risale_help',
	RISALE_RANDOM: 'risale_random',
	RISALE_WORD_PRACTICE: 'another_word_batch',

	// Navigation callbacks
	PREV_PAGE: 'prev_page',
	NEXT_PAGE: 'next_page',
	BACK_TO_TOC: 'back_to_toc',
	BACK_TO_RISALE: 'back_to_risale',
	BACK_TO_HELP: 'back_to_help',
	SEARCH_WORD: 'search_word',

	// Welcome/General callbacks
	GET_SHORT_VIDEO: 'get_short_video',
	GET_LONG_VIDEO: 'get_long_video',
	SHOW_INFO: 'show_info'
} as const;

// ephemeral per-process memory (can switch to persistent later)
const lastSeen = new Map<string, number>();

export async function handleIncoming(msg: IncomingMessage): Promise<WhatsAppResponse & { previewUrl: boolean }> {
	const { from, text, timestamp, name } = msg;
	const cleanText = (text ?? '').trim();

	const intent = detectIntent(cleanText);

	const prevSeen = lastSeen.get(from);
	lastSeen.set(from, timestamp);
	// Memory management - keep newest users if over limit
	if (lastSeen.size > WHATSAPP_CONFIG.MEMORY.LAST_SEEN_MAX_SIZE) {
		const newestUsers = Array.from(lastSeen.entries())
			.sort(([, a], [, b]) => b - a)
			.slice(0, WHATSAPP_CONFIG.MEMORY.LAST_SEEN_CLEANUP_SIZE);

		lastSeen.clear();
		newestUsers.forEach(([user, ts]) => lastSeen.set(user, ts));
	}
	const isNewOrReturning = !prevSeen || (timestamp - prevSeen) >= WHATSAPP_CONFIG.TIME.REINTRO_MS;

	// Risale content should not show URL preview, others should
	const previewUrl = intent !== 'risale';

	// Handle all intents with proper greeting for new/returning users
	switch (intent) {
		case 'risale':
			const risaleContent = await handleRisale(cleanText);
			const risaleResponse = isNewOrReturning
				? await buildWelcomeMessage(name, from, risaleContent.text)
				: await buildCommandResponse(from, risaleContent.text);
			return risaleContent.buttons
				? { text: risaleResponse, buttons: risaleContent.buttons, previewUrl }
				: { text: risaleResponse, previewUrl };

		case 'info':
			const infoContent = createInfoContent();
			const infoResponse = isNewOrReturning
				? await buildWelcomeMessage(name, from, infoContent)
				: await buildCommandResponse(from, infoContent, true);

			// Add navigation buttons after showing info
			const infoButtons = [
				{
					id: CALLBACK_IDS.GET_SHORT_VIDEO,
					title: BUTTON_TEXTS.SHORT_VIDEO,
					type: 'reply' as const
				},
				{
					id: CALLBACK_IDS.GET_LONG_VIDEO,
					title: BUTTON_TEXTS.LONG_VIDEO,
					type: 'reply' as const
				},
				{
					id: CALLBACK_IDS.START_RISALE,
					title: BUTTON_TEXTS.RISALE_READ,
					type: 'reply' as const
				}
			];

			return {
				text: infoResponse,
				buttons: infoButtons,
				previewUrl
			};

		case 'short':
			const shortContent = await handleVideoRequest('short');
			const shortResponse = isNewOrReturning
				? await buildWelcomeMessage(name, from, shortContent.text)
				: await buildCommandResponse(from, shortContent.text);
			return shortContent.buttons
				? { text: shortResponse, buttons: shortContent.buttons, previewUrl }
				: { text: shortResponse, previewUrl };

		case 'long':
			const longContent = await handleVideoRequest('long');
			const longResponse = isNewOrReturning
				? await buildWelcomeMessage(name, from, longContent.text)
				: await buildCommandResponse(from, longContent.text);
			return longContent.buttons
				? { text: longResponse, buttons: longContent.buttons, previewUrl }
				: { text: longResponse, previewUrl };

		default:
			const defaultResponse = isNewOrReturning
				? await buildWelcomeMessage(name, from)
				: unknownCommandText();

			// Add welcome/general buttons
			const welcomeButtons = [
				{
					id: CALLBACK_IDS.GET_SHORT_VIDEO,
					title: BUTTON_TEXTS.SHORT_VIDEO,
					type: 'reply' as const
				},
				{
					id: CALLBACK_IDS.GET_LONG_VIDEO,
					title: BUTTON_TEXTS.LONG_VIDEO,
					type: 'reply' as const
				},
				{
					id: CALLBACK_IDS.START_RISALE,
					title: BUTTON_TEXTS.RISALE_READ,
					type: 'reply' as const
				}
			];

			return {
				text: defaultResponse,
				buttons: welcomeButtons,
				previewUrl
			};
	}
}

export async function handleCallback(callbackId: string): Promise<WhatsAppResponse> {
	try {
		// Handle simple callbacks first
		if (callbackId === CALLBACK_IDS.GET_SHORT_VIDEO) {
			return await handleVideoRequest('short');
		}
		if (callbackId === CALLBACK_IDS.GET_LONG_VIDEO) {
			return await handleVideoRequest('long');
		}
		if (callbackId === CALLBACK_IDS.SHOW_INFO) {
			const infoButtons = [
				{
					id: CALLBACK_IDS.GET_SHORT_VIDEO,
					title: BUTTON_TEXTS.SHORT_VIDEO,
					type: 'reply' as const
				},
				{
					id: CALLBACK_IDS.GET_LONG_VIDEO,
					title: BUTTON_TEXTS.LONG_VIDEO,
					type: 'reply' as const
				},
				{
					id: CALLBACK_IDS.START_RISALE,
					title: BUTTON_TEXTS.RISALE_READ,
					type: 'reply' as const
				}
			];
			return {
				text: RESPONSE_MESSAGES.BOT_INFO,
				buttons: infoButtons
			};
		}

		// Check if it's a risale callback
		if (callbackId.includes('page') || callbackId.includes('meanings') || callbackId.includes('word') || callbackId === 'start_risale' || callbackId === CALLBACK_IDS.RISALE_HELP || callbackId === CALLBACK_IDS.RISALE_TOC || callbackId === CALLBACK_IDS.RISALE_RANDOM || callbackId === CALLBACK_IDS.RISALE_WORD_PRACTICE) {
			return await handleRisaleCallback(callbackId);
		}

		// Check if it's a video callback
		if (callbackId.includes('short') || callbackId.includes('long') || callbackId.includes('switch')) {
			return await handleVideoCallback(callbackId);
		}

		return { text: '❌ Bilinmeyen işlem.' };
	} catch (error) {
		console.error('❌ Error handling callback:', error);
		return { text: '❌ İşlem sırasında bir hata oluştu.' };
	}
}