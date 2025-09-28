import { RisaleService } from '../../services/risale.service.js';
import type { RisaleCommand, RisalePage } from '../../types/risale.js';

const risaleService = new RisaleService();

export async function handleRisale(text: string): Promise<string> {
	try {
		const command = risaleService.parseCommand(text);

		switch (command.type) {
			case 'help':
				return createHelpMessage();

			case 'soz':
				return await handleSozRequest(command);

			case 'globalPage':
				return await handleGlobalPageRequest(command);

			default:
				return createHelpMessage();
		}
	} catch (error) {
		console.error('❌ Error handling risale command:', error);
		return createErrorMessage();
	}
}

async function handleSozRequest(command: RisaleCommand): Promise<string> {
	if (!command.sozNo) return createErrorMessage();

	const isValid = await risaleService.isValidSozNo(command.sozNo);
	if (!isValid) {
		return `❌ ${command.sozNo}. Söz bulunamadı. Lütfen 1-33 arası bir sayı girin.`;
	}

	const page = await risaleService.getPage(
		command.sozNo,
		command.pageNo || 1,
		command.showMeaning || 'open'
	);

	if (!page) {
		const sozInfo = await risaleService.getSozInfo(command.sozNo);
		if (sozInfo && command.pageNo && command.pageNo > sozInfo.range.count) {
			return `❌ ${command.sozNo}. Söz'ün ${command.pageNo}. sayfası bulunamadı. Bu söz ${sozInfo.range.count} sayfa.`;
		}
		return `❌ Sayfa bulunamadı.`;
	}

	return await createPageMessage(page, command);
}

async function handleGlobalPageRequest(command: RisaleCommand): Promise<string> {
	if (!command.globalPageId) return createErrorMessage();

	const totalPages = await risaleService.getTotalPageCount();
	if (command.globalPageId > totalPages || command.globalPageId < 1) {
		return `❌ Global sayfa ${command.globalPageId} bulunamadı. Lütfen 1-${totalPages} arası bir sayı girin.`;
	}

	const page = await risaleService.getGlobalPage(
		command.globalPageId,
		command.showMeaning || 'open'
	);

	if (!page) {
		return `❌ Global sayfa ${command.globalPageId} bulunamadı.`;
	}

	return await createPageMessage(page, command);
}

async function createPageMessage(page: RisalePage, command: RisaleCommand): Promise<string> {
	const parts = [];

	// Header - show different format for global page vs soz page
	const meaningType = command.showMeaning === 'closed' ? ' (Anlam Kapalı)' : '';

	if (command.type === 'globalPage') {
		parts.push(`🌐 *Global ${page.globalId}. Sayfa - ${page.sozNo}. Söz ${page.pageIndex}. Sayfa${meaningType}*`);
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

	if (page.footnotes?.length && parts.join('\n').length < 2500) {
		parts.push('');
		parts.push('📝 *Dipnotlar:*');
		page.footnotes.forEach(footnote => {
			parts.push(`[${footnote.n}] ${footnote.text}`);
		});
	}

	const nextPageInfo = await risaleService.getNextPageInfo(page);
	if (nextPageInfo) {
		parts.push('');
		parts.push(`➡️ *Sonraki sayfa:*`);
		parts.push(`• \`${nextPageInfo.command}\` _(${nextPageInfo.description})_`);
		if (nextPageInfo.globalCommand) {
			parts.push(`• \`${nextPageInfo.globalCommand}\` _(Global sayfa)_`);
		}
	}

	parts.push('');
	parts.push('🔗 *Kaynak:* ' + page.url);

	return parts.join('\n');
}

function createHelpMessage(): string {
	return [
		'📖 *Risale-i Nur - Sözler Rehberi*',
		'',
		'🔍 *Örnek komutlar:*',
		'',
		'📚 *Bir Söz’ü sayfa sayfa okumak için:*',
		'• `risale söz 18` → 18. Söz’ün *1. sayfasını* açar (*anlamlar açık - varsayılan*)',
		'• `risale söz 18 sayfa 3` → 18. Söz’ün *3. sayfasını* açar (*anlamlar açık*)',
		'• `risale söz 18 kapali` → 18. Söz’ün *1. sayfasını* açar, *anlamları gizler*',
		'• `risale söz 18 sayfa 3 kapali` → 18. Söz’ün *3. sayfasını* açar, *anlamları gizler*',
		'',
		'🌍 *Tüm Sözler için global sayfa sistemini kullanmak için:*',
		'• `risale sayfa 421` → *Global 421. sayfayı* açar (*anlamlar açık - varsayılan*)',
		'• `risale sayfa 421 kapali` → *Global 421. sayfayı* açar, *anlamları gizler*',
		'',
		'ℹ️ *Genel:*',
		'• `/risale` → Bu yardım menüsünü gösterir',
		'',
		'✨ *Toplam 33 Söz mevcut (1-33)*',
		'💡 Her Söz’ün *kendi sayfa numaraları* vardır; ayrıca tüm Sözler için ortak bir *global sayfa sistemi* de bulunur.',
		'',
		'🤲 Hayırlı ve verimli okumalar dilerim!'
	].join('\n');
}

function createErrorMessage(): string {
	return [
		'❌ Bir hata oluştu. Lütfen komutu doğru yazdığınızdan emin olun.',
		'',
		'Yardım için: `/risale`'
	].join('\n');
}