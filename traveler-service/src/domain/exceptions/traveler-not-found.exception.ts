import { DomainException } from '@travel/shared';

export class TravelerNotFoundException extends DomainException {
  constructor(travelerId: string) {
    super(
      `Traveler ${travelerId} not found`,
      'TravelerNotFound',
      404,
      { travelerId },
    );
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
