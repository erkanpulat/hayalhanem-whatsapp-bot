import { resolve } from 'node:path';

import { atomicWrite, readJsonSafe } from '../utils/file-ops.js';

const DATA_DIR = resolve(process.cwd(), 'data');
const SPECIAL_MESSAGES_PATH = resolve(DATA_DIR, 'special-messages.json');

export async function loadVideoList(variant: Variant): Promise<VideoItem[]> {
	if (!isValidVariant(variant)) {
		throw new Error(`❌ Unknown variant: ${variant}. Must be 'short' or 'long'.`);
	}

	try {
		const filePath = resolve(DATA_DIR, `${variant}.json`);
		const data = await readJsonSafe(filePath, []);

		return validateVideoList(data, variant);
	} catch (error) {
		console.error(`❌ Error loading ${variant} video list:`, error);
		throw error;
	}
}

export async function loadSpecialMessages(): Promise<SpecialMessageMap> {
	try {
		const data = await readJsonSafe(SPECIAL_MESSAGES_PATH, {});
		return normalizeSpecialMessages(data);
	} catch (error) {
		console.error('❌ Error loading special messages:', error);
		return {};
	}
}

export async function consumeSpecialMessageFIFO(from: string): Promise<string | null> {
	try {
		const map = await loadSpecialMessages();
		const normalizedKey = normalizePhoneNumber(from);
		const queue = map[normalizedKey];

		if (!Array.isArray(queue) || !queue.length) {
			return null;
		}

		const message = queue.shift();

		await saveSpecialMessages(map);

		return message || null;
	} catch (error) {
		console.error('❌ Error consuming special message:', error);
		return null;
	}
}

async function saveSpecialMessages(map: SpecialMessageMap): Promise<void> {
	try {
		// Clean empty arrays
		const cleanedMap = cleanEmptyQueues(map);
		await atomicWrite(SPECIAL_MESSAGES_PATH, cleanedMap);
	} catch (error) {
		console.error('❌ Error saving special messages:', error);
		throw error;
	}
}

export function pickRandom<T>(arr: T[]): T {
	if (!Array.isArray(arr) || !arr.length) {
		throw new Error('❌ pickRandom: Array is empty or invalid');
	}

	const randomIndex = Math.floor(Math.random() * arr.length);

	return arr[randomIndex] as T;
}

function validateVideoList(data: unknown, variant: string): VideoItem[] {
	if (!Array.isArray(data)) {
		throw new Error(`❌ ${variant}.json must contain an array`);
	}

	const validatedItems: VideoItem[] = [];

	for (let i = 0; i < data.length; i++) {
		const item = data[i];

		if (!isValidVideoItem(item)) {
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

function isValidVideoItem(item: unknown): boolean {
	return Boolean(
		item &&
		typeof item === 'object' &&
		typeof (item as any).title === 'string' &&
		typeof (item as any).url === 'string' &&
		(item as any).title.trim().length > 0 &&
		(item as any).url.trim().length > 0
	);
}

function isValidVariant(variant: unknown): variant is Variant {
	return variant === 'short' || variant === 'long';
}

function normalizeSpecialMessages(data: unknown): SpecialMessageMap {
	if (!data || typeof data !== 'object') {
		return {};
	}

	const normalized: SpecialMessageMap = {};
	const input = data as Record<string, unknown>;

	for (const [phoneNumber, messages] of Object.entries(input)) {
		if (!Array.isArray(messages)) continue;

		const validMessages = messages
			.map(msg => String(msg).trim())
			.filter(msg => msg.length > 0);

		if (validMessages.length > 0) {
			const normalizedPhone = normalizePhoneNumber(phoneNumber);
			normalized[normalizedPhone] = validMessages;
		}
	}

	return normalized;
}

function normalizePhoneNumber(phone: string): string {
	return String(phone || '').replace(/^\+/, '').trim();
}

function cleanEmptyQueues(map: SpecialMessageMap): SpecialMessageMap {
	const cleaned: SpecialMessageMap = {};

	for (const [phone, messages] of Object.entries(map)) {
		if (Array.isArray(messages) && messages.length > 0) {
			cleaned[phone] = messages;
		}
	}

	return cleaned;
}

export type Variant = 'short' | 'long';

export type SpecialMessageMap = Record<string, string[]>;

export interface VideoItem {
	id?: string;
	title: string;
	url: string;
	description?: string;
	channelId?: string;
	channelTitle?: string;
	publishedAt?: string;
	durationSec?: number;
	fetchedAt?: string;
}
