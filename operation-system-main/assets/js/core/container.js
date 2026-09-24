class ServiceContainer {
    constructor() {
        this.items = new Map();
    }

    register(name, value) {
        if (!name) throw new Error("Container.register requires a name");
        this.items.set(name, value);
        return this;
    }

    set(name, value) {
        return this.register(name, value);
    }

    has(name) {
        return this.items.has(name);
    }

    get(name) {
        if (!this.items.has(name)) {
            throw new Error(`Service not registered: ${name}`);
        }
        const value = this.items.get(name);
        return typeof value === "function" && value.__factory === true ? value(this) : value;
    }

    remove(name) {
        this.items.delete(name);
        return this;
    }

    clear() {
        this.items.clear();
    }
}

const Container = new ServiceContainer();
export { Container };
export default Container;
