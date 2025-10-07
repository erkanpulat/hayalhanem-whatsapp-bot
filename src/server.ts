import 'dotenv/config';

import { createApp } from './app.js';
import { SERVER_CONFIG } from './config/server.js';

const app = createApp();

app.listen(SERVER_CONFIG.PORT, () => {
	console.log(`[server] running at http://localhost:${SERVER_CONFIG.PORT}`);
});
