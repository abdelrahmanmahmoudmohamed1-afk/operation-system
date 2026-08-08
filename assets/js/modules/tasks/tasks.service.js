import Container from '../../core/container.js';
class TasksService { store(){return Container.get('enterpriseStore');} all(){return this.store().getTasks();} save(x){return this.store().saveTask(x);} toggle(id){return this.store().toggleTask(id);} remove(id){return this.store().deleteTask(id);} }
export default new TasksService();
