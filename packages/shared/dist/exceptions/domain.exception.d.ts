export declare class DomainException extends Error {
    readonly code: string;
    readonly statusCode: number;
    readonly context: Record<string, unknown> | undefined;
    constructor(message: string, code: string, statusCode: number, context?: Record<string, unknown>);
}
//# sourceMappingURL=domain.exception.d.ts.map