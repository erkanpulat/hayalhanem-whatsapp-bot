import { resolve } from 'node:path';

import { readJsonSafe } from '../utils/file-ops.js';
import { normalizeText } from '../utils/text-utils.js';
import type {
	RisaleCommand,
	RisalePage,
	RisaleSoz,
	TocEntry,
	PageMapEntry
} from '../types/risale.js';

const DATA_DIR = resolve(process.cwd(), 'data', 'risale', 'sozler');
const INDEX_DIR = resolve(process.cwd(), 'data', 'risale', 'index');

export class RisaleService {
	private tocCache: TocEntry[] | null = null;
	private pageMapCache: Record<string, PageMapEntry> | null = null;

	/**
	 * Parse risale command from user text
	 */
	parseCommand(text: string): RisaleCommand {
		const normalized = normalizeText(text);

		// risale → help
		if (normalized === 'risale') {
			return { type: 'help' };
		}

		// risale söz 18 sayfa 3 → specific soz and page
		const sozPageMatch = normalized.match(/risale\s+(?:soz|sozler|sozleri)\s+(\d+)\s+sayfa\s+(\d+)(?:\s+(kapali))?/);
		if (sozPageMatch && sozPageMatch[1] && sozPageMatch[2]) {
			return {
				type: 'soz',
				sozNo: parseInt(sozPageMatch[1], 10),
				pageNo: parseInt(sozPageMatch[2], 10),
				showMeaning: sozPageMatch[3] === 'kapali' ? 'closed' : 'open'
			};
		}

		// risale söz 18 kapali → first page of soz with closed meaning
		const sozClosedMatch = normalized.match(/risale\s+(?:soz|sozler|sozleri)\s+(\d+)\s+(kapali)/);
		if (sozClosedMatch && sozClosedMatch[1]) {
			return {
				type: 'soz',
				sozNo: parseInt(sozClosedMatch[1], 10),
				pageNo: 1,
				showMeaning: 'closed'
			};
		}

		// risale söz 18 → first page of soz with open meaning
		const sozMatch = normalized.match(/risale\s+(?:soz|sozler|sozleri)\s+(\d+)/);
		if (sozMatch && sozMatch[1]) {
			return {
				type: 'soz',
				sozNo: parseInt(sozMatch[1], 10),
				pageNo: 1,
				showMeaning: 'open'
			};
		}

		// risale sayfa 385 kapali → global page with closed meaning
		const globalPageMatch = normalized.match(/risale\s+sayfa\s+(\d+)(?:\s+(kapali))?/);
		if (globalPageMatch && globalPageMatch[1]) {
			return {
				type: 'globalPage',
				globalPageId: parseInt(globalPageMatch[1], 10),
				showMeaning: globalPageMatch[2] === 'kapali' ? 'closed' : 'open'
			};
		}

		// Default to help if can't parse
		return { type: 'help' };
	}

	/**
	 * Get a specific page from a soz
	 */
	async getPage(sozNo: number, pageNo: number = 1, showMeaning: 'open' | 'closed' = 'open'): Promise<RisalePage | null> {
		try {
			const soz = await this.loadSoz(sozNo);
			if (!soz) return null;

			const page = soz.pages.find(p => p.pageIndex === pageNo);
			if (!page) return null;

			return {
				...page,
				sozNo: sozNo, // Set sozNo from parameter
				pageIndex: pageNo, // Ensure pageIndex is set correctly
				text_open: showMeaning === 'open' ? page.text_open : '',
				text_closed: showMeaning === 'closed' ? page.text_closed : page.text_open
			};
		} catch (error) {
			console.error(`❌ Error getting page ${pageNo} from soz ${sozNo}:`, error);
			return null;
		}
	}

	/**
	 * Get page by global ID
	 */
	async getGlobalPage(globalPageId: number, showMeaning: 'open' | 'closed' = 'open'): Promise<RisalePage | null> {
		try {
			const pageMap = await this.loadPageMap();
			const entry = pageMap[globalPageId.toString()];

			if (!entry) return null;

			return this.getPage(entry.sozNo, entry.pageIndex, showMeaning);
		} catch (error) {
			console.error(`❌ Error getting global page ${globalPageId}:`, error);
			return null;
		}
	}

