import { RisaleService } from '../../services/risale.service.js';
import type { RisaleCommand, RisalePage } from '../../types/risale.js';
import type { WhatsAppResponse, WhatsAppButton, CallbackData } from '../../types/whatsapp.js';
import { BUTTON_TEXTS } from '../constants.js';
import { CALLBACK_IDS } from '../logic.js';
import { RISALE_CONFIG } from '../../config/risale.js';

const risaleService = new RisaleService();

export async function handleRisale(text: string): Promise<WhatsAppResponse> {
	try {
		const command = risaleService.parseCommand(text);

		switch (command.type) {
			case 'help':
				return {
					text: createHelpMessage(),
					buttons: createHelpButtons()
				};

			case 'toc':
				const tocSummary = await risaleService.getTocSummary();
				return {
					text: tocSummary,
					buttons: createTocButtons()
				};

			case 'kelime':
				return await handleWordsRequest();

			case 'soz':
				return await handleSozRequest(command);

			case 'sozlerPage':
				return await handleSozlerPageRequest(command);

			case 'interlude':
				return await handleInterludeRequest(command);

			default:
				return { text: createHelpMessage() };
		}
	} catch (error) {
		console.error('❌ Error handling risale command:', error);
		return { text: createErrorMessage() };
	}
}

export async function handleRisaleCallback(callbackId: string): Promise<WhatsAppResponse> {
	try {
		switch (callbackId) {
			case CALLBACK_IDS.RISALE_WORD_PRACTICE:
				return await handleWordsRequest();

			case CALLBACK_IDS.START_RISALE:
				return await handleSozRequest({ type: 'soz', sozNo: 1, showMeaning: 'open' });

			case CALLBACK_IDS.RISALE_TOC:
				return await handleRisale('/risaleicindekiler');

			case CALLBACK_IDS.RISALE_RANDOM:
				const randomSozNo = Math.floor(Math.random() * RISALE_CONFIG.MAX_SOZ_COUNT) + 1;
				return await handleSozRequest({ type: 'soz', sozNo: randomSozNo, showMeaning: 'open' });

			case CALLBACK_IDS.RISALE_HELP:
				return {
					text: createHelpMessage(),
					buttons: createHelpButtons()
				};
		}

		const callbackData = parseCallbackId(callbackId);

		switch (callbackData.action) {
			case 'previous_page':
				return await handlePageNavigation(callbackData.sozNo!, callbackData.pageNo!, callbackData.showMeaning!, 'soz');

			case 'next_page':
				return await handlePageNavigation(callbackData.sozNo!, callbackData.pageNo!, callbackData.showMeaning!, 'soz');

			case 'toggle_meanings':
				return await handlePageNavigation(callbackData.sozNo!, callbackData.pageNo!, callbackData.showMeaning!, 'soz');

			case 'previous_sozler_page':
				return await handleSozlerPageNavigation(callbackData.sozlerPageId!, callbackData.showMeaning!);

			case 'next_sozler_page':
				return await handleSozlerPageNavigation(callbackData.sozlerPageId!, callbackData.showMeaning!);

			case 'toggle_sozler_meanings':
				return await handleSozlerPageNavigation(callbackData.sozlerPageId!, callbackData.showMeaning!);

			case 'interlude_prev':
			case 'interlude_next':
			case 'interlude_toggle':
				return await handleInterludeNavigation(callbackId);

			default:
				return { text: createErrorMessage() };
		}
	} catch (error) {
		console.error('❌ Error handling risale callback:', error);
		return { text: createErrorMessage() };
	}
}

async function handleSozRequest(command: RisaleCommand): Promise<WhatsAppResponse> {
	if (!command.sozNo) return { text: createSpecificErrorMessage('INVALID_COMMAND') };

	const isValid = await risaleService.isValidSozNo(command.sozNo);
	if (!isValid) {
		return { text: createSpecificErrorMessage('INVALID_SOZ', { sozNo: command.sozNo }) };
	}

	const page = await risaleService.getPage(
		command.sozNo,
		command.pageNo || 1,
		command.showMeaning || 'open'
	);
	if (!page) {
		const sozInfo = await risaleService.getSozInfo(command.sozNo);
		if (sozInfo && command.pageNo && command.pageNo > sozInfo.range.count) {
			return { text: `❌ ${command.sozNo}. Söz'ün ${command.pageNo}. sayfası bulunamadı. Bu söz ${sozInfo.range.count} sayfadan oluşmaktadır.` };
		}

		return { text: createSpecificErrorMessage('PAGE_NOT_FOUND') };
	}

	return await createPageMessage(page, command);
}

