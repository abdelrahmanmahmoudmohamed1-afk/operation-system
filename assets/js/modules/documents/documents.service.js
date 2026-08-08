import ClientService from '../../services/client.service.js';
class DocumentsService { async load(){ const project=sessionStorage.getItem('operation_global_project')||'ALL'; return ClientService.getDocuments({project}); } }
export default new DocumentsService();
