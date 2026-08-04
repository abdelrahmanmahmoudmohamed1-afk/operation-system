/** Client PDF contract scans stored in Google Drive. */
function getDocumentsSheet_() {
  const ss=SpreadsheetApp.openById(SPREADSHEETS.DATA);
  let sh=ss.getSheetByName(SHEET_NAMES.clientDocuments);
  if(!sh){ sh=ss.insertSheet(SHEET_NAMES.clientDocuments); sh.appendRow(['Timestamp','Project','Unit Code','Client Name','Document Type','File Name','File ID','File URL','Uploaded By','Username']); sh.setFrozenRows(1); }
  return sh;
}
function getContractsFolder_(){
  const props=PropertiesService.getScriptProperties(); const id=props.getProperty('CONTRACTS_FOLDER_ID');
  if(id){ try{return DriveApp.getFolderById(id);}catch(e){} }
  const folders=DriveApp.getFoldersByName('Operation System Contracts'); const folder=folders.hasNext()?folders.next():DriveApp.createFolder('Operation System Contracts');
  props.setProperty('CONTRACTS_FOLDER_ID',folder.getId()); return folder;
}
function uploadClientContract(token,data){
  const session=requireAuth_(token); data=data||{};
  if(!data.base64 || !data.fileName || !data.unitCode) throw new Error('PDF file and unit code are required.');
  if(String(data.mimeType||'').toLowerCase()!=='application/pdf') throw new Error('Only PDF files are allowed.');
  const bytes=Utilities.base64Decode(String(data.base64).replace(/^data:application\/pdf;base64,/,''));
  if(bytes.length>8*1024*1024) throw new Error('Maximum PDF size is 8 MB.');
  const safeName=[clean_(data.project),clean_(data.unitCode),Date.now(),clean_(data.fileName)].filter(Boolean).join('-').replace(/[\\/:*?"<>|]+/g,'_');
  const file=getContractsFolder_().createFile(Utilities.newBlob(bytes,'application/pdf',safeName));
  getDocumentsSheet_().appendRow([new Date(),clean_(data.project),clean_(data.unitCode),clean_(data.clientName),clean_(data.documentType||'Contract'),safeName,file.getId(),file.getUrl(),session.name,session.user]);
  return {success:true,fileName:safeName,fileUrl:file.getUrl(),fileId:file.getId()};
}
function getClientDocuments(token,filters){
  requireAuth_(token); filters=filters||{}; const sh=getDocumentsSheet_(); if(sh.getLastRow()<2)return [];
  return sh.getRange(2,1,sh.getLastRow()-1,10).getValues().map(function(r){return {timestamp:r[0] instanceof Date?r[0].toISOString():String(r[0]||''),project:clean_(r[1]),unitCode:clean_(r[2]),clientName:clean_(r[3]),documentType:clean_(r[4]),fileName:clean_(r[5]),fileId:clean_(r[6]),fileUrl:clean_(r[7]),uploadedBy:clean_(r[8]),username:clean_(r[9])};}).filter(function(x){ if(filters.unitCode&&norm_(x.unitCode)!==norm_(filters.unitCode))return false; if(filters.project&&norm_(x.project)!==norm_(filters.project))return false; return true; }).reverse();
}
