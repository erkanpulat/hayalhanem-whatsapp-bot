import type { VideoItem } from '../types/video.js';
import { sanitizeWhatsApp } from '../utils/text-utils.js';
import { WHATSAPP_MESSAGE_MAX_LENGTH } from './api.js';

export { sanitizeWhatsApp };

/**
 * Get Unicode-safe character count using grapheme clusters
 */
export function getGraphemeLength(text: string): number {
	const segmenter = new Intl.Segmenter('tr', { granularity: 'grapheme' });
	return Array.from(segmenter.segment(text)).length;
}

/**
 * Split text safely for WhatsApp API character limit
 * Preserves Unicode characters (emojis, combined characters) safely
 */
export function splitTextSafely(
	text: string,
	maxLength: number = WHATSAPP_MESSAGE_MAX_LENGTH,
	addChunkLabels: boolean = true
): MessageChunk[] {
	if (getGraphemeLength(text) <= maxLength) {
		return [{
			text,
			chunkIndex: 1,
			totalChunks: 1
		}];
	}

	const segmenter = new Intl.Segmenter('tr', { granularity: 'grapheme' });
	const graphemes = Array.from(segmenter.segment(text)).map(s => s.segment);

	const chunks: string[] = [];
	let currentChunk = '';
	let currentLength = 0;

	for (const grapheme of graphemes) {
		if (currentLength + 1 > maxLength && currentChunk.length > 0) {
			chunks.push(currentChunk.trim());
			currentChunk = '';
			currentLength = 0;
		}

		currentChunk += grapheme;
		currentLength++;
	}

	if (currentChunk.trim().length > 0) {
		chunks.push(currentChunk.trim());
	}

	if (addChunkLabels && chunks.length > 1) {
		return chunks.map((chunk, index) => ({
			text: `${chunk}\n\n📄 *(${index + 1}/${chunks.length})*`,
			chunkIndex: index + 1,
			totalChunks: chunks.length
		}));
	}

	return chunks.map((chunk, index) => ({
		text: chunk,
		chunkIndex: index + 1,
		totalChunks: chunks.length
	}));
}

/**
 * Split text intelligently considering word boundaries (ideal for Risale texts)
 */
export function splitTextIntelligently(
	text: string,
	maxLength: number = WHATSAPP_MESSAGE_MAX_LENGTH,
	addChunkLabels: boolean = true
): MessageChunk[] {
	if (getGraphemeLength(text) <= maxLength) {
		return [{
			text,
			chunkIndex: 1,
			totalChunks: 1
		}];
	}

	const chunks: string[] = [];
	const paragraphs = text.split(/\n\s*\n/);

	let currentChunk = '';

	for (const paragraph of paragraphs) {
		const paragraphLength = getGraphemeLength(paragraph);
		const currentChunkLength = getGraphemeLength(currentChunk);

		if (paragraphLength > maxLength) {
			if (currentChunk.trim()) {
				chunks.push(currentChunk.trim());
				currentChunk = '';
			}

			const sentences = paragraph.split(/(?<=[.!?])\s+/);

			for (const sentence of sentences) {
				const sentenceLength = getGraphemeLength(sentence);
				const tempChunkLength = getGraphemeLength(currentChunk);

				if (tempChunkLength + sentenceLength + 2 > maxLength && currentChunk) {
					chunks.push(currentChunk.trim());
					currentChunk = sentence;
				} else {
					currentChunk += (currentChunk ? ' ' : '') + sentence;
				}
			}
		}
		else if (currentChunkLength + paragraphLength + 2 > maxLength && currentChunk) {
			chunks.push(currentChunk.trim());
			currentChunk = paragraph;
		} else {
			currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
		}
	}

	if (currentChunk.trim()) {
		chunks.push(currentChunk.trim());
	}

	if (addChunkLabels && chunks.length > 1) {
		return chunks.map((chunk, index) => ({
			text: `${chunk}\n\n📖 *(${index + 1}/${chunks.length})*`,
			chunkIndex: index + 1,
			totalChunks: chunks.length
		}));
	}

	return chunks.map((chunk, index) => ({
		text: chunk,
		chunkIndex: index + 1,
		totalChunks: chunks.length
	}));
}

export function createVideoBlock(video: VideoItem): string {
	const title = sanitizeWhatsApp(video.title || 'Başlıksız Video');

	const parts = [
		`🎬 *Video adı:* *${title}*`,
		'',
		`🔗 *Video linki:* ${video.url || ''}`
	];

	// Add description if available
	const description = (video.description ?? '').trim();
	if (description) {
		parts.push('');
		parts.push('📝 *Video Açıklaması:*');
		parts.push(`${sanitizeWhatsApp(description)}`);
	}

	return parts.join('\n');
}

interface MessageChunk {
	text: string;
	chunkIndex: number;
	totalChunks: number;
}
