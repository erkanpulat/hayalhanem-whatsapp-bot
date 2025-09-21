import express from 'express';

import { whatsappRouter } from './whatsapp/router.js';

export function createApp() {
	const app = express();

	app.use(express.json());

	app.use('/webhook', whatsappRouter);

	app.get('/', function (req, res) {
		res.send(`${process.env.APP_NAME} is running! ✅`);
	});

	return app;
}
