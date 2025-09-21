import { loadVideoList, pickRandom, type Variant, type VideoItem } from './store.js';
import { detectIntent } from './intent.js';
import {
	introText,
	infoBlock,
	videoBlock,
	unknownCommandText,
	commandsText
} from './templates.js';

// 12 hours re-introduction window
const REINTRO_MS = 12 * 60 * 60 * 1000;
// ephemeral per-process memory (can switch to persistent later)
const lastSeen = new Map<string, number>();

export async function handleIncoming(msg: IncomingMessage): Promise<string> {
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

	switch (intent) {
		case 'info':
			return infoBlock();

		case 'short':
			return await handleVideoRequest('short');

		case 'long':
			return await handleVideoRequest('long');

		default:
			return isNewOrReturning
				? await createWelcomeMessage(name, from)
				: unknownCommandText();
	}
}

async function handleVideoRequest(variant: Variant): Promise<string> {
	const video = await getRecommendation(variant);

	if (!video) {
		const videoType = variant === 'short' ? 'kısa' : 'uzun';
		return `Şu an ${videoType} video bulamadım. Lütfen daha sonra tekrar deneyin.`;
	}

	return videoBlock(video);
}

async function createWelcomeMessage(name: string | undefined, from: string): Promise<string> {
	const shortVideo = await getRecommendation('short');

	const parts = [
		await introText(name ?? '', from),
		'',
		shortVideo
			? videoBlock(shortVideo)
			: 'Şu an kısa video bulamadım. Lütfen daha sonra tekrar deneyin.',
		'',
		commandsText()
	];

	return parts.join('\n');
}

async function getRecommendation(variant: Variant): Promise<VideoItem | undefined> {
	try {
		const list = await loadVideoList(variant);
		return list?.length ? pickRandom(list) : undefined;
	} catch (error) {
		console.error(`❌ Error loading ${variant} videos:`, error);
		return undefined;
	}
}

export interface IncomingMessage {
	from: string;
	text?: string | null;
	timestamp: number;
	name?: string;
}