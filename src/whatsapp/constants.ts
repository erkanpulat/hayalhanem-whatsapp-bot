/**
 * WhatsApp UI Constants
 * 
 * This file contains all button texts and UI-related constants
 * used across WhatsApp handlers and templates.
 */

// WhatsApp Button Text Constants
export const BUTTON_TEXTS = {
	// Video buttons
	VIDEO_ANOTHER_SHORT: '📹 Başka Kısa Video',
	VIDEO_ANOTHER_LONG: '🎬 Başka Uzun Video',
	VIDEO_SWITCH_TO_LONG: '🎬 Uzun Video Öner',
	VIDEO_SWITCH_TO_SHORT: '📹 Kısa Video Öner',
	VIDEO_BACK_RISALE: '📖 Risale Devam',

	// Navigation buttons
	NAV_PREV_PAGE: '⬅️ Önceki Sayfa',
	NAV_NEXT_PAGE: '➡️ Sonraki Sayfa',
	NAV_BACK_TOC: '📑 Risale İçindekiler',
	NAV_BACK_RISALE: '📖 Risale Menü',
	NAV_BACK_HELP: '❓ Yardım Menüsü',
	NAV_SEARCH_WORD: '🔍 Kelime Ara',
	NAV_SHOW_MEANING: '💡 Kelime Anlamı',
	NAV_MEANINGS_OPEN: '👁️ Anlamları Aç',
	NAV_MEANINGS_CLOSE: '🚫 Anlamları Kapat',

	// Welcome/General buttons
	SHORT_VIDEO: '📹 Kısa Video Öner',
	LONG_VIDEO: '🎬 Uzun Video Öner',
	BOT_INFO: '🤖 Bot Bilgisi',

	// Risale buttons
	RISALE_READ: '📖 Risale-i Nur Oku',
	RISALE_TOC: '📑 Risale İçindekiler',
	RISALE_HELP: '❓ Risale Yardım',
	RISALE_RANDOM: '🎲 Rastgele Söz',
	RISALE_WORD_PRACTICE: '📚 Kelime Antrenmanı',
	RISALE_NEW_WORDS: '🔄 Yeni Kelimeler',

	// Common
	BUTTON_MESSAGE_HEADER: '👇 Hazır Seçenekler:'
} as const;

// Time-based greeting configuration
export const TIME_GREETINGS = {
	MORNING: { start: 5, end: 12, message: 'Hayırlı sabahlar dilerim. 🌅' },
	DAY: { start: 12, end: 18, message: 'Hayırlı günler dilerim. ☀️' },
	EVENING: { start: 18, end: 23, message: 'Hayırlı akşamlar dilerim. 🌇' },
	NIGHT: { message: 'Hayırlı geceler dilerim. 🌙' }
} as const;

// Response message templates
export const RESPONSE_MESSAGES = {
	WELCOME: `🤖 Hayalhanem Bot'a hoş geldiniz!

Bu bot ile neler yapabilirsiniz:
• 📖 Risale-i Nur okuyabilirsiniz
• 📹 Öğretici videolar izleyebilirsiniz
• 🔍 Kelime aramaları yapabilirsiniz

Başlamak için aşağıdaki seçeneklerden birini seçin veya komut yazın.`,

	BOT_INFO: `🤖 Hayalhanem Bot Bilgileri

✨ Özellikler:
• Risale-i Nur tam metni
• Video önerileri (kısa/uzun)
• Kelime araması ve anlamları
• İnteraktif navigasyon

🎯 Komutlar:
• "risale" - Risale-i Nur okuma
• "video" - Video önerileri
• "yardım" - Yardım menüsü

💡 İpucu: Butonları kullanarak daha kolay navigasyon yapabilirsiniz!`,

	UNKNOWN_COMMAND: `❓ Bu komutu anlayamadım. 

Aşağıdaki seçeneklerden birini kullanabilirsiniz:`,

	ERROR: '⚠️ Bir hata oluştu. Lütfen tekrar deneyin.',

	COMING_SOON: '🚧 Bu özellik yakında gelecek!'
} as const;