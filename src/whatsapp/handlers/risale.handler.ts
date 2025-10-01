import { RisaleService } from '../../services/risale.service.js';
import type { RisaleCommand, RisalePage } from '../../types/risale.js';

const risaleService = new RisaleService();

export async function handleRisale(text: string): Promise<string> {
	try {
		const command = risaleService.parseCommand(text);

		switch (command.type) {
			case 'help':
				return createHelpMessage();

			case 'toc':
				return await risaleService.getTocSummary();

			case 'kelime':
				return await risaleService.getRandomWords(15);

			case 'soz':
				return await handleSozRequest(command);

			case 'sozlerPage':
				return await handleSozlerPageRequest(command);

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

async function handleSozlerPageRequest(command: RisaleCommand): Promise<string> {
	if (!command.sozlerPageId) return createErrorMessage();

	const totalPages = await risaleService.getTotalPageCount();
	if (command.sozlerPageId > totalPages || command.sozlerPageId < 1) {
		return `❌ Sözler Kitabı sayfa ${command.sozlerPageId} bulunamadı. Lütfen 1-${totalPages} arası bir sayı girin.`;
	}

	const page = await risaleService.getSozlerPage(
		command.sozlerPageId,
		command.showMeaning || 'open'
	);

	if (!page) {
		return `❌ Sözler Kitabı sayfa ${command.sozlerPageId} bulunamadı.`;
	}

	return await createPageMessage(page, command);
}

async function createPageMessage(page: RisalePage, command: RisaleCommand): Promise<string> {
	const parts = [];

	// Header - show different format for Sözler Kitabı page vs soz page
	const meaningType = command.showMeaning === 'closed' ? ' (Anlam Kapalı)' : '';

	if (command.type === 'sozlerPage') {
		parts.push(`🌐 *Sözler Kitabı ${page.sozlerId}. Sayfa - ${page.sozNo}. Söz ${page.pageIndex}. Sayfa${meaningType}*`);
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

	// Anlam kapalı modda sayfa sözlüğünü EN ALTA ekle
	if (command.showMeaning === 'closed' && page.dictionary?.length) {
		parts.push('');
		parts.push('📚 *Bu Sayfadaki Kelimeler:*');
		page.dictionary.forEach(entry => {
			parts.push(`• *${entry.word}:* ${entry.meaning}`);
		});
	}

	const nextPageInfo = await risaleService.getNextPageInfo(page);
	if (nextPageInfo) {
		parts.push('');
		parts.push(`➡️ *Sonraki sayfa:*`);
		parts.push(`• \`${nextPageInfo.command}\` _(${nextPageInfo.description})_`);
		if (nextPageInfo.sozlerCommand) {
			parts.push(`• \`${nextPageInfo.sozlerCommand}\` _(Sözler Kitabı sonraki sayfa)_`);
		}
	}

	parts.push('');
	parts.push('🔗 *Kaynak:* ' + page.url);

	return parts.join('\n');
}

function createHelpMessage(): string {
	return [
		'📖 *RİSALE-İ NUR - SÖZLER | REHBER*',
		'',
		'🔍 *Örnek komutlar:*',
		'',
		'📚 *Bir Söz’ü sayfa sayfa okumak için:*',
		'• `/risalesozler 9` → 9. Söz\'ün *1. sayfasını* açar (*anlamlar açık - varsayılan*)',
		'• `/risalesozler 9 sayfa 3` → 9. Söz\'ün *3. sayfasını* açar (*anlamlar açık*)',
		'• `/risalesozler 9 kapali` → 9. Söz\'ün *1. sayfasını* açar, *anlamları gizler*',
		'• *_"risale sözler 9"_* → Doğal dil ile de aynı işlev sağlanır',
		'',
		'🌍 *Sözler Kitabı\'nın genel sayfa sistemini kullanmak için:*',
		'• `/risalesozlersayfa 421` → *Sözler Kitabı\'ndan 421. sayfayı* açar (*anlamlar açık - varsayılan*)',
		'• `/risalesozlersayfa 421 kapali` → *Sözler Kitabı\'ndan 421. sayfayı* açar, *anlamları gizler*',
		'• *_"risale sözler sayfa 421"_* → Doğal dil ile de aynı işlev sağlanır',
		'',
		'ℹ️ *Genel:*',
		'• `/risale` → Yardım menüsünü gösterir',
		'• `/risalekelimeler` → Sözler Kitabı’ndan rastgele 15 kelime ve anlamını getirir',
		'• `/risaleicindekiler` → Tüm Sözler listesini gösterir',
		'• *_"risale içindekiler"_* veya *_"risale liste"_* → Doğal dil ile de aynı işlev sağlanır',
		'',
		'✨ *Toplam 33 Söz mevcut (1-33)*',
		'💡 Her Söz\'ün *kendi sayfa numaraları* vardır; ayrıca *Sözler Kitabı\'nın genel sayfa sistemi* de bulunur.',
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