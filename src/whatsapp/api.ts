import axios from 'axios';

const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
if (!ACCESS_TOKEN) {
	throw new Error('❌ WHATSAPP_ACCESS_TOKEN environment variable not set!');
}

export async function sendTextMessage(msg: WhatsAppTextMessage): Promise<void> {
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
