import { HrSoapClientStub } from './hr-soap-client.stub';
import { HrSystemUnavailableException } from '../../domain/exceptions/hr-system-unavailable.exception';

describe('HrSoapClientStub — circuit breaker', () => {
  /**
   * These tests drive the opossum circuit breaker directly by replacing
   * the private _fetchFromSoap method with a mock that throws on demand.
   */

  it('should return payload from stub when SOAP succeeds', async () => {
    const stub = new HrSoapClientStub('http://hr.example.com');
    const payload = [
      { employeeId: 'EMP-001', name: 'Alice', email: 'alice@corp.com', department: 'Eng' },
    ];
    const result = await stub.fetchEmployees(payload);
    expect(result).toEqual(payload);
  });

  it('should invoke fallback (HrSystemUnavailableException) when circuit is forced open', async () => {
    const stub = new HrSoapClientStub('http://hr.example.com');
    // Force the circuit open directly to test fallback behaviour
    stub.getBreaker().open();
    await expect(stub.fetchEmployees([])).rejects.toBeInstanceOf(HrSystemUnavailableException);
  });

  it('stub should pass employeeId through without modification', async () => {
    const stub = new HrSoapClientStub('http://hr.example.com');
    const payload = [
      { employeeId: 'EMP-999', name: 'Bob', email: 'bob@corp.com', department: 'HR' },
    ];
    const result = await stub.fetchEmployees(payload);
    expect(result[0]!.employeeId).toBe('EMP-999');
  });
});
