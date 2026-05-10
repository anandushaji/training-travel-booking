import { DomainException } from './domain.exception';
export declare class InsufficientFundsException extends DomainException {
    constructor(available: {
        amount: number;
        currency: string;
    }, attempted: {
        amount: number;
        currency: string;
    });
}
//# sourceMappingURL=insufficient-funds.exception.d.ts.map