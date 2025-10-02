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

	try {
		const special = await consumeSpecialMessageFIFO(from);
		if (!special) return '';

		return `*_Robottan Sana Özel Mesaj:_* ${special}`;
	} catch (error) {
		console.error('❌ Error loading special message:', error);
		return ''; // Gracefully return empty instead of failing
	}
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
		'',
		'🎬 *Hayalhanem YouTube Videoları:*',
		'• `/hayalhanemkisavideo` → 90 saniyeye kadar kısa bir video öneririm.',
		'• `/hayalhanemuzunvideo` → 90 saniyeden uzun bir video öneririm.',
		'💡 Doğal dil ile de istekte bulunabilirsin: *_"Kısa video önerir misin?"_*, *_"uzun video gönder"_* gibi.',
		'',
		'📖 *Risale-i Nur - Sözler Kitabı:*',
		'• `/risale` → Risale komutları için yardım menüsünü gösterir.',
		'• `/risaleicindekiler` → Sözler Kitabı’nın içindekiler listesini ve sayfa numaralarını gösterir.',
		'• `/risalekelimeler` → Rastgele 15 kelime seçerek kelime çalışması yapmanı sağlar.',
		'• `/risalesozler 9` → 9. Söz’ün *1. sayfasını* açar (varsayılan: anlamlar açık).',
		'• `/risalesozler 9 sayfa 2 kapalı` → 9. Söz’ün *2. sayfasını* açar, *anlamları kapalı olarak açar ve bilinmeyen kelimeleri sayfa sonunda listeler.*',
		'• `/risalesozlersayfa 421` → *Sözler Kitabı’nın 421. sayfasını* açar (varsayılan: anlamlar açık).',
		'💡 Doğal dil ile de istekte bulunabilirsin: *_"risale sözler 9 kapalı"_*, *_"risale sözler sayfa 421"_* gibi.',
		'',
		'ℹ️ *Genel:*',
		'• `/bilgi` → Bot hakkında bilgi ve komut listesini gösterir.',
		'',
		'✨ İpucu: Slash komutlarını yazmak zorunda değilsin; doğal dilde konuşman da yeterli!'
	].join('\n');
}


/**
 * Sharing footer message
 */
export function createSharingFooter(): string {
	return '📢 Hoşuna gittiysem, profilime dokunup arkadaşlarınla da tanıştırabilirsin! 🤗';
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
		'🤖 *Ben, Hayalhanem YouTube kanallarından videolar öneren ve Risale-i Nur Sözler Kitabı’ndan okumalar sunan bir sohbet robotuyum!*',
		'',
		'✨ Bu benim henüz ilk sürümüm ve hâlâ geliştirilmeye devam ediyorum.',
		'🛠️ Tamamen gönüllülük esasıyla *Erkan Pulat* tarafından açık kaynaklı bir proje olarak geliştiriliyorum.',
		'📬 Hata ya da önerilerini iletmek veya projeye katkı sağlamak istersen:',
		'👉 dryapptr@gmail.com adresinden bize ulaşabilirsin.',
		'',
		'🎬 *Neler yapabilirim:*',
		'• *Hayalhanem YouTube kanallarından* 90 saniyeye kadar *kısa video* önerebilirim.',
		'• *Hayalhanem YouTube kanallarından* 90 saniyeden *uzun video* önerebilirim.',
		'• *Risale-i Nur Sözler Kitabı’ndan* sayfa sayfa okuma yapmanı *kolayca sağlayabilirim.*',
		'• Risale’de *anlam açık* veya *anlam kapalı* okuma yapabilir; *anlam kapalı* modunda bilinmeyen kelimeleri sayfa sonunda gösterebilirim.',
		'• Risale-i Nur *Sözler Kitabı’ndan* rastgele 15 kelime seçerek kelime çalışması yapmanı sağlayabilirim.',
	].join('\n');
}