	/**
	 * Get table of contents
	 */
	async getToc(): Promise<TocEntry[]> {
		if (this.tocCache) return this.tocCache;

		try {
			const tocPath = resolve(INDEX_DIR, 'toc.json');
			const data = await readJsonSafe(tocPath, { items: [] });
			this.tocCache = data.items || [];
			return this.tocCache;
		} catch (error) {
			console.error('❌ Error loading TOC:', error);
			return [];
		}
	}

	/**
	 * Check if soz number is valid
	 */
	async isValidSozNo(sozNo: number): Promise<boolean> {
		const toc = await this.getToc();
		return toc.some(entry => entry.sozNo === sozNo);
	}

	/**
	 * Get soz info from TOC
	 */
	async getSozInfo(sozNo: number): Promise<TocEntry | null> {
		const toc = await this.getToc();
		return toc.find(entry => entry.sozNo === sozNo) || null;
	}

	/**
	 * Get total number of pages available
	 */
	async getTotalPageCount(): Promise<number> {
		try {
			const pageMap = await this.loadPageMap();
			const pageNumbers = Object.keys(pageMap).map(key => parseInt(key, 10));
			return Math.max(...pageNumbers);
		} catch (error) {
			console.error('❌ Error getting total page count:', error);
			return 940; // fallback to known count
		}
	}

	/**
	 * Get next page navigation info for a given page
	 */
	async getNextPageInfo(currentPage: RisalePage): Promise<{ command: string; description: string; globalCommand?: string } | null> {
		try {
			const sozInfo = await this.getSozInfo(currentPage.sozNo);
			if (!sozInfo) return null;

			// Check if there's a next page in the same soz
			if (currentPage.pageIndex < sozInfo.range.count) {
				const nextPageNo = currentPage.pageIndex + 1;
				const nextGlobalId = currentPage.globalId + 1;

				return {
					command: `risale söz ${currentPage.sozNo} sayfa ${nextPageNo}`,
					description: `${currentPage.sozNo}. Söz ${nextPageNo}. sayfa`,
					globalCommand: `risale sayfa ${nextGlobalId}`
				};
			}

			// Check if there's a next soz
			const toc = await this.getToc();
			const currentSozIndex = toc.findIndex(entry => entry.sozNo === currentPage.sozNo);
			if (currentSozIndex >= 0 && currentSozIndex < toc.length - 1) {
				const nextSoz = toc[currentSozIndex + 1];
				if (nextSoz) {
					const nextGlobalId = currentPage.globalId + 1;

					return {
						command: `risale söz ${nextSoz.sozNo}`,
						description: `${nextSoz.sozNo}. Söz 1. sayfa`,
						globalCommand: `risale sayfa ${nextGlobalId}`
					};
				}
			}
			// No next page/soz
			return null;
		} catch (error) {
			console.error('❌ Error getting next page info:', error);
			return null;
		}
	}

	private async loadSoz(sozNo: number): Promise<RisaleSoz | null> {
		try {
			const sozFiles = {
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
			};

			const filename = sozFiles[sozNo as keyof typeof sozFiles];
			if (!filename) return null;

			const filePath = resolve(DATA_DIR, filename);
			return await readJsonSafe(filePath, null);
		} catch (error) {
			console.error(`❌ Error loading soz ${sozNo}:`, error);
			return null;
		}
	}

	private async loadPageMap(): Promise<Record<string, PageMapEntry>> {
		if (this.pageMapCache) return this.pageMapCache;

		try {
			const pageMapPath = resolve(INDEX_DIR, 'page-map.json');
			this.pageMapCache = await readJsonSafe(pageMapPath, {});
			return this.pageMapCache;
		} catch (error) {
			console.error('❌ Error loading page map:', error);
			return {};
		}
	}
}