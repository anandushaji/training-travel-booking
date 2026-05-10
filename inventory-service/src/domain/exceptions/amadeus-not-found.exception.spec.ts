import { AmadeusNotFoundException } from './amadeus-not-found.exception';

describe('AmadeusNotFoundException', () => {
  it('should have code AmadeusNotFound and statusCode 404', () => {
    const ex = new AmadeusNotFoundException();
    expect(ex.code).toBe('AmadeusNotFound');
    expect(ex.statusCode).toBe(404);
    expect(ex).toBeInstanceOf(Error);
  });
});
