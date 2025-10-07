import express from 'express';

import { whatsappRouter } from './whatsapp/router.js';
import { SERVER_CONFIG } from './config/server.js';

export function createApp() {
	const app = express();

	app.use(express.json());

	app.use('/webhook', whatsappRouter);

	app.get('/', function (req, res) {
		res.send(`${SERVER_CONFIG.APP_NAME} is running! ✅`);
	});

	return app;
}
