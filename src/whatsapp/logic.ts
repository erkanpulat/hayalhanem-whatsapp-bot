import type { IncomingMessage } from '../types/whatsapp.js';
import { detectIntent } from './intent.js';
import {
	buildWelcomeMessage,
	buildCommandResponse,
	unknownCommandText,
	createInfoContent
} from './templates.js';
import { handleRisale } from './handlers/risale.handler.js';
import { handleVideoRequest } from './handlers/video.handler.js';

// 12 hours re-introduction window
const REINTRO_MS = 12 * 60 * 60 * 1000;
// ephemeral per-process memory (can switch to persistent later)
const lastSeen = new Map<string, number>();

export async function handleIncoming(msg: IncomingMessage): Promise<{ response: string, previewUrl: boolean }> {
	const { from, text, timestamp, name } = msg;
	const cleanText = (text ?? '').trim();

	const intent = detectIntent(cleanText);

	const prevSeen = lastSeen.get(from);
	lastSeen.set(from, timestamp);
	// Memory management - keep newest 500 users if over 1000
	if (lastSeen.size > 1000) {
		const newest500 = Array.from(lastSeen.entries())
			.sort(([, a], [, b]) => b - a)
			.slice(0, 500);

		lastSeen.clear();
		newest500.forEach(([user, ts]) => lastSeen.set(user, ts));
	}
	const isNewOrReturning = !prevSeen || (timestamp - prevSeen) >= REINTRO_MS;

	// Risale content should not show URL preview, others should
	const previewUrl = intent !== 'risale';

	// Handle all intents with proper greeting for new/returning users
	switch (intent) {
		case 'risale':
			const risaleContent = await handleRisale(cleanText);
			return {
				response: isNewOrReturning
					? await buildWelcomeMessage(name, from, risaleContent)
					: await buildCommandResponse(from, risaleContent),
				previewUrl
			};

		case 'info':
			const infoContent = createInfoContent();
			return {
				response: isNewOrReturning
					? await buildWelcomeMessage(name, from, infoContent)
					: await buildCommandResponse(from, infoContent, true),
				previewUrl
			};

		case 'short':
			const shortContent = await handleVideoRequest('short');
			return {
				response: isNewOrReturning
					? await buildWelcomeMessage(name, from, shortContent)
					: await buildCommandResponse(from, shortContent),
				previewUrl
			};

		case 'long':
			const longContent = await handleVideoRequest('long');
			return {
				response: isNewOrReturning
					? await buildWelcomeMessage(name, from, longContent)
					: await buildCommandResponse(from, longContent),
				previewUrl
			};

		default:
			return {
				response: isNewOrReturning
					? await buildWelcomeMessage(name, from)
					: unknownCommandText(),
				previewUrl
			};
	}
}