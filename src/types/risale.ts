export interface RisalePage {
	sozlerId: number;
	pageIndex: number;
	sozNo: number;
	url: string;
	text_open: string;
	text_closed: string;
	footnotes: Array<{
		n: string;
		text: string;
	}>;
	dictionary?: Array<{
		word: string;
		meaning: string;
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

export interface RisaleInterlude {
	title: string;
	slug: string;
	type: "interlude";
	range: {
		startId: number;
		endId: number;
		count: number;
	};
	pages: Array<{
		globalId: number;
		pageIndex: number;
		url: string;
		text_open: string;
		text_closed: string;
		footnotes: Array<{
			n: string;
			text: string;
		}>;
		dictionary?: Array<{
			word: string;
			meaning: string;
		}>;
	}>;
}

export interface RisaleCommand {
	type: 'help' | 'soz' | 'sozlerPage' | 'toc' | 'kelime' | 'interlude';
	sozNo?: number;
	pageNo?: number;
	sozlerPageId?: number;
	slug?: string; // for interludes
	showMeaning?: MeaningDisplayMode;
}

export interface PageMapEntry {
	sozNo?: number;
	type?: 'interlude';
	title?: string;
	afterSoz?: number;
	beforeSoz?: number | null;
	slug: string;
	pageIndex: number;
	url: string;
}

export interface SubHeading {
	title: string;
	pageIndex: number;
	subheadings?: SubHeading[];
}

export interface TocEntry {
	sozNo?: number;
	title: string;
	slug: string;
	type?: "soz" | "interlude";
	range: {
		startId: number;
		endId: number;
		count: number;
	};
	subheadings?: SubHeading[];
	beforeSoz?: number; // for interludes
	afterSoz?: number; // for interludes
}

export type MeaningDisplayMode = 'open' | 'closed';
