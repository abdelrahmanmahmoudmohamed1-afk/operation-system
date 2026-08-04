import Module from "../../core/module.js";
import { renderPlaceholder } from "./salesoperations.view.js";

class SalesOperationsController extends Module {
    async render() {
        this.container.innerHTML = renderPlaceholder();
    }
}

export default new SalesOperationsController();
