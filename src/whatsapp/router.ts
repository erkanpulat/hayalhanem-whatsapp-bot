import { Router, type Request, type Response } from 'express';

import { sendTextMessage, sendButtonMessage, sendVideoButtonMessage } from './api.js';
import { handleIncoming, handleCallback } from './logic.js';
import { WHATSAPP_CONFIG } from '../config/whatsapp.js';

export const whatsappRouter = Router();

const processedIds = new Set<string>();

/**
 * GET /webhook - WhatsApp webhook verification
 */
whatsappRouter.get('/', (req: Request, res: Response) => {
	const mode = req.query['hub.mode'] as string;
	const token = req.query['hub.verify_token'] as string;
	const challenge = req.query['hub.challenge'] as string;

	console.log('📥 Webhook verification request:', { mode, token: token ? '***' : 'missing' });

	if (mode === 'subscribe' && token === WHATSAPP_CONFIG.VERIFY_TOKEN) {
		console.log('✅ Webhook verification successful');
		return res.status(200).send(challenge);
	}

	console.warn('❌ Webhook verification failed');
	return res.sendStatus(403);
});

/**
 * POST /webhook - WhatsApp message events
 */
whatsappRouter.post('/', async (req: Request, res: Response) => {
	res.sendStatus(200);

	try {
		await processWebhookPayload(req.body);
	} catch (error) {
		console.error('❌ Webhook processing error:', error);
	}
});

async function processWebhookPayload(body: any): Promise<void> {
	if (!body || body.object !== 'whatsapp_business_account') {
		console.warn('⚠️ Invalid webhook payload structure');
		return;
	}

	const entries = Array.isArray(body.entry) ? body.entry : [];
	for (const entry of entries) {
		await processEntry(entry);
	}
}

async function processEntry(entry: any): Promise<void> {
	const changes = Array.isArray(entry?.changes) ? entry.changes : [];

	for (const change of changes) {
		if (change?.field !== 'messages') continue;

		await processMessagesChange(change.value);
	}
}

async function processMessagesChange(value: any): Promise<void> {
	const phoneNumberId = value?.metadata?.phone_number_id as string | undefined;
	if (!phoneNumberId) {
		console.warn('⚠️ No phone number ID in message change');
		return;
	}

	const contactName = value?.contacts?.[0]?.profile?.name as string | undefined;

	const messages = Array.isArray(value?.messages) ? value.messages : [];

	for (const message of messages) {
		await processMessage(message, phoneNumberId, contactName);
	}
}

async function processMessage(
	message: any,
	phoneNumberId: string,
	contactName?: string
): Promise<void> {
	const messageId = message?.id as string | undefined;
	const from = message?.from as string | undefined;
	const text = message?.text?.body as string | undefined;
	const buttonReply = message?.interactive?.button_reply;
	const timestamp = Number(message?.timestamp ?? Date.now() / 1000);

	if (!messageId || !from) {
		console.warn('⚠️ Invalid message data:', { messageId, from });
		return;
	}

	// Handle button callback
	if (buttonReply) {
		await processButtonCallback(message, phoneNumberId);
		return;
	}

	// Handle regular text message
	if (!text) {
		console.warn('⚠️ No text in message:', { messageId, from });
		return;
	}

	if (processedIds.has(messageId)) {
		console.log(`🔄 Skipping duplicate message: ${messageId}`);
		return;
	}

	// Memory management for processedIds
	if (processedIds.size >= WHATSAPP_CONFIG.MEMORY.PROCESSED_IDS_MAX_SIZE) {
		console.log('🧹 Cleaning processed IDs cache');
		processedIds.clear();
	}

	processedIds.add(messageId);

	try {
		const result = await handleIncoming({
			from,
			text,
			timestamp: timestamp * 1000, // Convert to milliseconds
			...(contactName && { name: contactName })
		});

		if (result.buttons && result.buttons.length > 0) {
			// Check if this is a video message (contains YouTube URL)
			const isVideoMessage = result.text.includes('youtube.com') || result.text.includes('youtu.be');

			if (isVideoMessage) {
				await sendVideoButtonMessage({
					to: from,
					body: result.text,
					phoneNumberId,
					buttons: result.buttons,
					preview_url: result.previewUrl ?? true
				});
			} else {
				await sendButtonMessage({
					to: from,
					body: result.text,
					phoneNumberId,
					buttons: result.buttons,
					preview_url: result.previewUrl ?? false
				});
			}
		} else {
			await sendTextMessage({
				to: from,
				body: result.text,
				phoneNumberId,
				preview_url: result.previewUrl ?? false
			});
		}
	} catch (error) {
		console.error(`❌ Failed to process message ${messageId} from ${from}:`, error);
	}
}

async function processButtonCallback(
	message: any,
	phoneNumberId: string
): Promise<void> {
	const messageId = message?.id as string | undefined;
	const from = message?.from as string | undefined;
	const buttonReply = message?.interactive?.button_reply;
	const callbackId = buttonReply?.id as string | undefined;

	if (!messageId || !from || !callbackId) {
		console.warn('⚠️ Invalid button callback data:', { messageId, from, callbackId });
		return;
	}

	if (processedIds.has(messageId)) {
		console.log(`🔄 Skipping duplicate button callback: ${messageId}`);
		return;
	}

	processedIds.add(messageId);

	try {
		console.log(`📱 Processing button callback: ${callbackId} from ${from}`);
		const result = await handleCallback(callbackId);

		if (result.buttons && result.buttons.length > 0) {
			// Check if this is a video message (contains YouTube URL)
			const isVideoMessage = result.text.includes('youtube.com') || result.text.includes('youtu.be');

			if (isVideoMessage) {
				await sendVideoButtonMessage({
					to: from,
					body: result.text,
					phoneNumberId,
					buttons: result.buttons,
					preview_url: result.previewUrl ?? true
				});
			} else {
				await sendButtonMessage({
					to: from,
					body: result.text,
					phoneNumberId,
					buttons: result.buttons,
					preview_url: result.previewUrl ?? false
				});
			}
		} else {
			await sendTextMessage({
				to: from,
				body: result.text,
				phoneNumberId,
				preview_url: result.previewUrl ?? false
			});
		}
	} catch (error) {
		console.error(`❌ Failed to process button callback ${callbackId} from ${from}:`, error);
	}
}
