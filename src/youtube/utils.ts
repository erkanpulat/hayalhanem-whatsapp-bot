import type { VideoRecord } from '../types/youtube.js';
import { toISO, isoDurationToSeconds } from '../utils/date-utils.js';
import { YOUTUBE_CONFIG } from '../config/youtube.js';

export { toISO, isoDurationToSeconds };

export function isShort(durationSec: number): boolean {
	return durationSec <= YOUTUBE_CONFIG.SHORT_THRESHOLD_SEC;
}

export function classify(rec: VideoRecord): 'short' | 'long' {
	return isShort(rec.durationSec) ? 'short' : 'long';
}

export function getVideoUrl(id: string, durationSec: number): string {
	if (isShort(durationSec)) {
		return `https://www.youtube.com/shorts/${id}`;
	}

	return `https://www.youtube.com/watch?v=${id}`;
};
