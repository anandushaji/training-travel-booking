export type CabinClassValue = 'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST';

export class CabinClass {
  readonly value: CabinClassValue;

  constructor(value: CabinClassValue) {
    this.value = value;
  }

  static ECONOMY = new CabinClass('ECONOMY');
  static PREMIUM_ECONOMY = new CabinClass('PREMIUM_ECONOMY');
  static BUSINESS = new CabinClass('BUSINESS');
  static FIRST = new CabinClass('FIRST');

  toString(): string {
    return this.value;
  }
}
