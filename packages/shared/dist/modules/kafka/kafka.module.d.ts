import { DynamicModule, OnModuleDestroy } from '@nestjs/common';
export interface KafkaModuleOptions {
    clientId: string;
    brokers: string[];
    groupId: string;
}
export declare class KafkaModule implements OnModuleDestroy {
    private static producer;
    private static consumer;
    private static readonly logger;
    static register(options: KafkaModuleOptions): DynamicModule;
    onModuleDestroy(): Promise<void>;
}
//# sourceMappingURL=kafka.module.d.ts.map