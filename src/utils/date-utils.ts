/**
 * Convert various date formats to ISO string
 */
export function toISO(date: number | string | Date): string {
	return new Date(date).toISOString();
}

/**
 * Convert ISO 8601 duration to seconds
 * Example: "PT1H30M45S" -> 5445 seconds
 */
export function isoDurationToSeconds(iso: string | undefined | null): number {
	const match = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso ?? '');
	if (!match) return 0;

	const [, hours, minutes, seconds] = match;

	return (Number(hours ?? 0) * 3600) + (Number(minutes ?? 0) * 60) + Number(seconds ?? 0);
}

/**
 * Convert seconds to human-readable duration
 * Example: 3665 -> "1h 1m 5s"
 */
export function secondsToHumanDuration(seconds: number): string {
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const secs = seconds % 60;

	const parts = [];
	if (hours > 0) parts.push(`${hours}h`);
	if (minutes > 0) parts.push(`${minutes}m`);
	if (secs > 0) parts.push(`${secs}s`);

	return parts.length > 0 ? parts.join(' ') : '0s';
}