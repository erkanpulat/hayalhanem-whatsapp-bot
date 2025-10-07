import { atomicWrite, readJsonSafe } from '../utils/file-ops.js';
import type { Variant, VideoItem, SpecialMessageMap } from '../types/youtube.js';
import { YT_DATA_FILES, WA_DATA_FILES } from '../config/paths.js';

export class YouTubeService {
	/**
	 * Load video list by variant
	 */
	async loadVideoList(variant: Variant): Promise<VideoItem[]> {
		if (!this.isValidVariant(variant)) {
			throw new Error(`❌ Unknown variant: ${variant}. Must be 'short' or 'long'.`);
		}

		try {
			const filePath = variant === 'short' ? YT_DATA_FILES.SHORT_VIDEOS : YT_DATA_FILES.LONG_VIDEOS;
			const data = await readJsonSafe(filePath, []);

			return this.validateVideoList(data, variant);
		} catch (error) {
			console.error(`❌ Error loading ${variant} video list:`, error);
			throw error;
		}
	}

	/**
	 * Get random video recommendation
	 */
	async getRecommendation(variant: Variant): Promise<VideoItem | undefined> {
		try {
			const list = await this.loadVideoList(variant);
			return list?.length ? this.pickRandom(list) : undefined;
		} catch (error) {
			console.error(`❌ Error getting ${variant} recommendation:`, error);
			return undefined;
		}
	}

	/**
	 * Load special messages
	 */
	async loadSpecialMessages(): Promise<SpecialMessageMap> {
		try {
			const data = await readJsonSafe(WA_DATA_FILES.SPECIAL_MESSAGES, {});
			return this.normalizeSpecialMessages(data);
		} catch (error) {
			console.error('❌ Error loading special messages:', error);
			return {};
		}
	}

	/**
	 * Consume special message FIFO
	 */
	async consumeSpecialMessageFIFO(from: string): Promise<string | null> {
		try {
			const map = await this.loadSpecialMessages();
			const normalizedKey = this.normalizePhoneNumber(from);
			const queue = map[normalizedKey];

			if (!Array.isArray(queue) || !queue.length) {
				return null;
			}

			const message = queue.shift();
			await this.saveSpecialMessages(map);

			return message || null;
		} catch (error) {
			console.error('❌ Error consuming special message:', error);
			return null;
		}
	}

	/**
	 * Pick random item from array
	 */
	pickRandom<T>(arr: T[]): T {
		if (!Array.isArray(arr) || !arr.length) {
			throw new Error('❌ pickRandom: Array is empty or invalid');
		}

		const randomIndex = Math.floor(Math.random() * arr.length);
		return arr[randomIndex] as T;
	}

	private async saveSpecialMessages(map: SpecialMessageMap): Promise<void> {
		try {
			const cleanedMap = this.cleanEmptyQueues(map);
			await atomicWrite(WA_DATA_FILES.SPECIAL_MESSAGES, cleanedMap);
		} catch (error) {
			console.error('❌ Error saving special messages:', error);
			throw error;
		}
	}

	private validateVideoList(data: unknown, variant: Variant): VideoItem[] {
		if (!Array.isArray(data)) {
			throw new Error(`❌ ${variant}.json must contain an array`);
		}

		const validatedItems: VideoItem[] = [];

		for (let i = 0; i < data.length; i++) {
			const item = data[i];

			if (!this.isValidVideoItem(item)) {
				console.warn(`⚠️ Skipping invalid item at index ${i} in ${variant}.json:`, item);
				continue;
			}

			validatedItems.push(item as VideoItem);
		}

		if (!validatedItems.length) {
			throw new Error(`❌ No valid video items found in ${variant}.json`);
		}

		return validatedItems;
	}

	private isValidVariant(variant: string): variant is Variant {
		return variant === 'short' || variant === 'long';
	}

	private isValidVideoItem(item: unknown): boolean {
		if (!item || typeof item !== 'object') return false;

		const obj = item as Record<string, unknown>;
		return typeof obj.url === 'string' && obj.url.trim().length > 0;
	}

	private normalizeSpecialMessages(data: unknown): SpecialMessageMap {
		if (!data || typeof data !== 'object' || Array.isArray(data)) {
			return {};
		}

		const normalized: SpecialMessageMap = {};
		const obj = data as Record<string, unknown>;

		for (const [key, value] of Object.entries(obj)) {
			const normalizedKey = this.normalizePhoneNumber(key);

			if (Array.isArray(value)) {
				const stringArray = value.filter((item): item is string => typeof item === 'string');
				if (stringArray.length) {
					normalized[normalizedKey] = stringArray;
				}
			}
		}

		return normalized;
	}

	private normalizePhoneNumber(phone: string): string {
		return phone.replace(/\D/g, '');
	}

	private cleanEmptyQueues(map: SpecialMessageMap): SpecialMessageMap {
		const cleaned: SpecialMessageMap = {};

		for (const [key, queue] of Object.entries(map)) {
			if (Array.isArray(queue) && queue.length) {
				cleaned[key] = queue;
			}
		}

		return cleaned;
	}
}

// Default instance for convenience
export const youtubeService = new YouTubeService();

// Convenience function exports
export async function consumeSpecialMessageFIFO(from: string): Promise<string | null> {
	return youtubeService.consumeSpecialMessageFIFO(from);
}