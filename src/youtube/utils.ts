import type { VideoRecord } from "./ingest.js";

const SHORT_THRESHOLD_SEC = 90;

export function toISO(d: number | string | Date): string {
	return new Date(d).toISOString();
}

export function isoDurationToSeconds(iso: string | undefined | null): number {
	const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso ?? '');
	if (!m) return 0;
	
	const [, H, M, S] = m;
	
	return (Number(H ?? 0) * 3600) + (Number(M ?? 0) * 60) + Number(S ?? 0);
}

export function isShort(durationSec: number): boolean {
	return durationSec <= SHORT_THRESHOLD_SEC;
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
