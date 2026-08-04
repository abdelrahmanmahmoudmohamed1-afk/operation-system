class Engine {

    constructor() {

        this.modules = new Map();

        this.services = new Map();

        this.started = false;

    }

    registerModule(name, controller) {

        this.modules.set(name, controller);

    }

    getModule(name) {

        return this.modules.get(name);

    }

    registerService(name, service) {

        this.services.set(name, service);

    }

    getService(name) {

        return this.services.get(name);

    }

    async start() {

        this.started = true;

        console.log("Toledo Engine Started");

    }

    stop() {

        this.started = false;

        console.log("Toledo Engine Stopped");

    }

}

export default new Engine();