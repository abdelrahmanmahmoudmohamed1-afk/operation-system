/** PDF upload helpers — v5.8 */
function normalizePdfBase64_(value) {
  let b64 = String(value || '').trim();
  b64 = b64.replace(/^data:application\/pdf;base64,/i, '').replace(/\s+/g, '');
  if (!b64) throw new Error('PDF data is empty.');
  if (b64.indexOf('JVBER') !== 0) throw new Error('The selected file is not a valid PDF.');
  return b64;
}
function decodePdfBase64_(value) {
  const b64 = normalizePdfBase64_(value);
  try { return Utilities.base64Decode(b64); }
  catch (e1) {
    try { return Utilities.base64DecodeWebSafe(b64); }
    catch (e2) { throw new Error('Invalid PDF data. Please select the PDF again.'); }
  }
}
function getOrCreateDriveFolder_(propertyName, folderName) {
  const props = PropertiesService.getScriptProperties();
  const folderId = props.getProperty(propertyName);
  let folder = null;
  if (folderId) { try { folder = DriveApp.getFolderById(folderId); } catch (_) { folder = null; } }
  if (!folder) {
    folder = DriveApp.createFolder(folderName);
    props.setProperty(propertyName, folder.getId());
  }
  return folder;
}
function safePdfName_(parts) {
  return (parts || []).filter(Boolean).join(' - ').replace(/[\\/:*?"<>|]+/g, '-').trim() || 'document';
}

/** Client contract/document storage in Google Drive. */
function uploadClientContract(token, data) {
  const session = requireAuth_(token);
  data = data || {};
  const unitCode = clean_(data.unitCode);
  const project = clean_(data.project);
  const clientName = clean_(data.clientName);
  const fileName = clean_(data.fileName) || 'contract.pdf';
  const mimeType = clean_(data.mimeType) || 'application/pdf';
  const base64 = normalizePdfBase64_(data.base64);
  const documentType = clean_(data.documentType) || 'Contract';

  if (!unitCode || !clientName || !base64) throw new Error('Missing client or PDF data.');
  if (mimeType !== 'application/pdf' && !/\.pdf$/i.test(fileName)) throw new Error('Only PDF files are allowed.');

  const bytes = decodePdfBase64_(base64);
  if (bytes.length > 8 * 1024 * 1024) throw new Error('The PDF must be 8 MB or smaller.');

  const folder = getOrCreateDriveFolder_('CONTRACTS_FOLDER_ID', 'Operation System Contracts');

  const safeName = safePdfName_([project, unitCode, clientName, documentType]);
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


const FLOOR_PLAN_SHEET_ = 'Unit Floor Plans';
function getOrCreateFloorPlanSheet_(){
  const ss=SpreadsheetApp.openById(SPREADSHEETS.DATA); let sh=ss.getSheetByName(FLOOR_PLAN_SHEET_);
  if(!sh){sh=ss.insertSheet(FLOOR_PLAN_SHEET_);sh.appendRow(['Uploaded At','Uploaded By','Username','Project','Unit Code','File Name','Drive File ID','Drive URL']);sh.setFrozenRows(1);} return sh;
}
function uploadUnitFloorPlan(token, data) {
  const session = requireAuth_(token);
  data = data || {};
  const project = clean_(data.project);
  const unitCode = clean_(data.unitCode);
  const fileName = clean_(data.fileName) || 'floor-plan.pdf';
  const mimeType = clean_(data.mimeType) || 'application/pdf';
  if (!project || !unitCode || !data.base64) throw new Error('Project, unit code and PDF are required.');
  if (mimeType !== 'application/pdf' && !/\.pdf$/i.test(fileName)) throw new Error('Only PDF files are allowed.');
  const bytes = decodePdfBase64_(data.base64);
  if (bytes.length > 10 * 1024 * 1024) throw new Error('Drawing PDF must be 10 MB or smaller.');

  const folder = getOrCreateDriveFolder_('FLOOR_PLANS_FOLDER_ID', 'Operation System - Architectural Drawings');
  const safe = safePdfName_([project, unitCode, 'Architectural Drawing']);
  const file = folder.createFile(Utilities.newBlob(bytes, 'application/pdf', safe + '.pdf'));
  const sh = getOrCreateFloorPlanSheet_();
  sh.appendRow([new Date(), session.name || '', session.username || session.user || '', project, unitCode, fileName, file.getId(), file.getUrl()]);
  return {
    success: true, message: 'Architectural drawing uploaded.', project: project, unitCode: unitCode,
    fileName: fileName, url: 'https://drive.google.com/file/d/' + file.getId() + '/preview',
    openUrl: file.getUrl(), fileId: file.getId(), uploadedAt: formatDateTime_(new Date())
  };
}
function readFloorPlans_(){const sh=getOrCreateFloorPlanSheet_();if(sh.getLastRow()<2)return[];const v=sh.getDataRange().getValues(),h=v[0].map(normalizeHeader_),idx=n=>h.indexOf(normalizeHeader_(n));return v.slice(1).map(r=>({uploadedAt:formatDateTime_(r[idx('Uploaded At')]),uploadedBy:clean_(r[idx('Uploaded By')]),project:clean_(r[idx('Project')]),unitCode:clean_(r[idx('Unit Code')]),fileName:clean_(r[idx('File Name')]),fileId:clean_(r[idx('Drive File ID')]),url:(clean_(r[idx('Drive File ID')])?'https://drive.google.com/file/d/'+clean_(r[idx('Drive File ID')])+'/preview':clean_(r[idx('Drive URL')])),openUrl:clean_(r[idx('Drive URL')])}));}
function getUnitFloorPlan(token,filters){requireAuth_(token);filters=filters||{};const matches=readFloorPlans_().filter(x=>norm_(x.project)===norm_(filters.project)&&norm_(x.unitCode)===norm_(filters.unitCode));return matches.length?matches[matches.length-1]:null;}
function getUnitFloorPlanCoverage(token,filters){const session=requireAuth_(token);filters=filters||{};let units=readInventory_().filter(x=>roleAllowed_(x,session));if(filters.project&&norm_(filters.project)!=='all')units=units.filter(x=>norm_(x.project)===norm_(filters.project));const keys=new Set(readFloorPlans_().map(x=>norm_(x.project)+'||'+norm_(x.unitCode)));const withPlan=units.filter(x=>keys.has(norm_(x.project)+'||'+norm_(x.unitCode))).length;return{totalUnits:units.length,withPlan:withPlan,withoutPlan:Math.max(0,units.length-withPlan),coverage:units.length?withPlan/units.length*100:0};}
function getDocumentCoverage(token,filters){const session=requireAuth_(token);filters=filters||{};let units=readInventory_().filter(x=>roleAllowed_(x,session));if(filters.project&&norm_(filters.project)!=='all')units=units.filter(x=>norm_(x.project)===norm_(filters.project));const required=units.filter(x=>['sold','contracted'].indexOf(lower_(x.status))!==-1);const docs=getClientDocuments(token,filters);const contractKeys=new Set(docs.filter(d=>/contract/i.test(d.documentType||'')).map(d=>norm_(d.project)+'||'+norm_(d.unitCode)));const withScan=required.filter(x=>contractKeys.has(norm_(x.project)+'||'+norm_(x.unitCode))).length;return{soldOrContracted:required.length,withContractScan:withScan,missingContractScan:Math.max(0,required.length-withScan),contractCoverage:required.length?withScan/required.length*100:0,totalDocuments:docs.length};}
