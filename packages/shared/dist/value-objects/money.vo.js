"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Money = void 0;
const value_object_base_1 = require("../base-classes/value-object.base");
const currency_enum_1 = require("./currency.enum");
const validation_exception_1 = require("../exceptions/validation.exception");
const insufficient_funds_exception_1 = require("../exceptions/insufficient-funds.exception");
const currency_mismatch_exception_1 = require("../exceptions/currency-mismatch.exception");
class Money extends value_object_base_1.ValueObject {
    constructor(amount, currency) {
        if (!Money.VALID_CURRENCIES.has(currency)) {
            throw new validation_exception_1.ValidationException(`Invalid currency: "${currency}"`, 'INVALID_CURRENCY', { currency });
        }
        if (!isFinite(amount) || amount < 0) {
            throw new validation_exception_1.ValidationException(`Invalid money amount: ${amount}`, 'INVALID_MONEY_AMOUNT', { amount });
        }
        super({ amount, currency });
    }
    get amount() {
        return this.props.amount;
    }
    get currency() {
        return this.props.currency;
    }
    add(other) {
        this.assertSameCurrency(other);
        return new Money(this.amount + other.amount, this.currency);
    }
    subtract(other) {
        this.assertSameCurrency(other);
        if (other.amount > this.amount) {
            throw new insufficient_funds_exception_1.InsufficientFundsException({ amount: this.amount, currency: this.currency }, { amount: other.amount, currency: other.currency });
        }
        return new Money(this.amount - other.amount, this.currency);
    }
    multiply(factor) {
        const result = Math.round(this.amount * factor * 100) / 100;
        return new Money(result, this.currency);
    }
    greaterThan(other) {
        this.assertSameCurrency(other);
        return this.amount > other.amount;
    }
    assertSameCurrency(other) {
        if (this.currency !== other.currency) {
            throw new currency_mismatch_exception_1.CurrencyMismatchException(this.currency, other.currency);
        }
    }
}
exports.Money = Money;
Money.VALID_CURRENCIES = new Set(Object.values(currency_enum_1.Currency));
//# sourceMappingURL=money.vo.js.map