import { DomainException } from '@travel/shared';

export class DuplicateEmployeeIdException extends DomainException {
  constructor(employeeId: string) {
    super(
      `Traveler with employeeId "${employeeId}" already exists`,
      'DuplicateEmployeeId',
      409,
      { employeeId },
    );
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
