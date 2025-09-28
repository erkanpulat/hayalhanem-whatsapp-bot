export interface RisalePage {
	globalId: number;
	pageIndex: number;
	sozNo: number;
	url: string;
	text_open: string;
	text_closed: string;
	footnotes: Array<{
		n: string;
		text: string;
	}>;
}

export interface RisaleSoz {
	sozNo: number;
	title: string;
	slug: string;
	range: {
		startId: number;
		endId: number;
		count: number;
	};
	pages: RisalePage[];
}

export interface RisaleCommand {
	type: 'help' | 'soz' | 'globalPage';
	sozNo?: number;
	pageNo?: number;
	globalPageId?: number;
	showMeaning?: 'open' | 'closed';
}

export interface PageMapEntry {
	sozNo: number;
	slug: string;
	pageIndex: number;
	url: string;
}

export interface TocEntry {
	sozNo: number;
	title: string;
	slug: string;
	range: {
		startId: number;
		endId: number;
		count: number;
	};
}