export interface PlaylistItemRef {
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

export type VideoRecordWithFetch = VideoRecord & { fetchedAt?: string };

export interface CursorEntry {
	lastPublishedAt?: string;
	lastRunAt?: string;
}

export type CursorMap = Record<string, CursorEntry>;

// WhatsApp Bot Recommendation Types
export type Variant = 'short' | 'long';

export interface VideoItem {
	url: string;
	title?: string;
	description?: string;
	publishedAt?: string;
	duration?: string;
	viewCount?: string;
	thumbnailUrl?: string;
}

export type SpecialMessageMap = Record<string, string[]>;