async function handleSozlerPageRequest(command: RisaleCommand): Promise<WhatsAppResponse> {
	if (!command.sozlerPageId) return { text: createSpecificErrorMessage('INVALID_COMMAND') };

	const totalPages = await risaleService.getTotalPageCount();
	if (command.sozlerPageId > totalPages || command.sozlerPageId < 1) {
		return { text: `❌ Sözler Kitabı sayfa ${command.sozlerPageId} bulunamadı. Lütfen 1-${totalPages} arası bir sayı girin.` };
	}

	const page = await risaleService.getSozlerPage(
		command.sozlerPageId,
		command.showMeaning || 'open'
	);

	if (!page) {
		return { text: `❌ Sözler Kitabı sayfa ${command.sozlerPageId} bulunamadı.` };
	}

	return await createPageMessage(page, command);
}

async function handleInterludeRequest(command: RisaleCommand): Promise<WhatsAppResponse> {
	if (!command.slug) return { text: createSpecificErrorMessage('INVALID_COMMAND') };

	const page = await risaleService.getInterlude(
		command.slug,
		command.pageNo || 1,
		command.showMeaning || 'open'
	);
	if (!page) {
		return { text: `❌ İstenen sayfa bulunamadı.` };
	}

	const pageText = command.showMeaning === 'closed' ? page.text_closed : page.text_open;
	if (!pageText) {
		return { text: `❌ Bu sayfada gösterilecek içerik bulunmuyor.` };
	}

	const buttons = [];

	// Navigation buttons - always show if we have valid page numbers
	if (page.pageIndex > 1) {
		buttons.push({
			id: `interlude_prev_${command.slug}_${page.pageIndex - 1}_${command.showMeaning || 'open'}`,
			title: '◀️ Önceki',
			type: 'reply'
		});
	}

	// Simple page info without total page count
	buttons.push({
		id: `interlude_info_${command.slug}_${page.pageIndex}_${command.showMeaning || 'open'}`,
		title: `📄 Sayfa ${page.pageIndex}`,
		type: 'reply'
	});

	// Always show next button - let service handle if next page exists
	buttons.push({
		id: `interlude_next_${command.slug}_${page.pageIndex + 1}_${command.showMeaning || 'open'}`,
		title: 'Sonraki ▶️',
		type: 'reply'
	});

	// Toggle meanings
	if ((command.showMeaning || 'open') === 'open') {
		buttons.push({
			id: `interlude_toggle_${command.slug}_${page.pageIndex}_closed`,
			title: '🔒 Anlam Kapalı',
			type: 'reply'
		});
	} else {
		buttons.push({
			id: `interlude_toggle_${command.slug}_${page.pageIndex}_open`,
			title: '🔓 Anlam Açık',
			type: 'reply'
		});
	}

	// Action buttons
	buttons.push({
		id: CALLBACK_IDS.RISALE_TOC,
		title: '📖 İçindekiler',
		type: 'reply'
	});
	buttons.push({
		id: CALLBACK_IDS.RISALE_HELP,
		title: '❓ Yardım',
		type: 'reply'
	});

	// Simple response without unnecessary TOC lookup
	const response = `*Sayfa ${page.pageIndex}*\n\n${pageText}`;

	return {
		text: response,
		buttons
	};
}

async function handleWordsRequest(): Promise<WhatsAppResponse> {
	const wordsText = await risaleService.getRandomWords(RISALE_CONFIG.DEFAULT_WORDS_COUNT);

	return {
		text: wordsText,
		buttons: createWordButtons()
	};
}

