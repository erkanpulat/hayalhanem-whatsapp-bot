import axios from 'axios';

import { splitTextIntelligently } from './utils.js';

const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
if (!ACCESS_TOKEN) {
	throw new Error('❌ WHATSAPP_ACCESS_TOKEN environment variable not set!');
}

// WhatsApp API limits and configuration
export const WHATSAPP_MESSAGE_MAX_LENGTH = 4000; // Safe limit (actual API limit is 4096)

export async function sendTextMessage(msg: WhatsAppTextMessage): Promise<void> {
	if (msg.body.length > WHATSAPP_MESSAGE_MAX_LENGTH) {
		await sendLongTextMessage(msg);
		return;
	}

	await sendSingleMessage(msg);
}

/**
 * Split long messages into chunks and send them safely to WhatsApp API
 */
async function sendLongTextMessage(msg: WhatsAppTextMessage): Promise<void> {
	const chunks = splitTextIntelligently(msg.body, WHATSAPP_MESSAGE_MAX_LENGTH, true);

	for (const chunk of chunks) {
		const chunkMessage: WhatsAppTextMessage = {
			...msg,
			body: chunk.text
		};

		try {
			await sendSingleMessage(chunkMessage);

			// Wait briefly if not the last chunk (spam prevention)
			if (chunk.chunkIndex < chunk.totalChunks) {
				await new Promise(resolve => setTimeout(resolve, 1200));
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
	const url = `https://graph.facebook.com/v23.0/${msg.phoneNumberId}/messages`;

	const payload = {
		messaging_product: 'whatsapp',
		recipient_type: 'individual',
		to: msg.to,
		type: 'text',
		text: {
			body: msg.body,
			preview_url: true
		}
	};

	try {
		await axios.post(url, payload, {
			headers: {
				Authorization: `Bearer ${ACCESS_TOKEN}`,
				'Content-Type': 'application/json'
			},
			timeout: 10_000
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

export interface WhatsAppTextMessage {
	to: string;
	body: string;
	phoneNumberId: string;
}
