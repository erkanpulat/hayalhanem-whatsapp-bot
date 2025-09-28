import type { VideoItem } from '../types/video.js';
import { sanitizeWhatsApp } from '../utils/text-utils.js';

export { sanitizeWhatsApp };

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