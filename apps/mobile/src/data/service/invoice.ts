// The invoice or receipt photo on a Service (S12), stored as the PWA stores
// it (apps/app/src/lib/mutations.ts at 6e3b818, uploadInvoice): the private
// `service-invoices` bucket, under `<user id>/<service id>/`, which is what
// its RLS policies check (supabase/migrations/20260927000000_mvp_domain.sql).
// So an invoice the app uploads opens in the PWA and the other way round.
// Plain functions only: the upload itself is in mutations.ts.
import { InputError } from '../errors';

/** The PWA's private bucket for invoices. */
export const INVOICE_BUCKET = 'service-invoices';

/**
 * Whether saving deletes the file a Service stops pointing at (replaced or
 * removed). The PWA left those files behind; the app deletes them. Awaiting
 * Saul's OK (SEI-67): set to false to keep them, as the PWA does.
 */
export const DELETE_UNUSED_INVOICES = true;

/** The bucket's `file_size_limit`: 10 MB. */
export const INVOICE_MAX_BYTES = 10485760;

/** The photo the person took or picked, as `expo-image-picker` describes it. */
export type InvoicePhoto = {
  uri: string;
  mimeType: string | null;
  fileName: string | null;
};

/**
 * The image types the bucket takes (its `allowed_mime_types`, PDF aside: the
 * app only uploads photos), each with the extension its file is named with.
 */
const IMAGE_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic' } as const;
type ImageType = keyof typeof IMAGE_TYPES;

const EXTENSION_TYPES: Record<string, ImageType> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', heic: 'image/heic' };

const isImageType = (value: string | null): value is ImageType => value !== null && value in IMAGE_TYPES;

/**
 * The type a photo is uploaded as and the extension it is named with: the
 * picker's type when the bucket takes it, else the one its file name says,
 * else JPEG, which is what the picker writes when it compresses.
 */
export function invoiceFile(photo: Pick<InvoicePhoto, 'mimeType' | 'fileName'>): { contentType: ImageType; extension: string } {
  const fromName = photo.fileName?.split('.').pop()?.toLowerCase();
  const contentType = isImageType(photo.mimeType)
    ? photo.mimeType
    : photo.mimeType === null && fromName
      ? (EXTENSION_TYPES[fromName] ?? 'image/jpeg')
      : 'image/jpeg';
  return { contentType, extension: IMAGE_TYPES[contentType] };
}

/** Where an invoice photo is stored: `<user id>/<service id>/factura-<ms>.<ext>`, the PWA's name. */
export function invoicePath({
  userId,
  serviceId,
  photo,
  now,
}: {
  userId: string;
  serviceId: string;
  photo: Pick<InvoicePhoto, 'mimeType' | 'fileName'>;
  now: number;
}) {
  return `${userId}/${serviceId}/factura-${now}.${invoiceFile(photo).extension}`;
}

/**
 * How a saved invoice is shown: a photo in the app, a PDF in the system
 * browser. The PWA also took PDFs («Adjuntar foto o PDF»); its paths end in
 * the file's own extension.
 */
export function invoiceKind(path: string): 'image' | 'pdf' {
  return path.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image';
}

/**
 * The invoice in the Service form: the Service's own (`saved`), a photo the
 * person just took or picked (`new`, uploaded on «Guardar»), or none.
 * Removing the saved one in the form only changes the draft: nothing is
 * deleted until the form is saved.
 */
export type InvoiceDraft = { kind: 'none' } | { kind: 'saved'; path: string } | { kind: 'new'; photo: InvoicePhoto };

/** The invoice a form opens with: the Service's, or none. */
export function initialInvoice(path: string | null): InvoiceDraft {
  return path ? { kind: 'saved', path } : { kind: 'none' };
}

/**
 * What saving does to the invoice, or null when it stays as it was. `upload`
 * becomes the Service's invoice; without one, a `remove` clears it. `remove`
 * is the file the Service no longer points at, deleted from the bucket once
 * the Service is saved (the PWA left replaced files behind).
 */
export type InvoiceWrite = { upload: InvoicePhoto | null; remove: string | null };

export function invoiceWrite(saved: string | null, draft: InvoiceDraft): InvoiceWrite | null {
  if (draft.kind === 'new') return { upload: draft.photo, remove: saved };
  if (draft.kind === 'none' && saved) return { upload: null, remove: saved };
  return null;
}

/** Refuses a photo the bucket would refuse for its size (`invoice_too_large`). */
export function checkInvoiceSize(bytes: number) {
  if (bytes > INVOICE_MAX_BYTES) throw new InputError('invoice', 'invoice_too_large');
}

/**
 * Which picture the form shows for its invoice: a new photo from its file on
 * the phone (it isn't uploaded yet), a saved photo through a signed link to
 * its path, a saved PDF as a document icon, and nothing without one.
 */
export type InvoicePreview = { source: 'local'; uri: string } | { source: 'signed'; path: string } | { source: 'pdf' };

export function invoicePreview(draft: InvoiceDraft): InvoicePreview | null {
  if (draft.kind === 'new') return { source: 'local', uri: draft.photo.uri };
  if (draft.kind === 'saved') return invoiceKind(draft.path) === 'pdf' ? { source: 'pdf' } : { source: 'signed', path: draft.path };
  return null;
}
