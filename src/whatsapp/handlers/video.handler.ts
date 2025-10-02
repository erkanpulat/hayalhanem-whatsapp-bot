import { videoService } from '../../services/video.service.js';
import type { Variant } from '../../types/video.js';
import { createVideoBlock } from '../utils.js';

export async function handleVideoRequest(variant: Variant): Promise<string> {
	try {
		const video = await videoService.getRecommendation(variant);
		if (!video) {
			const videoType = variant === 'short' ? 'kısa' : 'uzun';
			return `Şu an ${videoType} video bulamadım. Lütfen daha sonra tekrar deneyin.`;
		}

		return createVideoBlock(video);
	} catch (error) {
		console.error(`❌ Error handling video request for ${variant}:`, error);
		const videoType = variant === 'short' ? 'kısa' : 'uzun';
		return `❌ ${videoType} video yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.`;
	}
}