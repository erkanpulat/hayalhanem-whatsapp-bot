import 'dotenv/config';

import type { VideoRecordWithFetch, CursorMap, VideoRecord } from '../types/youtube.js';
import {
	getUploadsPlaylistId,
	listAllPlaylistItems,
	hydrateVideoDetails,
} from './ingest.js';
import { classify, toISO } from './utils.js';
import { atomicWrite, ensureDir, readJsonSafe } from '../utils/file-ops.js';
import { YOUTUBE_CONFIG } from '../config/youtube.js';
import { DATA_DIR, YT_DATA_FILES } from '../config/paths.js';

const CHANNEL_IDS = YOUTUBE_CONFIG.CHANNEL_IDS;

class VideoFetcher {
	private seenIds = new Set<string>();
	private stats = { totalNewShort: 0, totalNewLong: 0 };

	async run(): Promise<void> {
		try {
			await this.initialize();
			const { shortList, longList, cursor } = await this.loadExistingData();

			this.updateSeenIds(shortList, longList);

			for (const channelId of CHANNEL_IDS) {
				await this.processChannel(channelId, shortList, longList, cursor);
			}

			await this.saveResults(shortList, longList, cursor);
			this.printSummary();
		} catch (error) {
			this.handleError(error);
		}
	}

	private async initialize(): Promise<void> {
		await ensureDir(DATA_DIR);
	}

	private async loadExistingData() {
		const [shortList, longList, cursor] = await Promise.all([
			readJsonSafe<VideoRecordWithFetch[]>(YT_DATA_FILES.SHORT_VIDEOS, []),
			readJsonSafe<VideoRecordWithFetch[]>(YT_DATA_FILES.LONG_VIDEOS, []),
			readJsonSafe<CursorMap>(YT_DATA_FILES.FETCH_CURSOR, {}),
		]);

		return { shortList, longList, cursor };
	}

	private updateSeenIds(shortList: VideoRecordWithFetch[], longList: VideoRecordWithFetch[]): void {
		this.seenIds = new Set([...shortList, ...longList].map((x) => x.id));
	}

	private async processChannel(
		channelId: string,
		shortList: VideoRecordWithFetch[],
		longList: VideoRecordWithFetch[],
		cursor: CursorMap
	): Promise<void> {
		try {
			const uploadsId = await getUploadsPlaylistId(channelId);
			const stopAt = this.calculateStopTime(cursor[channelId]?.lastPublishedAt);

			console.log(`\n📺 Channel ${channelId} (uploads: ${uploadsId}) → listing… stopAt=${stopAt || 'none'}`);

			const items = await listAllPlaylistItems(uploadsId, stopAt);

			if (!items.length) {
				this.updateCursor(cursor, channelId);
				console.log('   ↳ No items.');
				return;
			}

			const newVideoIds = this.filterNewVideoIds(items);

			if (!newVideoIds.length) {
				this.updateCursor(cursor, channelId);
				console.log('   ↳ No new video IDs to add.');
				return;
			}

			const details = await hydrateVideoDetails(newVideoIds);

			if (!details.length) {
				this.updateCursor(cursor, channelId);
				console.log('   ↳ No details resolved.');
				return;
			}

			await this.processVideoDetails(details, shortList, longList, cursor, channelId);
		} catch (error) {
			console.error(`   ❌ Error processing channel ${channelId}:`, error);
			this.updateCursor(cursor, channelId);
		}
	}

	private calculateStopTime(lastPublishedAt?: string): string {
		if (!lastPublishedAt) return '';

		const t = new Date(lastPublishedAt).getTime() - YOUTUBE_CONFIG.TIME.BACKOFF_MS;
		return toISO(Math.max(0, t));
	}

	private filterNewVideoIds(items: any[]): string[] {
		return items
			.map((x) => x.videoId)
			.filter((id): id is string => Boolean(id) && !this.seenIds.has(id));
	}

	private async processVideoDetails(
		details: VideoRecord[],
		shortList: VideoRecordWithFetch[],
		longList: VideoRecordWithFetch[],
		cursor: CursorMap,
		channelId: string
	): Promise<void> {
		const nowISO = toISO(Date.now());
		let addedShort = 0;
		let addedLong = 0;

		for (const rec of details) {
			if (!rec.id || this.seenIds.has(rec.id)) continue;

			const item: VideoRecord & { fetchedAt: string } = { ...rec, fetchedAt: nowISO };
			const classification = classify(item);

			if (classification === 'short') {
				shortList.push(item);
				addedShort++;
			} else {
				longList.push(item);
				addedLong++;
			}

			this.seenIds.add(item.id);
		}

		const maxPublished = this.getMaxPublishedTime(details);
		this.updateChannelCursor(cursor, channelId, maxPublished);
		this.updateStats(addedShort, addedLong);

		console.log(
			`   ↳ Added: short +${addedShort}, long +${addedLong} (maxPublishedAt=${cursor[channelId]?.lastPublishedAt || 'n/a'})`
		);
	}

	private getMaxPublishedTime(details: VideoRecord[]): number {
		return details
			.map((r) => new Date(r.publishedAt).getTime())
			.filter((n) => !Number.isNaN(n))
			.reduce((a, b) => Math.max(a, b), 0);
	}

	private updateCursor(cursor: CursorMap, channelId: string): void {
		const prev = cursor[channelId]?.lastPublishedAt;
		cursor[channelId] = {
			...(prev ? { lastPublishedAt: prev } : {}),
			lastRunAt: toISO(Date.now()),
		};
	}

	private updateChannelCursor(cursor: CursorMap, channelId: string, maxPublished: number): void {
		if (!cursor[channelId]) cursor[channelId] = {};

		if (maxPublished > 0) {
			cursor[channelId].lastPublishedAt = new Date(maxPublished).toISOString();
		}

		cursor[channelId].lastRunAt = toISO(Date.now());
	}

	private updateStats(addedShort: number, addedLong: number): void {
		this.stats.totalNewShort += addedShort;
		this.stats.totalNewLong += addedLong;
	}

	private async saveResults(
		shortList: VideoRecordWithFetch[],
		longList: VideoRecordWithFetch[],
		cursor: CursorMap
	): Promise<void> {
		// Sort by publish date
		const sortByDate = (a: VideoRecordWithFetch, b: VideoRecordWithFetch) =>
			new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime();

		shortList.sort(sortByDate);
		longList.sort(sortByDate);

		await Promise.all([
			atomicWrite(YT_DATA_FILES.SHORT_VIDEOS, shortList),
			atomicWrite(YT_DATA_FILES.LONG_VIDEOS, longList),
			atomicWrite(YT_DATA_FILES.FETCH_CURSOR, cursor),
		]);
	}

	private printSummary(): void {
		console.log('\n✅ Done.');
		console.log(`   Total new: short ${this.stats.totalNewShort}, long ${this.stats.totalNewLong}`);
		console.log(`   Files:\n     - ${YT_DATA_FILES.SHORT_VIDEOS}\n     - ${YT_DATA_FILES.LONG_VIDEOS}\n     - ${YT_DATA_FILES.FETCH_CURSOR}`);
	}

	private handleError(error: unknown): never {
		const data = (error as any)?.response?.data || error;
		console.error('❌ Fatal:', data);
		process.exit(1);
	}
}

// Main execution
async function main(): Promise<void> {
	const fetcher = new VideoFetcher();
	await fetcher.run();
}

// Entry point
main().catch((err) => {
	const data = (err as any)?.response?.data || err;
	console.error('❌ Fatal:', data);
	process.exit(1);
});
