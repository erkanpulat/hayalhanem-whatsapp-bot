import axios from 'axios';

const API_KEY = process.env.YOUTUBE_API_KEY;
if (!API_KEY) {
	throw new Error('❌ YOUTUBE_API_KEY environment variable not set!');
}

export const yt = axios.create({
	baseURL: 'https://www.googleapis.com/youtube/v3',
	params: { key: API_KEY },
	timeout: 10_000
});
