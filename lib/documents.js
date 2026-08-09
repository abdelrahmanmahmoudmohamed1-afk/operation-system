import { admin } from './supabase.js';

export async function signDocumentRows(rows=[]) {
  return Promise.all((rows || []).map(async row => {
    if (!row?.storage_path) return row;
    const { data } = await admin.storage.from(row.bucket || 'operation-documents').createSignedUrl(row.storage_path, 3600);
    return { ...row, url: data?.signedUrl || '' };
  }));
}

export async function registerDocument(data, user, kind) {
  const payload = {
    kind,
    project: data.project || data.Project || '',
    unit_code: data.unitCode || data['Unit Code'] || '',
    client_name: data.clientName || data['Client Name English'] || data['Client Name Arabic'] || '',
    document_type: data.documentType || (kind === 'floor_plan' ? 'Architectural Drawing' : 'Contract'),
    file_name: data.fileName || '',
    mime_type: 'application/pdf',
    bucket: data.bucket || 'operation-documents',
    storage_path: data.storagePath || data.path || '',
    file_size: Number(data.fileSize || data.size || 0),
    uploaded_by: user.id,
    metadata: data.metadata || {}
  };
  if (!payload.storage_path) throw new Error('storagePath is required after direct PDF upload.');
  const { data: row, error } = await admin.from('documents').insert(payload).select('*').single();
  if (error) throw error;
  return (await signDocumentRows([row]))[0];
}
