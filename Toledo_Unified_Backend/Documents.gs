/** Client contract/document storage in Google Drive. */
function uploadClientContract(token, data) {
  const session = requireAuth_(token);
  data = data || {};
  const unitCode = clean_(data.unitCode);
  const project = clean_(data.project);
  const clientName = clean_(data.clientName);
  const fileName = clean_(data.fileName) || 'contract.pdf';
  const mimeType = clean_(data.mimeType) || 'application/pdf';
  const base64 = clean_(data.base64);
  const documentType = clean_(data.documentType) || 'Contract';

  if (!unitCode || !clientName || !base64) throw new Error('Missing client or PDF data.');
  if (mimeType !== 'application/pdf' && !/\.pdf$/i.test(fileName)) throw new Error('Only PDF files are allowed.');

  let bytes;
  try { bytes = Utilities.base64Decode(base64); }
  catch (err) { throw new Error('Invalid PDF data.'); }
  if (bytes.length > 8 * 1024 * 1024) throw new Error('The PDF must be 8 MB or smaller.');

  const props = PropertiesService.getScriptProperties();
  let folderId = props.getProperty('CONTRACTS_FOLDER_ID');
  let folder;
  try { folder = folderId ? DriveApp.getFolderById(folderId) : null; } catch (_) { folder = null; }
  if (!folder) {
    folder = DriveApp.createFolder('Operation System Contracts');
    props.setProperty('CONTRACTS_FOLDER_ID', folder.getId());
  }

  const safeName = [project, unitCode, clientName, documentType]
    .filter(Boolean).join(' - ').replace(/[\\/:*?"<>|]+/g, '-');
  const blob = Utilities.newBlob(bytes, 'application/pdf', safeName + '.pdf');
  const file = folder.createFile(blob);

  const ss = SpreadsheetApp.openById(SPREADSHEETS.DATA);
  let sh = ss.getSheetByName('Client Documents');
  if (!sh) {
    sh = ss.insertSheet('Client Documents');
    sh.appendRow(['Uploaded At','Uploaded By','Username','Role','Project','Unit Code','Client Name','Document Type','File Name','Drive File ID','Drive URL']);
    sh.setFrozenRows(1);
  }
  sh.appendRow([
    new Date(), session.name || '', session.username || session.user || '', session.role || '',
    project, unitCode, clientName, documentType, file.getName(), file.getId(), file.getUrl()
  ]);

  return { success: true, message: 'PDF uploaded successfully.', fileId: file.getId(), url: file.getUrl() };
}

function getClientDocuments(token, filters) {
  const session = requireAuth_(token);
  filters = filters || {};
  const ss = SpreadsheetApp.openById(SPREADSHEETS.DATA);
  const sh = ss.getSheetByName('Client Documents');
  if (!sh || sh.getLastRow() < 2) return [];
  const values = sh.getDataRange().getValues();
  const headers = values[0].map(normalizeHeader_);
  const idx = function(name) { return headers.indexOf(normalizeHeader_(name)); };
  return values.slice(1).map(function(r) {
    return {
      uploadedAt: formatDateTime_(r[idx('Uploaded At')]),
      uploadedBy: clean_(r[idx('Uploaded By')]),
      project: clean_(r[idx('Project')]),
      unitCode: clean_(r[idx('Unit Code')]),
      clientName: clean_(r[idx('Client Name')]),
      documentType: clean_(r[idx('Document Type')]),
      fileName: clean_(r[idx('File Name')]),
      url: clean_(r[idx('Drive URL')])
    };
  }).filter(function(x) {
    if (filters.unitCode && norm_(x.unitCode) !== norm_(filters.unitCode)) return false;
    if (filters.project && norm_(x.project) !== norm_(filters.project)) return false;
    return true;
  });
}
