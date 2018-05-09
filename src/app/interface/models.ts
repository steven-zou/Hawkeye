export interface Container {
    name: string;
    version: string;
    status: string;
    idleTime: number;
}

export interface Runtime {
    id: string;
    container_image: string;
    status: string;
}

