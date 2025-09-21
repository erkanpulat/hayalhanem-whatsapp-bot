import { yt } from './client.js';
import { isoDurationToSeconds, getVideoUrl } from './utils.js';

const PLAYLIST_ITEMS_BATCH_SIZE = 50;
const VIDEO_DETAILS_BATCH_SIZE = 50;

export async function getUploadsPlaylistId(channelId: string): Promise<string> {
	try {
		console.log(`🔍 Finding uploads playlist for channel: ${channelId}`);

		const { data } = await yt.get('/channels', {
			params: { part: 'contentDetails', id: channelId, maxResults: 1 }
		});

		const uploads = data?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
		if (!uploads) {
			throw new Error(`❌ Uploads playlist not found for channel ${channelId}`);
		}

		console.log(`✅ Found uploads playlist: ${uploads}`);
		return uploads as string;

	} catch (error) {
		console.error(`❌ Failed to get uploads playlist for ${channelId}:`, error);
		throw error;
	}
}

export async function listAllPlaylistItems(
	playlistId: string,
	stopAtPublishedAt?: string
): Promise<PlaylistItemRef[]> {
	console.log(`📺 Fetching playlist items from: ${playlistId}`);
	if (stopAtPublishedAt) {
		console.log(`   ⏱️  Stopping at: ${stopAtPublishedAt}`);
	}

	const out: PlaylistItemRef[] = [];
	let pageToken: string | undefined;
	let pageCount = 0;

	try {
		do {
			pageCount++;
			console.log(`   📄 Fetching page ${pageCount}...`);

			const { data } = await yt.get('/playlistItems', {
				params: {
					part: 'snippet,contentDetails',
					playlistId,
					maxResults: PLAYLIST_ITEMS_BATCH_SIZE,
					...(pageToken ? { pageToken } : {})
				}
			});

			const items = data.items ?? [];
			let shouldBreak = false;
			let pageItemCount = 0;

			for (const it of items) {
				const videoId = it?.contentDetails?.videoId;
				const publishedAt = it?.snippet?.publishedAt;

				if (!videoId || !publishedAt) {
					console.warn(`⚠️  Skipping invalid item: videoId=${videoId}, publishedAt=${publishedAt}`);
					continue;
				}

				out.push({ videoId, publishedAt });
				pageItemCount++;

				// Check stop condition
				if (stopAtPublishedAt && new Date(publishedAt) <= new Date(stopAtPublishedAt)) {
					console.log(`   🛑 Reached stop time: ${publishedAt}`);
					shouldBreak = true;
					break;
				}
			}

			console.log(`   ✅ Page ${pageCount}: ${pageItemCount} items added`);

			if (shouldBreak) break;
			pageToken = data.nextPageToken || undefined;

		} while (pageToken);

		console.log(`📊 Total fetched: ${out.length} playlist items`);
		return out;

	} catch (error) {
		console.error(`❌ Failed to fetch playlist items for ${playlistId}:`, error);
		throw error;
	}
}

export async function hydrateVideoDetails(videoIds: string[]): Promise<VideoRecord[]> {
	if (!videoIds.length) {
		console.log('📺 No video IDs to hydrate');
		return [];
	}

	console.log(`🔍 Hydrating ${videoIds.length} video details...`);
	const results: VideoRecord[] = [];
	let processedCount = 0;

	try {
		for (let i = 0; i < videoIds.length; i += VIDEO_DETAILS_BATCH_SIZE) {
			const batch = videoIds.slice(i, i + VIDEO_DETAILS_BATCH_SIZE);
			const batchNumber = Math.floor(i / VIDEO_DETAILS_BATCH_SIZE) + 1;
			const totalBatches = Math.ceil(videoIds.length / VIDEO_DETAILS_BATCH_SIZE);

			console.log(`   📦 Batch ${batchNumber}/${totalBatches}: processing ${batch.length} videos`);

			try {
				const { data } = await yt.get('/videos', {
					params: {
						part: 'contentDetails,snippet',
						id: batch.join(','),
						maxResults: VIDEO_DETAILS_BATCH_SIZE
					}
				});

				const items = data.items ?? [];
				let validVideos = 0;

				for (const it of items) {
					if (!it.id) {
						console.warn(`⚠️  Video missing ID, skipping`);
						continue;
					}

					const snippet = it.snippet ?? {};
					const contentDetails = it.contentDetails ?? {};

					// Validate required fields
					if (!snippet.title) {
						console.warn(`⚠️  Video ${it.id} missing title, skipping`);
						continue;
					}

					const durationSec = isoDurationToSeconds(contentDetails.duration ?? 'PT0S');

					const record: VideoRecord = {
						id: it.id,
						title: snippet.title,
						description: snippet.description ?? '',
						url: getVideoUrl(it.id, durationSec),
						channelId: snippet.channelId,
						channelTitle: snippet.channelTitle,
						publishedAt: snippet.publishedAt ?? new Date().toISOString(),
						durationSec
					};

					results.push(record);
					validVideos++;
				}

				processedCount += batch.length;
				console.log(`   ✅ Batch ${batchNumber}: ${validVideos}/${batch.length} valid videos`);

			} catch (batchError) {
				console.error(`❌ Batch ${batchNumber} failed:`, batchError);
				// Continue with next batch instead of failing completely
				processedCount += batch.length;
				continue;
			}
		}

		console.log(`📊 Hydration complete: ${results.length}/${videoIds.length} videos processed successfully`);
		return results;

	} catch (error) {
		console.error(`❌ Video hydration failed:`, error);
		throw error;
	}
}

interface PlaylistItemRef {
	videoId: string;
	publishedAt: string;
}

export interface VideoRecord {
	id: string;
	title: string;
	description: string;
	url: string;
	channelId?: string;
	channelTitle?: string;
	publishedAt: string;
	durationSec: number;
}
