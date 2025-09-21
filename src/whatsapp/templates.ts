/**
 * WhatsApp Message Templates for Hayalhanem Video Recommender Bot
 * 
 * This file contains all message templates and text generation functions
 * specifically customized for the Hayalhanem video recommendation bot.
 * 
 * The bot is designed to:
 * - Recommend videos from Hayalhanem YouTube channel
 * - Provide personalized greetings based on Turkish timezone
 * - Support special messages for specific users
 * - Handle video requests (short/long format)
 * - Provide help and information about the bot
 * 
 * All messages are in Turkish and follow WhatsApp formatting conventions.
 */

import { consumeSpecialMessageFIFO, type VideoItem } from './store.js';

const SPECIAL_MESSAGES_ENABLED = process.env.SPECIAL_MESSAGES_ENABLED === 'true';

export function greetingByHour(d: Date): string {
	const h = getHourTR(d);

	if (h >= 5 && h < 12) return 'Hayırlı sabahlar dilerim. 🌅';
	if (h >= 12 && h < 18) return 'Hayırlı günler dilerim. ☀️';
	if (h >= 18 && h < 23) return 'Hayırlı akşamlar dilerim. 🌇';

	return 'Hayırlı geceler dilerim. 🌙';
}

export async function introText(
	name: string,
	from: string,
): Promise<string> {
	const who = name && name.trim().length > 0 ? `, ${sanitizeWhatsApp(name)}` : '';
	const wish = greetingByHour(new Date());

	const parts = [
		`Selamün aleyküm${who}! ${wish}`,
		'🤖 Ben *Hayalhanem* videolarını öneren *henüz test sürecinde* olan bir robotum!',
	];

	if (SPECIAL_MESSAGES_ENABLED) {
		const special = await consumeSpecialMessageFIFO(from);
		if (special) {
			parts.push('');
			parts.push(`*_Robottan Sana Özel Mesaj:_* ${special}`);
		}
	}

	parts.push('');
	parts.push('🤲 Bugün nasibinde olan videoyu sana aşağıda sunuyorum:');

	return parts.join('\n');
}

export function infoBlock(): string {
	return [
		'🤖 *Ben Hayalhanem videolarını öneren henüz test sürecinde olan bir robotum!*',
		'',
		'✨ Bu benim ilk ve henüz basit versiyonum. Geliştiricilerim tarafından geliştirilmeye devam ediyorum.',
		'🛠️ Tamamen gönüllülük esasıyla *Erkan P.* tarafından açık kaynaklı bir proje olarak geliştiriliyorum.',
		'📬 Gelişimime katkı sağlamak ya da hata/öneri bildirmek istersen:',
		'👉 dryapptr@gmail.com adresinden ulaşabilirsin.',
		'',
		'⚡ Aşağıdaki komut sistemini kullanarak beni deneyebilirsin:',
		'',
		commandsText()
	].join('\n');
}

export function videoBlock(video: VideoItem): string {
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
		parts.push(`_${sanitizeWhatsApp(description)}_`);
	}

	parts.push('');
	parts.push('📢 Beni beğendiysen arkadaşlarınla paylaşabilirsin. 🤝');

	return parts.join('\n');
}

export function commandsText(): string {
	return [
		'🤖 *Beni Nasıl Kullanabilirsin?*',
		'🎬 Kısa video önermemi istiyorsan: *_"kısa video öner"_* benzeri bir cümle yazabilirsin.',
		'📺 Uzun bir video önermemi istersen: *_"uzun video öner"_* benzeri bir cümle yazabilirsin.',
		'ℹ️ Beni tanımak ve hakkımda bilgi almak için: *_"bilgi istiyorum"_* benzeri bir cümle yazabilirsin.',
	].join('\n');
}

export function unknownCommandText(): string {
	return [
		'Maalesef isteğinizi anlayamadım 🙏',
		'Lütfen aşağıdaki örneklerden birini deneyiniz:',
		'',
		commandsText(),
	].join('\n');
}

function sanitizeWhatsApp(s?: string): string {
	const x = String(s ?? '');
	return x.replace(/[*_~`]/g, '');
}

function getHourTR(d: Date): number {
	const fmt = new Intl.DateTimeFormat('tr-TR', {
		hour: 'numeric',
		hour12: false,
		timeZone: 'Europe/Istanbul'
	});

	return parseInt(fmt.format(d), 10);
}
