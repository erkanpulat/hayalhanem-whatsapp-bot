import path from 'node:path';
import fs from 'node:fs/promises';

import { readJsonSafe } from '../utils/file-ops.js';
import { normalizeText } from '../utils/text-utils.js';
import type {
	RisaleCommand,
	RisalePage,
	RisaleSoz,
	TocEntry,
	PageMapEntry,
	SubHeading,
	MeaningDisplayMode
} from '../types/risale.js';
import { RISALE_CONFIG } from '../config/risale.js';
import {
	RISALE_SOZLER_DIR,
	RISALE_DATA_DIR,
	RISALE_FILES,
	SOZ_FILES
} from '../config/paths.js';

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

		// risale slug sayfa X kapali OR risale slug sayfaX kapali → interlude page with closed meaning
		const interludePageMatch = normalized.match(/^risale\s+([a-z0-9-]+)\s+sayfa\s+(\d+)(?:\s+(kapali))?$|^risale([a-z0-9-]+)sayfa(\d+)(?:(kapali))?$/i);
		if (interludePageMatch) {
			const slug = interludePageMatch[1] || interludePageMatch[4];
			const pageNoStr = interludePageMatch[2] || interludePageMatch[5];

			if (slug && pageNoStr) {
				const pageNo = parseInt(pageNoStr, 10);
				const showMeaning = (interludePageMatch[3] || interludePageMatch[6]) === 'kapali' ? 'closed' : 'open';

				return {
					type: 'interlude',
					slug: slug,
					pageNo: pageNo,
					showMeaning: showMeaning
				};
			}
		}

		// Default to help if can't parse
		return { type: 'help' };
	}

	/**
	 * Get a specific page from a soz
	 */
	async getPage(sozNo: number, pageNo: number = 1, showMeaning: MeaningDisplayMode = 'open'): Promise<RisalePage | null> {
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
	 * Get interlude content by slug
	 */
	async getInterlude(slug: string, pageNo: number = 1, showMeaning: MeaningDisplayMode = 'open'): Promise<RisalePage | null> {
		try {
			// Find the interlude entry in TOC to get the correct file slug
			const toc = await this.getToc();
			const interludeEntry = toc.find(entry =>
				entry.type === 'interlude' &&
				(entry.slug === slug || entry.slug.endsWith(`-${slug}`))
			);
			if (!interludeEntry) {
				throw new Error(`Interlude with slug "${slug}" not found in TOC`);
			}

			const filePath = path.join(RISALE_DATA_DIR, 'sozler', `${interludeEntry.slug}.json`);
			const data = await fs.readFile(filePath, 'utf8');
			const interlude = JSON.parse(data);
			if (!interlude.pages || pageNo < 1 || pageNo > interlude.pages.length) {
				return null;
			}

			const page = interlude.pages[pageNo - 1];
			return {
				sozlerId: page.globalId,
				pageIndex: pageNo,
				sozNo: 0, // Interlude doesn't have sozNo
				url: page.url,
				text_open: showMeaning === 'open' ? page.text_open : '',
				text_closed: showMeaning === 'closed' ? page.text_closed : page.text_open,
				footnotes: page.footnotes || [],
				dictionary: page.dictionary || []
			};
		} catch (error) {
			console.error(`❌ Error getting interlude ${slug} page ${pageNo}:`, error);
			return null;
		}
	}

	/**
	 * Get page by Sözler Kitabı ID
	 */
	async getSozlerPage(sozlerPageId: number, showMeaning: MeaningDisplayMode = 'open'): Promise<RisalePage | null> {
		try {
			const pageMap = await this.loadPageMap();
			const entry = pageMap[sozlerPageId.toString()];

			if (!entry) return null;

			let page: RisalePage | null = null;

			if (entry.type === 'interlude') {
				page = await this.getInterlude(entry.slug, entry.pageIndex, showMeaning);
				if (page) {
					page.sozNo = entry.afterSoz || 0;
					(page as any).interlukTitle = entry.title;
					(page as any).interlukSlug = entry.slug;
					(page as any).isInterlude = true;
				}
			} else {
				page = await this.getPage(entry.sozNo!, entry.pageIndex, showMeaning);
			}

			if (!page) return null;

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
			const data = await readJsonSafe(RISALE_FILES.TOC, { items: [] });

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

			for (let i = 0; i < toc.length; i++) {
				const entry = toc[i];
				if (!entry) continue;

				const nextEntry = toc[i + 1];

				if (entry.type === 'interlude') {
					// If beforeSoz is null (independent sections like Lemeât, Konferans), add a blank line above
					if (entry.beforeSoz === null) {
						lines.push('');
					}

					const title = entry.title.replace(/\n/g, ' ').trim();
					const pageRange = `Sayfa ${entry.range.startId}-${entry.range.endId}`;

					lines.push(`    • ${title} *(${pageRange})*`);

					if (entry.subheadings?.length) {
						this.renderSubheadings(entry.subheadings, entry.range.startId, lines, '      ');
					}

					if (nextEntry?.type !== 'interlude') {
						lines.push('');
					}
				} else {
					const emoji = this.getSozEmoji(entry.sozNo!);
					const title = entry.title.replace(/^\d+\.\s*/, '');
					const pageInfo = `(${entry.range.count} sayfa)`;
					const pageRange = `Sayfa ${entry.range.startId}-${entry.range.endId}`;

					lines.push(`${emoji} *${entry.sozNo}. ${title}* ${pageInfo} - *${pageRange}*`);

					if (entry.subheadings?.length) {
						this.renderSubheadings(entry.subheadings, entry.range.startId, lines, '    ');
					}

					if (!nextEntry || nextEntry.type !== 'interlude') {
						lines.push('');
					}
				}
			}

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
	 * Render subheadings recursively with proper indentation
	 */
	private renderSubheadings(subheadings: SubHeading[], startPageId: number, lines: string[], indent: string): void {
		for (const sub of subheadings) {
			const realPageNo = startPageId + (sub.pageIndex - 1);
			lines.push(`${indent}• ${sub.title} *(Sayfa ${realPageNo})*`);

			if (sub.subheadings && sub.subheadings.length) {
				this.renderSubheadings(sub.subheadings, startPageId, lines, indent + '  ');
			}
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
	async getRandomWords(count: number = RISALE_CONFIG.DEFAULT_WORDS_COUNT): Promise<string> {
		try {
			const dictionary = await readJsonSafe(RISALE_FILES.DICTIONARY, {});

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
			return RISALE_CONFIG.MAX_PAGE_COUNT; // fallback to known count
		}
	}

	/**
	 * Load the page map data
	 */
	private async getPageMap(): Promise<Record<string, PageMapEntry>> {
		try {
			const data = await fs.readFile(RISALE_FILES.PAGE_MAP, 'utf-8');
			return JSON.parse(data);
		} catch (error) {
			console.error('❌ Error loading page map:', error);
			throw error;
		}
	}

	/**
	 * Find the next available page number after the given page
	 */
	private async findNextAvailablePage(currentPageId: number): Promise<number | null> {
		try {
			const pageMap = await this.getPageMap();
			const pageNumbers = Object.keys(pageMap).map(Number).sort((a, b) => a - b);

			// Find the next available page after current
			const nextPage = pageNumbers.find(pageNum => pageNum > currentPageId);
			return nextPage || null;
		} catch (error) {
			console.error('❌ Error finding next available page:', error);
			return null;
		}
	}

	/**
	 * Find the previous available page number before the given page
	 */
	async findPreviousAvailablePage(currentPageId: number): Promise<number | null> {
		try {
			const pageMap = await this.getPageMap();
			const pageNumbers = Object.keys(pageMap).map(Number).sort((a, b) => b - a);

			// Find the previous available page before current
			const prevPage = pageNumbers.find(pageNum => pageNum < currentPageId);
			return prevPage || null;
		} catch (error) {
			console.error('❌ Error finding previous available page:', error);
			return null;
		}
	}

	/**
	 * Get next page navigation info for a given page
	 */
	async getNextPageInfo(currentPage: RisalePage): Promise<{ command: string; description: string; sozlerCommand?: string } | null> {
		try {
			// For sozler page system (global), find the next available page
			if (currentPage.sozlerId) {
				const nextAvailablePage = await this.findNextAvailablePage(currentPage.sozlerId);
				if (nextAvailablePage) {
					return {
						command: `/risalesozlersayfa ${nextAvailablePage}`,
						description: `Sözler Kitabı ${nextAvailablePage}. sayfasını açar`
					};
				}
				return null;
			}

			// For regular soz pages
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
			const filename = SOZ_FILES[sozNo as keyof typeof SOZ_FILES];
			if (!filename) return null;

			const filePath = path.join(RISALE_SOZLER_DIR, filename);
			return await readJsonSafe(filePath, null);
		} catch (error) {
			console.error(`❌ Error loading soz ${sozNo}:`, error);
			return null;
		}
	}

	private async loadPageMap(): Promise<Record<string, PageMapEntry>> {
		if (this.pageMapCache) return this.pageMapCache;

		try {
			this.pageMapCache = await readJsonSafe(RISALE_FILES.PAGE_MAP, {});
			return this.pageMapCache;
		} catch (error) {
			console.error('❌ Error loading page map:', error);
			return {};
		}
	}
}