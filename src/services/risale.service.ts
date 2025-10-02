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

		// risale içindekiler → table of contents
		const tocMatch = normalized.match(/^risale\s+(?:icindekiler|liste)$|^risaleicindekiler$/);
		if (tocMatch) {
			return { type: 'toc' };
		}

		// risale kelime → random words
		const kelimeMatch = normalized.match(/^risale\s+(?:kelime|kelimeler)$|^risalekelimeler?$/);
		if (kelimeMatch) {
			return { type: 'kelime' };
		}

		// risale sözler 18 sayfa 3 OR risalesozler 18 sayfa 3 → specific soz and page
		const sozPageMatch = normalized.match(/(?:risale\s+(?:soz|sozler|sozleri)|risalesozler)\s+(\d+)\s+sayfa\s+(\d+)(?:\s+(kapali))?/);
		if (sozPageMatch && sozPageMatch[1] && sozPageMatch[2]) {
			return {
				type: 'soz',
				sozNo: parseInt(sozPageMatch[1], 10),
				pageNo: parseInt(sozPageMatch[2], 10),
				showMeaning: sozPageMatch[3] === 'kapali' ? 'closed' : 'open'
			};
		}

		// risale sözler 18 kapali OR risalesozler 18 kapali → first page of soz with closed meaning
		const sozClosedMatch = normalized.match(/(?:risale\s+(?:soz|sozler|sozleri)|risalesozler)\s+(\d+)\s+(kapali)/);
		if (sozClosedMatch && sozClosedMatch[1]) {
			return {
				type: 'soz',
				sozNo: parseInt(sozClosedMatch[1], 10),
				pageNo: 1,
				showMeaning: 'closed'
			};
		}

		// risale sözler 18 OR risalesozler 18 → first page of soz with open meaning
		const sozMatch = normalized.match(/(?:risale\s+(?:soz|sozler|sozleri)|risalesozler)\s+(\d+)/);
		if (sozMatch && sozMatch[1]) {
			return {
				type: 'soz',
				sozNo: parseInt(sozMatch[1], 10),
				pageNo: 1,
				showMeaning: 'open'
			};
		}

		// risale sözler sayfa 385 kapali OR risalesozlersayfa 385 kapali → sözler page with closed meaning
		const sozlerPageMatch = normalized.match(/(?:risale\s+(?:soz|sozler|sozleri)\s+sayfa|risalesozlersayfa)\s+(\d+)(?:\s+(kapali))?/);
		if (sozlerPageMatch && sozlerPageMatch[1]) {
			return {
				type: 'sozlerPage',
				sozlerPageId: parseInt(sozlerPageMatch[1], 10),
				showMeaning: sozlerPageMatch[2] === 'kapali' ? 'closed' : 'open'
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
	 * Get page by Sözler Kitabı ID
	 */
	async getSozlerPage(sozlerPageId: number, showMeaning: 'open' | 'closed' = 'open'): Promise<RisalePage | null> {
		try {
			const pageMap = await this.loadPageMap();
			const entry = pageMap[sozlerPageId.toString()];

			if (!entry) return null;

			const page = await this.getPage(entry.sozNo, entry.pageIndex, showMeaning);
			if (!page) return null;

			// Set the sozlerId for global page system
			return {
				...page,
				sozlerId: sozlerPageId
			};
		} catch (error) {
			console.error(`❌ Error getting Sözler Kitabı page ${sozlerPageId}:`, error);
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
	 * Get formatted table of contents summary
	 */
	async getTocSummary(): Promise<string> {
		try {
			const toc = await this.getToc();
			if (!toc.length) return '❌ İçindekiler bulunamadı.';

			const lines = [
				'📖 *RİSALE-İ NUR - SÖZLER | İÇİNDEKİLER*',
				''
			];

			for (const entry of toc) {
				const emoji = this.getSozEmoji(entry.sozNo);
				const title = entry.title.replace(/^\d+\.\s*/, '');
				const pageInfo = `(${entry.range.count} sayfa)`;
				const sozlerInfo = `Sözler Kitabı: ${entry.range.startId}-${entry.range.endId}`;

				lines.push(`${emoji} *${entry.sozNo}. ${title}* ${pageInfo} - ${sozlerInfo}`);
			}

			lines.push('');
			lines.push(`📍 *Toplam:* ${toc.length} Söz`);
			lines.push('');
			lines.push('💡Komutlar için: `/risale`');

			return lines.join('\n');
		} catch (error) {
			console.error('❌ Error getting TOC summary:', error);
			return '❌ İçindekiler yüklenirken hata oluştu.';
		}
	}

	/**
	 * Get emoji for soz number
	 */
	private getSozEmoji(sozNo: number): string {
		if (sozNo <= 9) return `${sozNo}️⃣`;
		if (sozNo === 10) return '🔟';

		const digits = sozNo.toString().split('');
		return digits.map(digit => `${digit}️⃣`).join('');
	}

	/**
	 * Get number emoji for lists
	 */
	private getNumberEmoji(num: number): string {
		if (num <= 9) return `${num}️⃣`;
		if (num === 10) return '🔟';

		const digits = num.toString().split('');
		return digits.map(digit => `${digit}️⃣`).join('');
	}

	/**
	 * Get random words from Sözler Kitabı dictionary
	 */
	async getRandomWords(count: number = 15): Promise<string> {
		try {
			const dictionaryPath = resolve(INDEX_DIR, 'dictionary.json');
			const dictionary = await readJsonSafe(dictionaryPath, {});

			if (!dictionary || Object.keys(dictionary).length === 0) {
				return '❌ Kelime sözlüğü bulunamadı.';
			}

			const entries = Object.entries(dictionary);
			const shuffled = entries.sort(() => 0.5 - Math.random());
			const selected = shuffled.slice(0, count);

			const lines = [
				'📚 *RİSALE-İ NUR - SÖZLER | RASTGELE KELİMELER*',
				'',
				'🔤 *Bu kelimeler Risale-i Nur Sözler Kitabı\'ndan:*',
				''
			];

			selected.forEach((entry, index) => {
				const [word, meaning] = entry;
				const emoji = this.getNumberEmoji(index + 1);
				lines.push(`${emoji} *${word}:* ${meaning}`);
			});

			lines.push('');
			lines.push('💡 Yeni kelimeler öğrenmeye devam etmek için komutu kullanabilir veya *_"risale kelimeler"_* yazabilirsiniz.');

			return lines.join('\n');
		} catch (error) {
			console.error('❌ Error getting random words:', error);
			return '❌ Kelimeler yüklenirken hata oluştu.';
		}
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
	async getNextPageInfo(currentPage: RisalePage): Promise<{ command: string; description: string; sozlerCommand?: string } | null> {
		try {
			const sozInfo = await this.getSozInfo(currentPage.sozNo);
			if (!sozInfo) return null;

			// Calculate current sozlerId if not available
			let currentSozlerId = currentPage.sozlerId;
			if (!currentSozlerId) {
				// Calculate from sozNo and pageIndex using the range
				currentSozlerId = sozInfo.range.startId + (currentPage.pageIndex - 1);
			}

			const totalPages = await this.getTotalPageCount();

			// Check if there's a next page in the same soz
			if (currentPage.pageIndex < sozInfo.range.count) {
				const nextPageNo = currentPage.pageIndex + 1;
				const nextSozlerId = currentSozlerId + 1;

				const result: { command: string; description: string; sozlerCommand?: string } = {
					command: `/risalesozler ${currentPage.sozNo} sayfa ${nextPageNo}`,
					description: `${currentPage.sozNo}. Söz ${nextPageNo}. sayfasını açar`
				};

				// Only add sozlerCommand if the next page exists in Sözler Kitabı
				if (nextSozlerId <= totalPages) {
					result.sozlerCommand = `/risalesozlersayfa ${nextSozlerId}`;
				}

				return result;
			}

			// Check if there's a next soz
			const toc = await this.getToc();
			const currentSozIndex = toc.findIndex(entry => entry.sozNo === currentPage.sozNo);
			if (currentSozIndex >= 0 && currentSozIndex < toc.length - 1) {
				const nextSoz = toc[currentSozIndex + 1];
				if (nextSoz) {
					const nextSozlerId = currentSozlerId + 1;

					const result: { command: string; description: string; sozlerCommand?: string } = {
						command: `/risalesozler ${nextSoz.sozNo}`,
						description: `${nextSoz.sozNo}. Söz 1. sayfasını açar`
					};

					// Only add sozlerCommand if the next page exists in Sözler Kitabı
					if (nextSozlerId <= totalPages) {
						result.sozlerCommand = `/risalesozlersayfa ${nextSozlerId}`;
					}

					return result;
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