async function createPageMessage(page: RisalePage, command: RisaleCommand): Promise<WhatsAppResponse> {
	const parts = [];

	// Header - show different format for Sözler Kitabı page vs soz page
	const meaningType = command.showMeaning === 'closed' ? ' (Anlam Kapalı)' : '';

	if (command.type === 'sozlerPage') {
		// Check if this is an interlude page
		if ((page as any).isInterlude) {
			// This is an interlude page
			let interlukTitle = (page as any).interlukTitle || 'İnterlük';
			// Fix encoding issues
			interlukTitle = interlukTitle.replace('LemeÃ¢t', "Lema'at");
			parts.push(`🌐 *Sözler Kitabı ${page.sozlerId}. Sayfa - ${interlukTitle}${meaningType}*`);
		} else {
			// This is a regular soz page in global system
			parts.push(`🌐 *Sözler Kitabı ${page.sozlerId}. Sayfa - ${page.sozNo}. Söz ${page.pageIndex}. Sayfa${meaningType}*`);
		}
	} else {
		parts.push(`📖 *${page.sozNo}. Söz - ${page.pageIndex}. Sayfa${meaningType}*`);
	}

	parts.push('');

	const content = command.showMeaning === 'closed' ? page.text_closed : page.text_open;
	if (content) {
		parts.push(content);
	} else {
		parts.push('_İçerik bulunamadı._');
	}

	if (page.footnotes?.length) {
		parts.push('');
		parts.push('📝 *Dipnotlar:*');
		page.footnotes.forEach(footnote => {
			parts.push(`[${footnote.n}] ${footnote.text}`);
		});
	}

	if (command.showMeaning === 'closed' && page.dictionary?.length) {
		parts.push('');
		parts.push('📚 *Bu Sayfadaki Kelimeler:*');
		page.dictionary.forEach(entry => {
			parts.push(`• *${entry.word}:* ${entry.meaning}`);
		});
	}

	parts.push('');
	parts.push('🔗 *Kaynak:* ' + page.url);

	const buttons = await createPageButtons(page, command);

	return {
		text: parts.join('\n'),
		buttons
	};
}

async function createPageButtons(page: RisalePage, command: RisaleCommand): Promise<WhatsAppButton[]> {
	const buttons: WhatsAppButton[] = [];
	const showMeaning = command.showMeaning || 'open';

	// Previous page logic - different for sozlerPage (global) vs regular soz
	if (command.type === 'sozlerPage') {
		// For global page system, find previous available page
		const previousPageId = page.sozlerId ? await risaleService.findPreviousAvailablePage(page.sozlerId) : null;
		if (previousPageId) {
			buttons.push({
				id: `previous_sozler_page_${previousPageId}_${showMeaning}`,
				title: BUTTON_TEXTS.NAV_PREV_PAGE,
				type: 'reply'
			});
		}
	} else {
		// For regular soz pages, check if pageIndex > 1
		if (page.pageIndex > 1) {
			buttons.push({
				id: `previous_page_${page.sozNo}_${page.pageIndex - 1}_${showMeaning}`,
				title: BUTTON_TEXTS.NAV_PREV_PAGE,
				type: 'reply'
			});
		}
	}

	// Next page logic
	const nextPageInfo = await risaleService.getNextPageInfo(page);
	if (nextPageInfo) {
		let buttonId: string;
		if (command.type === 'sozlerPage') {
			// Extract page number from nextPageInfo.command (e.g., "/risalesozlersayfa 489" -> 489)
			const pageMatch = nextPageInfo.command.match(/\/risalesozlersayfa (\d+)/);
			const nextPageId = pageMatch ? pageMatch[1] : (page.sozlerId || 1) + 1;
			buttonId = `next_sozler_page_${nextPageId}_${showMeaning}`;
		} else {
			const sozInfo = await risaleService.getSozInfo(page.sozNo);
			if (sozInfo && page.pageIndex < sozInfo.range.count) {
				buttonId = `next_page_${page.sozNo}_${page.pageIndex + 1}_${showMeaning}`;
			} else {
				const nextSozNo = page.sozNo + 1;
				buttonId = `next_page_${nextSozNo}_1_${showMeaning}`;
			}
		}

		buttons.push({
			id: buttonId,
			title: BUTTON_TEXTS.NAV_NEXT_PAGE,
			type: 'reply'
		});
	}

	const showMeaningState = command.showMeaning || 'open';
	const toggleText = showMeaningState === 'closed' ? BUTTON_TEXTS.NAV_MEANINGS_OPEN : BUTTON_TEXTS.NAV_MEANINGS_CLOSE;
	const toggleMode = showMeaningState === 'closed' ? 'open' : 'closed';

	const toggleButtonId = command.type === 'sozlerPage'
		? `toggle_sozler_meanings_${page.sozlerId || 1}_${toggleMode}`
		: `toggle_meanings_${page.sozNo}_${page.pageIndex}_${toggleMode}`;

	buttons.push({
		id: toggleButtonId,
		title: toggleText,
		type: 'reply'
	});

	return buttons;
}

