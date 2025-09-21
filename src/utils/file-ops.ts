import { mkdir, readFile, rename, writeFile } from "node:fs/promises";

export async function readJsonSafe<T>(path: string, fallback: T): Promise<T> {
	try {
		const raw = await readFile(path, 'utf-8');
		return JSON.parse(raw) as T;
	} catch {
		return fallback;
	}
}

export async function atomicWrite(path: string, data: unknown): Promise<void> {
	const tmp = path + '.tmp';
	await writeFile(tmp, JSON.stringify(data, null, 2), 'utf-8');
	await rename(tmp, path);
}

export async function ensureDir(path: string): Promise<void> {
	await mkdir(path, { recursive: true });
}
