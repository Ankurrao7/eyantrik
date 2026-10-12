// Uploaded files (GST certificates, factory photos, drawings, quotation PDFs).
// The bytes go to a folder on disk (UPLOAD_DIR, default ./uploads — git-ignored); the details go to
// MongoDB `files`. Files are only ever served through access-checked routes (e.g. /admin/files/[id]).
// Phase 2: switch the folder for cloud storage (S3 / R2) — callers only use saveUpload/readUpload.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { UPLOAD_DIR } from '$app/env/private';
import { mongo } from './mongo.ts';

export interface StoredFile {
	_id: string; // random 32-hex id; also the file name on disk
	name: string; // original name, shown to people
	type: string; // decided by us from the extension — never trusted from the browser
	size: number;
	kind: string; // GST_CERTIFICATE, FACTORY_PHOTO, DRAWING, QUOTE …
	ownerUserId?: string;
	createdAt: string;
}

const files = mongo.collection<StoredFile>('files');
const ID_RE = /^[a-f0-9]{32}$/; // strict: nothing like "../" can ever reach the disk path

const TYPES: Record<string, string> = {
	pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp',
	dxf: 'application/dxf', dwg: 'application/acad', step: 'application/step', stp: 'application/step', igs: 'application/iges', iges: 'application/iges',
	xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', xls: 'application/vnd.ms-excel',
	docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', doc: 'application/msword', zip: 'application/zip'
};
/** Types a browser may show inside the page; everything else is downloaded (no HTML/SVG ever rendered). */
export const VIEWABLE = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/webp']);

function newId(): string {
	return Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Save one uploaded file; returns what to store on the seller / requirement / quote. */
export async function saveUpload(file: File, kind: string, ownerUserId?: string) {
	const id = newId();
	const ext = (file.name.split('.').pop() ?? '').toLowerCase();
	const meta: StoredFile = {
		_id: id,
		name: file.name.slice(0, 200),
		type: TYPES[ext] ?? 'application/octet-stream',
		size: file.size,
		kind,
		ownerUserId,
		createdAt: new Date().toISOString()
	};
	const dir = path.resolve(UPLOAD_DIR);
	await mkdir(dir, { recursive: true });
	await writeFile(path.join(dir, id), Buffer.from(await file.arrayBuffer()));
	await files.insertOne(meta);
	return { fileId: id, fileName: meta.name, sizeKb: Math.max(1, Math.round(file.size / 1024)), type: meta.type };
}

/** Save every file sent in one form field (call only after the form passed validation). */
export async function saveFormFiles(data: FormData, field: string, kind: string, ownerUserId?: string) {
	const picked = data.getAll(field).filter((x): x is File => x instanceof File && x.size > 0);
	return Promise.all(picked.map((f) => saveUpload(f, kind, ownerUserId)));
}

/** File details + bytes, or null if the id is malformed or unknown. Access checks are the caller's job. */
export async function readUpload(id: string): Promise<{ meta: StoredFile; data: Buffer } | null> {
	if (!ID_RE.test(id)) return null;
	const meta = await files.findOne({ _id: id });
	if (!meta) return null;
	try {
		return { meta, data: await readFile(path.join(path.resolve(UPLOAD_DIR), id)) };
	} catch {
		return null; // record exists but the file was removed from disk
	}
}

/** HTTP response for a stored file: shown inline only if it's a PDF/photo; always with safe headers. */
export function fileResponse(f: { meta: StoredFile; data: Buffer }, download = false): Response {
	const inline = !download && VIEWABLE.has(f.meta.type);
	const safeName = f.meta.name.replace(/[^\w.\- ]+/g, '_');
	return new Response(new Uint8Array(f.data), {
		headers: {
			'content-type': f.meta.type,
			'content-length': String(f.data.length),
			'content-disposition': `${inline ? 'inline' : 'attachment'}; filename="${safeName}"`,
			'x-content-type-options': 'nosniff',
			'cache-control': 'private, max-age=300'
		}
	});
}
