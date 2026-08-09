import ClientService from '../../services/client.service.js';
class DocumentsService {
  async load(){
    const project=sessionStorage.getItem('operation_global_project')||'ALL';
    const rows=await ClientService.getDocuments({project});
    return (Array.isArray(rows)?rows:[]).map(x=>({
      ...x,
      documentType:x.documentType||x.document_type||(x.kind==='floor_plan'?'Architectural Drawing':x.kind==='contract'?'Contract':'Document'),
      fileName:x.fileName||x.file_name||'',
      clientName:x.clientName||x.client_name||'',
      unitCode:x.unitCode||x.unit_code||'',
      createdAt:x.createdAt||x.created_at||'',
      mimeType:x.mimeType||x.mime_type||'application/pdf'
    }));
  }
}
export default new DocumentsService();
