import SUPABASE_CONFIG from '../../config/supabase.config.js';
import AuthManager from '../managers/auth.manager.js';

function safeSegment(value, fallback='unknown') {
  const s = String(value || fallback).trim().replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  return s || fallback;
}
function fileMagicIsPdf(file) {
  return file.slice(0, 5).arrayBuffer().then(buf => {
    const bytes = new Uint8Array(buf);
    return String.fromCharCode(...bytes) === '%PDF-';
  });
}

class DocumentStorageService {
  async validatePdf(file, maxMB=25) {
    if (!(file instanceof File)) throw new Error('Please select a PDF file.');
    const isPdfName = /\.pdf$/i.test(file.name || '');
    const isPdfType = !file.type || file.type === 'application/pdf';
    if (!isPdfName && !isPdfType) throw new Error('Only PDF files are allowed.');
    if (file.size <= 0) throw new Error('The selected PDF is empty.');
    if (file.size > maxMB * 1024 * 1024) throw new Error(`PDF must be ${maxMB} MB or smaller.`);
    if (!(await fileMagicIsPdf(file))) throw new Error('The selected file is not a valid PDF.');
  }

  buildPath({kind, project, unitCode, clientName, fileName}) {
    const ext = '.pdf';
    const unique = `${Date.now()}-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`;
    return [safeSegment(kind,'document'), safeSegment(project,'all'), safeSegment(unitCode || clientName,'record'), `${unique}-${safeSegment(fileName || 'document.pdf','document.pdf').replace(/\.pdf$/i,'')}${ext}`].join('/');
  }

  async deleteObject(path) {
    if (!path) return false;
    const token = AuthManager.getToken();
    if (!token) return false;
    const url = `${SUPABASE_CONFIG.url}/storage/v1/object/${encodeURIComponent(SUPABASE_CONFIG.bucket)}/${String(path).split('/').map(encodeURIComponent).join('/')}`;
    try {
      const response = await fetch(url, { method:'DELETE', headers:{ 'Authorization':`Bearer ${token}`, 'apikey':SUPABASE_CONFIG.publishableKey } });
      return response.ok || response.status === 404;
    } catch (_) { return false; }
  }

  async uploadPdf(file, meta={}) {
    await this.validatePdf(file, Number(meta.maxMB || 25));
    const token = AuthManager.getToken();
    if (!token) throw new Error('Your session has expired. Please sign in again.');
    if (!/^https:\/\/.+\.supabase\.co$/i.test(SUPABASE_CONFIG.url)) throw new Error('Supabase URL is not configured.');
    if (!SUPABASE_CONFIG.publishableKey || SUPABASE_CONFIG.publishableKey.includes('YOUR_')) throw new Error('Supabase publishable key is not configured.');
    const path = this.buildPath({...meta, fileName:file.name});
    const url = `${SUPABASE_CONFIG.url}/storage/v1/object/${encodeURIComponent(SUPABASE_CONFIG.bucket)}/${path.split('/').map(encodeURIComponent).join('/')}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': SUPABASE_CONFIG.publishableKey,
        'Content-Type': 'application/pdf',
        'x-upsert': 'false',
        'cache-control': '3600'
      },
      body: file
    });
    const text = await response.text();
    let data = {}; try { data = text ? JSON.parse(text) : {}; } catch (_) { data = {message:text}; }
    if (!response.ok) throw new Error(data?.message || data?.error || `PDF upload failed (${response.status}).`);
    return { path, bucket: SUPABASE_CONFIG.bucket, size:file.size, mimeType:'application/pdf', fileName:file.name };
  }
}
export default new DocumentStorageService();
