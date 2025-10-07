import axios from 'axios';
import { YOUTUBE_CONFIG } from '../config/youtube.js';

export const yt = axios.create({
	baseURL: YOUTUBE_CONFIG.BASE_URL,
	params: { key: YOUTUBE_CONFIG.API_KEY },
	timeout: YOUTUBE_CONFIG.TIMEOUT
});
