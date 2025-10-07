import axios from 'axios';

import type { WhatsAppTextMessage, WhatsAppButton } from '../types/whatsapp.js';
import { splitTextIntelligently } from './utils.js';
import { BUTTON_TEXTS } from './constants.js';
import { WHATSAPP_CONFIG } from '../config/whatsapp.js';


export async function sendTextMessage(msg: WhatsAppTextMessage): Promise<void> {
	if (msg.body.length > WHATSAPP_CONFIG.MESSAGE_MAX_LENGTH) {
		await sendLongTextMessage(msg);
		return;
	}

	await sendSingleMessage(msg);
}

export async function sendButtonMessage(msg: WhatsAppTextMessage & { buttons: WhatsAppButton[] }): Promise<void> {
	if (msg.body.length > WHATSAPP_CONFIG.BUTTON_MESSAGE_MAX_LENGTH) {
		// Send content as regular text message first
		await sendTextMessage({
			to: msg.to,
			body: msg.body,
			phoneNumberId: msg.phoneNumberId,
			preview_url: msg.preview_url ?? false
		});

		// Wait briefly to ensure proper message ordering
		await new Promise(resolve => setTimeout(resolve, WHATSAPP_CONFIG.BUTTON_DELAY));

		// Send buttons with minimal text
		await sendInteractiveButtonMessage({
			to: msg.to,
			body: BUTTON_TEXTS.BUTTON_MESSAGE_HEADER,
			phoneNumberId: msg.phoneNumberId,
			buttons: msg.buttons
		});

		return;
	}

	// If short enough, send as single interactive message
	await sendInteractiveButtonMessage(msg);
}

export async function sendVideoButtonMessage(msg: WhatsAppTextMessage & { buttons: WhatsAppButton[] }): Promise<void> {
	// Video messages always sent as two separate messages for preview support
	// First message: video content with preview
	await sendTextMessage({
		to: msg.to,
		body: msg.body,
		phoneNumberId: msg.phoneNumberId,
		preview_url: msg.preview_url ?? true // Enable preview for videos
	});

	// Wait briefly to ensure proper message ordering
	await new Promise(resolve => setTimeout(resolve, WHATSAPP_CONFIG.BUTTON_DELAY));

	// Second message: buttons only
	await sendInteractiveButtonMessage({
		to: msg.to,
		body: BUTTON_TEXTS.BUTTON_MESSAGE_HEADER,
		phoneNumberId: msg.phoneNumberId,
		buttons: msg.buttons
	});
}

async function sendInteractiveButtonMessage(msg: WhatsAppTextMessage & { buttons: WhatsAppButton[] }): Promise<void> {
	const url = `https://graph.facebook.com/${WHATSAPP_CONFIG.API_VERSION}/${msg.phoneNumberId}/messages`;

	const payload = {
		messaging_product: 'whatsapp',
		recipient_type: 'individual',
		to: msg.to,
		type: 'interactive',
		interactive: {
			type: 'button',
			body: {
				text: msg.body
			},
			action: {
				buttons: msg.buttons.map(button => ({
					type: 'reply',
					reply: {
						id: button.id,
						title: button.title
					}
				}))
			}
		}
	};

	try {
		await axios.post(url, payload, {
			headers: {
				Authorization: `Bearer ${WHATSAPP_CONFIG.ACCESS_TOKEN}`,
				'Content-Type': 'application/json'
			},
			timeout: WHATSAPP_CONFIG.TIME.REQUEST_TIMEOUT
		});
	} catch (error) {
		console.error('❌ Failed to send WhatsApp button message:', error);

		if (axios.isAxiosError(error)) {
			const errorData = error.response?.data?.error;
			console.error('WhatsApp API Error Details:', {
				code: errorData?.code,
				message: errorData?.message,
				type: errorData?.type,
				details: errorData?.error_data
			});
		}

		throw error;
	}
}

/**
 * Split long messages into chunks and send them safely to WhatsApp API
 */
async function sendLongTextMessage(msg: WhatsAppTextMessage): Promise<void> {
	const chunks = splitTextIntelligently(msg.body, WHATSAPP_CONFIG.MESSAGE_MAX_LENGTH, true);

	for (const chunk of chunks) {
		const chunkMessage: WhatsAppTextMessage = {
			...msg,
			body: chunk.text
		};

		try {
			await sendSingleMessage(chunkMessage);

			// Wait briefly if not the last chunk (spam prevention)
			if (chunk.chunkIndex < chunk.totalChunks) {
				await new Promise(resolve => setTimeout(resolve, WHATSAPP_CONFIG.MESSAGE_DELAY_BETWEEN_CHUNKS));
			}

		} catch (error) {
			console.error(`❌ Failed to send chunk ${chunk.chunkIndex}/${chunk.totalChunks}:`, error);
			throw error;
		}
	}
}

/**
 * Send single message (internal use)
 */
async function sendSingleMessage(msg: WhatsAppTextMessage): Promise<void> {
	const url = `https://graph.facebook.com/${WHATSAPP_CONFIG.API_VERSION}/${msg.phoneNumberId}/messages`;

	const payload = {
		messaging_product: 'whatsapp',
		recipient_type: 'individual',
		to: msg.to,
		type: 'text',
		text: {
			body: msg.body,
			preview_url: msg.preview_url ?? false
		}
	};

	try {
		await axios.post(url, payload, {
			headers: {
				Authorization: `Bearer ${WHATSAPP_CONFIG.ACCESS_TOKEN}`,
				'Content-Type': 'application/json'
			},
			timeout: WHATSAPP_CONFIG.TIME.REQUEST_TIMEOUT
		});
	} catch (error) {
		console.error('❌ Failed to send WhatsApp message:', error);

		if (axios.isAxiosError(error)) {
			const errorData = error.response?.data?.error;
			console.error('WhatsApp API Error Details:', {
				code: errorData?.code,
				message: errorData?.message,
				type: errorData?.type,
				details: errorData?.error_data
			});
		}

		throw error;
	}
}
