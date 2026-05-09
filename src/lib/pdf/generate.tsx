import 'server-only';

import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { OfferDocument, type OfferDocumentProps } from './offer-template';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function generateOfferPdfBuffer(props: OfferDocumentProps): Promise<Buffer> {
  return await renderToBuffer(<OfferDocument {...props} />);
}

export async function uploadOfferPdf(args: {
  advisorId: string;
  meetingId: string;
  buffer: Buffer;
}): Promise<{ path: string; publicUrl: string | null }> {
  const path = `${args.advisorId}/${args.meetingId}.pdf`;
  const admin = supabaseAdmin();

  const { error } = await admin.storage.from('offers').upload(path, args.buffer, {
    contentType: 'application/pdf',
    upsert: true,
  });
  if (error) throw new Error(`PDF upload failed: ${error.message}`);

  const { data } = admin.storage.from('offers').getPublicUrl(path);
  return { path, publicUrl: data.publicUrl ?? null };
}
