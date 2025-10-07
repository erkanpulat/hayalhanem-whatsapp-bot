/**
 * Path Constants
 * 
 * Centralized path management for the application.
 * All file and directory paths are defined here.
 */
import { resolve } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Get current directory and project root
const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT_DIR = resolve(__dirname, '..', '..');

// Data directories
export const DATA_DIR = resolve(ROOT_DIR, 'data');
export const RISALE_DATA_DIR = resolve(DATA_DIR, 'risale');
export const RISALE_SOZLER_DIR = resolve(RISALE_DATA_DIR, 'sozler');
export const RISALE_INDEX_DIR = resolve(RISALE_DATA_DIR, 'index');

// YouTube data files
export const YT_DATA_FILES = {
	SHORT_VIDEOS: resolve(DATA_DIR, 'short.json'),
	LONG_VIDEOS: resolve(DATA_DIR, 'long.json'),
	FETCH_CURSOR: resolve(DATA_DIR, 'fetch-cursor.json')
} as const;

// WhatsApp data files
export const WA_DATA_FILES = {
	SPECIAL_MESSAGES: resolve(DATA_DIR, 'special-messages.json')
} as const;

// Risale files
export const RISALE_FILES = {
	TOC: resolve(RISALE_INDEX_DIR, 'toc.json'),
	PAGE_MAP: resolve(RISALE_INDEX_DIR, 'page-map.json'),
	DICTIONARY: resolve(RISALE_INDEX_DIR, 'dictionary.json')
} as const;

// Soz file mapping
export const SOZ_FILES = {
	1: '01-birinci-soz.json',
	2: '02-ikinci-soz.json',
	3: '03-ucuncu-soz.json',
	4: '04-dorduncu-soz.json',
	5: '05-besinci-soz.json',
	6: '06-altinci-soz.json',
	7: '07-yedinci-soz.json',
	8: '08-sekizinci-soz.json',
	9: '09-dokuzuncu-soz.json',
	10: '10-onuncu-soz.json',
	11: '11-on-birinci-soz.json',
	12: '12-on-ikinci-soz.json',
	13: '13-on-ucuncu-soz.json',
	14: '14-on-dorduncu-soz.json',
	15: '15-on-besinci-soz.json',
	16: '16-on-altinci-soz.json',
	17: '17-on-yedinci-soz.json',
	18: '18-on-sekizinci-soz.json',
	19: '19-on-dokuzuncu-soz.json',
	20: '20-yirminci-soz.json',
	21: '21-yirmi-birinci-soz.json',
	22: '22-yirmi-ikinci-soz.json',
	23: '23-yirmi-ucuncu-soz.json',
	24: '24-yirmi-dorduncu-soz.json',
	25: '25-yirmi-besinci-soz.json',
	26: '26-yirmi-altinci-soz.json',
	27: '27-yirmi-yedinci-soz.json',
	28: '28-yirmi-sekizinci-soz.json',
	29: '29-yirmi-dokuzuncu-soz.json',
	30: '30-otuzuncu-soz.json',
	31: '31-otuz-birinci-soz.json',
	32: '32-otuz-ikinci-soz.json',
	33: '33-otuz-ucuncu-soz.json'
} as const;