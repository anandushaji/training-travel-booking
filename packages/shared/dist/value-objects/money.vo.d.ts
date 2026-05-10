import { ValueObject } from '../base-classes/value-object.base';
import { Currency } from './currency.enum';
interface MoneyProps {
    amount: number;
    currency: Currency;
}
export declare class Money extends ValueObject<MoneyProps> {
    private static readonly VALID_CURRENCIES;
    constructor(amount: number, currency: Currency);
    get amount(): number;
    get currency(): Currency;
    add(other: Money): Money;
    subtract(other: Money): Money;
    multiply(factor: number): Money;
    greaterThan(other: Money): boolean;
    private assertSameCurrency;
}
export {};
//# sourceMappingURL=money.vo.d.ts.map