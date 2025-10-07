import { youtubeService } from '../../services/youtube.service.js';
import type { Variant } from '../../types/youtube.js';
import type { WhatsAppResponse, WhatsAppButton } from '../../types/whatsapp.js';
import { createVideoBlock } from '../utils.js';
import { BUTTON_TEXTS } from '../constants.js';
import { CALLBACK_IDS } from '../logic.js';

export async function handleVideoRequest(variant: Variant): Promise<WhatsAppResponse> {
	try {
		const video = await youtubeService.getRecommendation(variant);
		if (!video) {
			const videoType = variant === 'short' ? 'kısa' : 'uzun';
			return { text: `Şu an ${videoType} video bulamadım. Lütfen daha sonra tekrar deneyin.` };
		}

		const videoText = createVideoBlock(video);
		const buttons = createVideoButtons(variant);

		return {
			text: videoText,
			buttons,
			previewUrl: true
		};
	} catch (error) {
		console.error(`❌ Error handling video request for ${variant}:`, error);
		const videoType = variant === 'short' ? 'kısa' : 'uzun';
		return { text: `❌ ${videoType} video yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.` };
	}
}

export async function handleVideoCallback(callbackId: string): Promise<WhatsAppResponse> {
	try {
		switch (callbackId) {
			case CALLBACK_IDS.ANOTHER_SHORT:
				return await handleVideoRequest('short');

			case CALLBACK_IDS.ANOTHER_LONG:
				return await handleVideoRequest('long');

			case CALLBACK_IDS.SWITCH_TO_LONG:
				return await handleVideoRequest('long');

			case CALLBACK_IDS.SWITCH_TO_SHORT:
				return await handleVideoRequest('short');

			case CALLBACK_IDS.START_RISALE:
				// Import risale callback handler to avoid intent detection
				const { handleRisaleCallback } = await import('./risale.handler.js');
				return await handleRisaleCallback('start_risale');

			default:
				return { text: '❌ Bilinmeyen işlem.' };
		}
	} catch (error) {
		console.error('❌ Error handling video callback:', error);
		return { text: '❌ Video işlemi sırasında bir hata oluştu.' };
	}
}

function createVideoButtons(variant: Variant): WhatsAppButton[] {
	const buttons: WhatsAppButton[] = [
		{
			id: variant === 'short' ? CALLBACK_IDS.ANOTHER_SHORT : CALLBACK_IDS.ANOTHER_LONG,
			title: variant === 'short' ? BUTTON_TEXTS.VIDEO_ANOTHER_SHORT : BUTTON_TEXTS.VIDEO_ANOTHER_LONG,
			type: 'reply'
		},
		{
			id: variant === 'short' ? CALLBACK_IDS.SWITCH_TO_LONG : CALLBACK_IDS.SWITCH_TO_SHORT,
			title: variant === 'short' ? BUTTON_TEXTS.VIDEO_SWITCH_TO_LONG : BUTTON_TEXTS.VIDEO_SWITCH_TO_SHORT,
			type: 'reply'
		},
		{
			id: CALLBACK_IDS.START_RISALE,
			title: BUTTON_TEXTS.RISALE_READ,
			type: 'reply'
		}
	];

	return buttons;
}
