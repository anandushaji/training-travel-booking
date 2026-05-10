import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(() => {
    controller = new HealthController();
  });

  it('should return 200 with status ok', () => {
    const result = controller.getHealth();
    expect(result).toEqual({ status: 'ok' });
  });
});
