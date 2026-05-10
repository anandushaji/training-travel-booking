import { DomainException } from '@travel/shared';

export interface PassengerDetailsProps {
  passengerId: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: Date;
  passportNumber?: string;
}

export class PassengerDetails {
  readonly passengerId: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly dateOfBirth: Date | undefined;
  readonly passportNumber: string | undefined;

  constructor(props: PassengerDetailsProps) {
    if (!props.passengerId.trim()) {
      throw new DomainException('passengerId must not be empty', 'INVALID_PASSENGER_DETAILS', 422);
    }
    if (!props.firstName.trim()) {
      throw new DomainException('firstName must not be empty', 'INVALID_PASSENGER_DETAILS', 422);
    }
    if (!props.lastName.trim()) {
      throw new DomainException('lastName must not be empty', 'INVALID_PASSENGER_DETAILS', 422);
    }
    this.passengerId = props.passengerId.trim();
    this.firstName = props.firstName.trim();
    this.lastName = props.lastName.trim();
    this.dateOfBirth = props.dateOfBirth;
    this.passportNumber = props.passportNumber;
  }
}
