import { videoService } from '../../services/video.service.js';
import type { Variant } from '../../types/video.js';
import { createVideoBlock } from '../utils.js';

export async function handleVideoRequest(variant: Variant): Promise<string> {
	const video = await videoService.getRecommendation(variant);

	if (!video) {
		const videoType = variant === 'short' ? 'kısa' : 'uzun';
		return `Şu an ${videoType} video bulamadım. Lütfen daha sonra tekrar deneyin.`;
	}

	return createVideoBlock(video);
}