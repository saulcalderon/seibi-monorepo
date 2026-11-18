import { describe, expect, it } from 'vitest';

import { InputError } from '../errors';

import { INVOICE_MAX_BYTES, checkInvoiceSize, initialInvoice, invoiceFile, invoicePreview, invoiceKind, invoicePath, invoiceWrite, type InvoiceDraft } from './invoice';

// The invoice photo on a Service, as the PWA stores it (apps/app/src/lib/
// mutations.ts at 6e3b818, uploadInvoice), so an invoice the app uploads
// opens in the PWA and the other way round.

const USER = '7c13bb3f-4d8e-400e-a507-98039eb7e753';
const SERVICE = 'f328ac9a-4e21-4497-bf5f-715e876879ee';
const NOW = 1763435000123;

describe('where an invoice photo is stored', () => {
  it('goes under the person and the Service, named as the PWA names it', () => {
    expect(invoicePath({ userId: USER, serviceId: SERVICE, photo: { mimeType: 'image/jpeg', fileName: 'IMG_0001.JPG' }, now: NOW })).toBe(
      `${USER}/${SERVICE}/factura-1763435000123.jpg`,
    );
  });
});

describe('what kind of file an invoice photo is uploaded as', () => {
  it('keeps a type the bucket takes, with its extension', () => {
    expect(invoiceFile({ mimeType: 'image/png', fileName: null })).toEqual({ contentType: 'image/png', extension: 'png' });
    expect(invoiceFile({ mimeType: 'image/webp', fileName: 'a.webp' })).toEqual({ contentType: 'image/webp', extension: 'webp' });
    expect(invoiceFile({ mimeType: 'image/heic', fileName: 'IMG_1.HEIC' })).toEqual({ contentType: 'image/heic', extension: 'heic' });
  });

  it('reads the type from the file name when the picker gives none', () => {
    expect(invoiceFile({ mimeType: null, fileName: 'Recibo.PNG' })).toEqual({ contentType: 'image/png', extension: 'png' });
    expect(invoiceFile({ mimeType: null, fileName: 'foto.jpeg' })).toEqual({ contentType: 'image/jpeg', extension: 'jpg' });
  });

  it('is a JPEG otherwise: the picker compresses to JPEG', () => {
    expect(invoiceFile({ mimeType: null, fileName: null })).toEqual({ contentType: 'image/jpeg', extension: 'jpg' });
    expect(invoiceFile({ mimeType: 'image/gif', fileName: 'x.gif' })).toEqual({ contentType: 'image/jpeg', extension: 'jpg' });
  });

  it('names the stored file with that extension', () => {
    expect(invoicePath({ userId: USER, serviceId: SERVICE, photo: { mimeType: 'image/png', fileName: null }, now: NOW })).toBe(
      `${USER}/${SERVICE}/factura-1763435000123.png`,
    );
  });
});

describe('how a saved invoice is shown', () => {
  it('a photo shows in the app', () => {
    expect(invoiceKind(`${USER}/${SERVICE}/factura-1.jpg`)).toBe('image');
    expect(invoiceKind(`${USER}/${SERVICE}/factura-1.heic`)).toBe('image');
  });

  it('a PDF the PWA uploaded opens in the browser', () => {
    expect(invoiceKind(`${USER}/${SERVICE}/factura-1.pdf`)).toBe('pdf');
  });
});

describe('what saving the form does to the invoice', () => {
  const OLD = `${USER}/${SERVICE}/factura-1.jpg`;
  const photo = { uri: 'file:///tmp/a.jpg', mimeType: 'image/jpeg', fileName: 'a.jpg' };
  const added: InvoiceDraft = { kind: 'new', photo };
  const none: InvoiceDraft = { kind: 'none' };

  it('a form opens with the Service\'s invoice, or none', () => {
    expect(initialInvoice(OLD)).toEqual({ kind: 'saved', path: OLD });
    expect(initialInvoice(null)).toEqual(none);
  });

  it('nothing changes when the invoice was left as it was', () => {
    expect(invoiceWrite(null, none)).toBeNull();
    expect(invoiceWrite(OLD, initialInvoice(OLD))).toBeNull();
  });

  it('a new photo is uploaded', () => {
    expect(invoiceWrite(null, added)).toEqual({ upload: photo, remove: null });
  });

  it('replacing uploads the new photo and deletes the old file', () => {
    expect(invoiceWrite(OLD, added)).toEqual({ upload: photo, remove: OLD });
  });

  it('removing clears the Service\'s invoice and deletes its file', () => {
    expect(invoiceWrite(OLD, none)).toEqual({ upload: null, remove: OLD });
  });
});

describe('how big an invoice photo can be', () => {
  it('takes up to the bucket\'s 10 MB', () => {
    expect(INVOICE_MAX_BYTES).toBe(10485760);
    expect(() => checkInvoiceSize(10485760)).not.toThrow();
  });

  it('refuses a bigger one on the invoice field', () => {
    let refused: unknown;
    try {
      checkInvoiceSize(10485761);
    } catch (error) {
      refused = error;
    }
    expect(refused).toBeInstanceOf(InputError);
    expect(refused).toMatchObject({ field: 'invoice', code: 'invoice_too_large' });
  });
});

describe('which picture the form shows for its invoice', () => {
  const SAVED = `${USER}/${SERVICE}/factura-1.jpg`;

  it('a new photo shows from the phone, before it is uploaded', () => {
    expect(invoicePreview({ kind: 'new', photo: { uri: 'file:///tmp/a.jpg', mimeType: null, fileName: null } })).toEqual({
      source: 'local',
      uri: 'file:///tmp/a.jpg',
    });
  });

  it('a saved photo shows through a signed link to its path', () => {
    expect(invoicePreview({ kind: 'saved', path: SAVED })).toEqual({ source: 'signed', path: SAVED });
  });

  it('a saved PDF shows as a document, with no link to sign', () => {
    expect(invoicePreview({ kind: 'saved', path: `${USER}/${SERVICE}/factura-1.pdf` })).toEqual({ source: 'pdf' });
  });

  it('no invoice shows nothing', () => {
    expect(invoicePreview({ kind: 'none' })).toBeNull();
  });
});
