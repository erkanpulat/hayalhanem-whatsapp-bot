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

export type DetectedIntent = 'short' | 'long' | 'info' | 'risale' | 'unknown';