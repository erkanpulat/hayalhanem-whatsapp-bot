import { Router, type Request, type Response } from 'express';

import { sendTextMessage } from './api.js';
import { handleIncoming } from './logic.js';

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
if (!VERIFY_TOKEN) {
	throw new Error('❌ WHATSAPP_VERIFY_TOKEN environment variable not set');
}

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

	if (mode === 'subscribe' && token === VERIFY_TOKEN) {
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
	const timestamp = Number(message?.timestamp ?? Date.now() / 1000);

	if (!messageId || !from || !text) {
		console.warn('⚠️ Invalid message data:', { messageId, from, hasText: !!text });
		return;
	}

	if (processedIds.has(messageId)) {
		console.log(`🔄 Skipping duplicate message: ${messageId}`);
		return;
	}

	// Memory management for processedIds
	if (processedIds.size >= 10_000) {
		console.log('🧹 Cleaning processed IDs cache');
		processedIds.clear();
	}

	processedIds.add(messageId);

	try {
		const reply = await handleIncoming({
			from,
			text,
			timestamp: timestamp * 1000, // Convert to milliseconds
			...(contactName && { name: contactName })
		});

		await sendTextMessage({
			to: from,
			body: reply,
			phoneNumberId
		});
	} catch (error) {
		console.error(`❌ Failed to process message ${messageId} from ${from}:`, error);
	}
}
