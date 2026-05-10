import { AmadeusUnavailableException } from './amadeus-unavailable.exception';

describe('AmadeusUnavailableException', () => {
  it('should have code AmadeusUnavailable and statusCode 503', () => {
    const ex = new AmadeusUnavailableException();
    expect(ex.code).toBe('AmadeusUnavailable');
    expect(ex.statusCode).toBe(503);
    expect(ex).toBeInstanceOf(Error);
  });
});
