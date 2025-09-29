/**
 * WhatsApp Message Templates for Hayalhanem Video Recommender Bot
 * 
 * This file contains shared message templates and building blocks
 */

import { consumeSpecialMessageFIFO, videoService } from '../services/video.service.js';
import { sanitizeWhatsApp } from '../utils/text-utils.js';
import { createVideoBlock } from './utils.js';

const SPECIAL_MESSAGES_ENABLED = process.env.SPECIAL_MESSAGES_ENABLED === 'true';

const TIME_GREETINGS = {
	MORNING: { start: 5, end: 12, message: 'Hayırlı sabahlar dilerim. 🌅' },
	DAY: { start: 12, end: 18, message: 'Hayırlı günler dilerim. ☀️' },
	EVENING: { start: 18, end: 23, message: 'Hayırlı akşamlar dilerim. 🌇' },
	NIGHT: { message: 'Hayırlı geceler dilerim. 🌙' }
} as const;

/**
 * Standard greeting with time-based message
 */
export function createGreeting(name?: string): string {
	const who = name && name.trim().length ? `, ${sanitizeWhatsApp(name)}` : '';
	const wish = greetingByHour(new Date());

	return `Selamün aleyküm${who}! ${wish}`;
}

/**
 * Bot introduction message
 */
export function createBotIntro(): string {
	return '🤖 Ben *henüz test sürecinde* olan bir robotum! Mesajın sonunda yer alan komutlara göz atarak beni nasıl kullanabileceğini öğrenebilirsin!';
}

/**
 * Special message section (if available)
 */
export async function createSpecialMessageSection(from: string): Promise<string> {
	if (!SPECIAL_MESSAGES_ENABLED) {
		return '';
	}

	const special = await consumeSpecialMessageFIFO(from);
	if (!special) return '';

	return `*_Robottan Sana Özel Mesaj:_* ${special}`;
}

/**
 * Default content intro (when no specific command)
 */
export function createDefaultContentIntro(): string {
	return '🤲 Bugün nasibinde olan videoyu sana aşağıda sunuyorum:';
}

/**
 * Commands help section
 */
export function createCommandsSection(): string {
	return [
		'🤖 *Beni Nasıl Kullanabilirsin?*',
		'🎬 Hayalhanem kanallarından kısa video önermemi istiyorsan:',
		'   • `/kisavideo` komutu veya',
		'   • *_"Kısa video öner"_* benzeri bir cümle yazabilirsin.',
		'📺 Hayalhanem kanallarından uzun video önermemi istersen:', 
		'   • `/uzunvideo` komutu veya',
		'   • *_"Uzun video öner"_* benzeri bir cümle yazabilirsin.',
		'📖 Risale-i Nur okumak için:',
		'   • `/risale` komutu veya',
		'   • *_"risale söz 18"_* veya *_"risale sayfa 421"_* yazabilirsin.',
		'ℹ️ Beni tanımak ve hakkımda bilgi almak için:',
		'   • `/bilgi` komutu veya', 
		'   • *_"bilgi istiyorum"_* benzeri bir cümle yazabilirsin.',
		'',
		'💡 *İpucu:* Bana doğal bir şekilde konuşabilirsin! "Kısa bir video önerir misin?" gibi cümleleri de anlıyorum.'
	].join('\n');
}

/**
 * Sharing footer message
 */
export function createSharingFooter(): string {
	return '📢 Beni beğendiysen profilime tıklayarak beni arkadaşlarınla paylaşabilirsin. 🤝';
}

/**
 * Build a complete welcome message with all sections
 */
export async function buildWelcomeMessage(
	name: string | undefined,
	from: string,
	contentSection?: string
): Promise<string> {
	const parts = [
		createGreeting(name),
		createBotIntro()
	];

	// Add special message if available
	const specialMessage = await createSpecialMessageSection(from);
	if (specialMessage) {
		parts.push('', specialMessage);
	}

	// Add content section (video, risale, etc.) or get default video
	parts.push('');
	if (contentSection) {
		parts.push(contentSection);
	} else {
		parts.push(createDefaultContentIntro());

		// Try to get a short video for new users
		const shortVideo = await videoService.getRecommendation('short');
		if (shortVideo) {
			parts.push('', createVideoBlock(shortVideo));
		} else {
			parts.push('', 'Şu an kısa video bulamadım. Lütfen daha sonra tekrar deneyin.');
		}
	}

	// Add commands help
	parts.push('', createCommandsSection());

	// Add sharing footer
	parts.push('', createSharingFooter());

	return parts.join('\n');
}

/**
 * Build response message for specific commands
 */
export async function buildCommandResponse(
	from: string,
	contentSection: string,
	includeCommands: boolean = false
): Promise<string> {
	const parts = [];

	// Add special message if available (for returning users too)
	const specialMessage = await createSpecialMessageSection(from);
	if (specialMessage) {
		parts.push(specialMessage, '');
	}

	// Add main content
	parts.push(contentSection);

	// Add commands help if requested
	if (includeCommands) {
		parts.push('', createCommandsSection());
	}

	// Add sharing footer
	parts.push('', createSharingFooter());

	return parts.join('\n');
}

// Legacy functions for backward compatibility
export function unknownCommandText(): string {
	return [
		'Maalesef isteğinizi anlayamadım 🙏',
		'Lütfen aşağıdaki örneklerden birini deneyiniz:',
		'',
		createCommandsSection(),
	].join('\n');
}

function greetingByHour(d: Date): string {
	const h = getHourTR(d);

	if (h >= TIME_GREETINGS.MORNING.start && h < TIME_GREETINGS.MORNING.end) {
		return TIME_GREETINGS.MORNING.message;
	}
	if (h >= TIME_GREETINGS.DAY.start && h < TIME_GREETINGS.DAY.end) {
		return TIME_GREETINGS.DAY.message;
	}
	if (h >= TIME_GREETINGS.EVENING.start && h < TIME_GREETINGS.EVENING.end) {
		return TIME_GREETINGS.EVENING.message;
	}

	return TIME_GREETINGS.NIGHT.message;
}

function getHourTR(d: Date): number {
	const fmt = new Intl.DateTimeFormat('tr-TR', {
		hour: 'numeric',
		hour12: false,
		timeZone: 'Europe/Istanbul'
	});

	return parseInt(fmt.format(d), 10);
}

/**
 * Bot information and developer contact details
 */
export function createInfoContent(): string {
	return [
		'🤖 *Ben Hayalhanem videolarını öneren ve Risale-i Nur içeriklerini paylaşan henüz test sürecinde olan bir robotum!*',
		'',
		'✨ Bu benim ilk ve henüz basit versiyonum. Geliştiricim tarafından geliştirilmeye devam ediyorum.',
		'🛠️ Tamamen gönüllülük esasıyla *Erkan Pulat* tarafından açık kaynaklı bir proje olarak geliştiriliyorum.',
		'📬 Gelişimime katkı sağlamak ya da hata/öneri bildirmek istersen:',
		'👉 dryapptr@gmail.com adresinden ulaşabilirsin.',
		'',
		'🎬 *Yapabileceklerim:*',
		'• Hayalhanem YouTube kanallarından 90 saniyeye kadar kısa bir video önerebilirim.',
		'• Hayalhanem YouTube kanallarından 90 saniyeden uzun bir video önerebilirim.',
		'• Risale-i Nur Sözler koleksiyonundan içerik paylaşabilirim.'
	].join('\n');
}
