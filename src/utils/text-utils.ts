/**
 * Normalize Turkish text for command parsing
 * - Converts to lowercase with Turkish locale
 * - Strips leading slash for WhatsApp Business commands
 * - Normalizes Turkish characters to ASCII equivalents
 * - Cleans up whitespace and special characters
 */
export function normalizeText(text: string): string {
	return text
		.toLocaleLowerCase('tr-TR')
		.replace(/^\//, '') // Strip leading slash for WhatsApp Business commands
		.replace(/ı/g, 'i')
		.replace(/ş/g, 's')
		.replace(/ç/g, 'c')
		.replace(/ğ/g, 'g')
		.replace(/ö/g, 'o')
		.replace(/ü/g, 'u')
		.replace(/[~_*`]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

/**
 * Sanitize text for WhatsApp formatting
 * Removes WhatsApp markdown characters that could break formatting
 */
export function sanitizeWhatsApp(text?: string): string {
	const s = String(text ?? '');
	return s.replace(/[*_~`]/g, '');
}

/**
 * Simple text matching for intents
 * Normalizes both haystack and needles for comparison
 */
export function textMatches(haystack: string, needles: string[]): boolean {
	const normalized = normalizeText(haystack);

	return needles.some(needle => {
		const normalizedNeedle = normalizeText(needle);
		return normalized.includes(normalizedNeedle);
	});
}