async function handlePageNavigation(sozNo: number, pageNo: number, showMeaning: 'open' | 'closed', type: 'soz'): Promise<WhatsAppResponse> {
	const command: RisaleCommand = {
		type,
		sozNo,
		pageNo,
		showMeaning
	};

	return await handleSozRequest(command);
}

async function handleSozlerPageNavigation(sozlerPageId: number, showMeaning: 'open' | 'closed'): Promise<WhatsAppResponse> {
	const command: RisaleCommand = {
		type: 'sozlerPage',
		sozlerPageId,
		showMeaning
	};

	return await handleSozlerPageRequest(command);
}

async function handleInterludeNavigation(callbackId: string): Promise<WhatsAppResponse> {
	const parts = callbackId.split('_');

	if (parts.length < 5) {
		return { text: createSpecificErrorMessage('INVALID_COMMAND') };
	}

	const slug = parts[2];
	const pageNoStr = parts[3];
	const showMeaning = parts[4] as 'open' | 'closed';

	if (!slug || !pageNoStr) {
		return { text: createSpecificErrorMessage('INVALID_COMMAND') };
	}

	const pageNo = parseInt(pageNoStr, 10);
	if (isNaN(pageNo)) {
		return { text: createSpecificErrorMessage('INVALID_COMMAND') };
	}

	return await handleInterludeRequest({
		type: 'interlude',
		slug,
		pageNo,
		showMeaning
	});
}

function createSpecificErrorMessage(errorType: string, context?: any): string {
	switch (errorType) {
		case 'INVALID_SOZ':
			return `❌ ${context.sozNo}. Söz bulunamadı. Lütfen 1-${RISALE_CONFIG.MAX_SOZ_COUNT} arası bir sayı girin.`;
		case 'PAGE_NOT_FOUND':
			return `❌ Sayfa bulunamadı.`;
		case 'INVALID_COMMAND':
			return createErrorMessage();
		default:
			return createErrorMessage();
	}
}

export function createHelpMessage(): string {
	return [
		'📖 *RİSALE-İ NUR - SÖZLER | YARDIM REHBERİ*',
		'',
		'🔍 *Örnek Komutlar:*',
		'',
		'📚 *Bir Söz’ü sayfa sayfa okumak için:*',
		'• `/risalesozler 9` → 9. Söz’ün *1. sayfasını* açar (varsayılan: anlamlar açık).',
		'• `/risalesozler 9 sayfa 3` → 9. Söz’ün *3. sayfasını* açar (varsayılan: anlamlar açık).',
		'• `/risalesozler 9 kapalı` → 9. Söz’ün *1. sayfasını* açar, *anlamları kapalı olarak açar ve bilinmeyen kelimeleri sayfa sonunda listeler.*',
		'• *_"risale sözler 9"_* → Doğal dil ile de aynı işlev sağlanır.',
		'',
		'🌍 *Sözler Kitabı’nın genel sayfa sistemini kullanmak için:*',
		'• `/risalesozlersayfa 421` → *Sözler Kitabı’nın 421. sayfasını* açar (varsayılan: anlamlar açık).',
		'• `/risalesozlersayfa 421 kapalı` → *Sözler Kitabı’nın 421. sayfasını* açar, *anlamları kapalı olarak açar ve bilinmeyen kelimeleri sayfa sonunda listeler.*',
		'• *_"risale sözler sayfa 421"_* → Doğal dil ile de aynı işlev sağlanır.',
		'',
		'ℹ️ *Diğer Komutlar:*',
		'• `/risale` → Yardım menüsünü gösterir.',
		'• `/risalekelimeler` → *Sözler Kitabı’ndan rastgele 15 kelime seçerek kelime çalışması yapmanı sağlar.*',
		'• `/risaleicindekiler` → *Tüm Sözler’in listesini ve sayfa numaralarını gösterir.*',
		'• *_"risale içindekiler"_* veya *_"risale liste"_* → Doğal dil ile de aynı işlev sağlanır.',
		'',
		'✨ *Toplam 33 Söz mevcut (1-33).*',
		'💡 Her Söz’ün kendi sayfa numarası vardır; ayrıca *Sözler Kitabı’nın genel sayfa sistemi* de bulunur.',
		'',
		'🤲 Hayırlı ve verimli okumalar dilerim!'
	].join('\n');
}

