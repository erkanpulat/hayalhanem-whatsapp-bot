/**
 * WhatsApp Utilities
 * 
 * Shared utility functions for WhatsApp message formatting
 */

import type { VideoItem } from '../types/video.js';

export function sanitizeWhatsApp(s?: string): string {
	const x = String(s ?? '');
	return x.replace(/[*_~`]/g, '');
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