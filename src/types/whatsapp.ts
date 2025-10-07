export interface MessageChunk {
	text: string;
	chunkIndex: number;
	totalChunks: number;
}

export interface WhatsAppTextMessage {
	to: string;
	body: string;
	phoneNumberId: string;
	preview_url?: boolean;
}

export interface IncomingMessage {
	from: string;
	text?: string | null;
	timestamp: number;
	name?: string;
}

export interface WhatsAppButton {
	id: string;
	title: string;
	type: string;
}

export interface WhatsAppResponse {
	text: string;
	buttons?: WhatsAppButton[];
	previewUrl?: boolean;
}

export interface CallbackData {
	action: string;
	sozNo?: number;
	pageNo?: number;
	sozlerPageId?: number;
	showMeaning?: 'open' | 'closed';
}

export type DetectedIntent = 'short' | 'long' | 'info' | 'risale' | 'unknown';