function parseCallbackId(callbackId: string): CallbackData {
	const parts = callbackId.split('_');

	if (parts.length < 2) {
		throw new Error(`Invalid callback ID format: ${callbackId}`);
	}

	switch (parts[0]) {
		case 'previous':
		case 'next':
			if (parts[1] === 'page' && parts.length >= 5) {
				// Format: previous_page_9_2_open veya next_page_9_3_closed
				return {
					action: `${parts[0]}_page`,
					sozNo: parseInt(parts[2] || '0'),
					pageNo: parseInt(parts[3] || '0'),
					showMeaning: (parts[4] || 'open') as 'open' | 'closed'
				};
			} else if (parts[1] === 'sozler' && parts.length >= 5) {
				// Format: previous_sozler_page_421_open
				return {
					action: `${parts[0]}_sozler_page`,
					sozlerPageId: parseInt(parts[3] || '0'),
					showMeaning: (parts[4] || 'open') as 'open' | 'closed'
				};
			}
			break;
		case 'toggle':
			if (parts[1] === 'meanings' && parts.length >= 5) {
				// Format: toggle_meanings_9_2_closed
				return {
					action: 'toggle_meanings',
					sozNo: parseInt(parts[2] || '0'),
					pageNo: parseInt(parts[3] || '0'),
					showMeaning: (parts[4] || 'open') as 'open' | 'closed'
				};
			} else if (parts[1] === 'sozler' && parts.length >= 5) {
				// Format: toggle_sozler_meanings_421_closed
				return {
					action: 'toggle_sozler_meanings',
					sozlerPageId: parseInt(parts[3] || '0'),
					showMeaning: (parts[4] || 'open') as 'open' | 'closed'
				};
			}
			break;
		case 'another':
			return { action: 'another_word_batch' };
		case 'start':
			return { action: 'start_risale' };
	}

	throw new Error(`Unknown callback ID: ${callbackId}`);
}

function createErrorMessage(): string {
	return [
		'❌ Bir hata oluştu. Lütfen komutu doğru yazdığınızdan emin olun.',
		'',
		'Yardım için: `/risale`'
	].join('\n');
}

function createTocButtons(): WhatsAppButton[] {
	return [
		{
			id: CALLBACK_IDS.START_RISALE,
			title: BUTTON_TEXTS.RISALE_READ,
			type: 'reply'
		},
		{
			id: CALLBACK_IDS.RISALE_HELP,
			title: BUTTON_TEXTS.RISALE_HELP,
			type: 'reply'
		},
		{
			id: CALLBACK_IDS.RISALE_RANDOM,
			title: BUTTON_TEXTS.RISALE_RANDOM,
			type: 'reply'
		}
	];
}

function createWordButtons(): WhatsAppButton[] {
	return [
		{
			id: CALLBACK_IDS.RISALE_WORD_PRACTICE,
			title: BUTTON_TEXTS.RISALE_NEW_WORDS,
			type: 'reply'
		},
		{
			id: CALLBACK_IDS.START_RISALE,
			title: BUTTON_TEXTS.RISALE_READ,
			type: 'reply'
		},
		{
			id: CALLBACK_IDS.RISALE_HELP,
			title: BUTTON_TEXTS.RISALE_HELP,
			type: 'reply'
		}
	];
}

function createHelpButtons(): WhatsAppButton[] {
	return [
		{
			id: CALLBACK_IDS.START_RISALE,
			title: BUTTON_TEXTS.RISALE_READ,
			type: 'reply'
		},
		{
			id: CALLBACK_IDS.RISALE_TOC,
			title: BUTTON_TEXTS.RISALE_TOC,
			type: 'reply'
		},
		{
			id: CALLBACK_IDS.RISALE_WORD_PRACTICE,
			title: BUTTON_TEXTS.RISALE_WORD_PRACTICE,
			type: 'reply'
		}
	];
}