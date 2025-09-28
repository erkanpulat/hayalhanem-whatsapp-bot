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