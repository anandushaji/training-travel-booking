import { AggregateRoot, TravelerId } from '@travel/shared';
import { Email } from '../value-objects/email.value-object';
import { EmployeeId } from '../value-objects/employee-id.value-object';
import { TravelerPreferences } from '../value-objects/traveler-preferences.value-object';
import { TravelerCreatedEvent } from '../events/traveler-created.event';
import { TravelerUpdatedEvent } from '../events/traveler-updated.event';
import { TravelerDeletedEvent } from '../events/traveler-deleted.event';

export type TravelerRole = 'EMPLOYEE' | 'MANAGER' | 'ADMIN';

export interface TravelerProps {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  department: string;
  role: TravelerRole;
  preferences: TravelerPreferences;
  deletedAt: Date | null;
  anonymisedAt: Date | null;
  dbVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTravelerProps {
  employeeId: string;
  name: string;
  email: string;
  department: string;
  role: TravelerRole;
  correlationId?: string;
  causationId?: string;
}

export interface UpdateTravelerProps {
  name?: string;
  department?: string;
  role?: TravelerRole;
  correlationId?: string;
  causationId?: string;
}

export class Traveler extends AggregateRoot<TravelerProps> {
  /**
   * Factory method — validates invariants, creates aggregate, emits TravelerCreated.
   */
  static create(props: CreateTravelerProps): Traveler {
    // Validate value objects (throws on invalid)
    new Email(props.email);
    new EmployeeId(props.employeeId);

    const id = TravelerId.generate().value;
    const now = new Date();

    const travelerProps: TravelerProps = {
      id,
      employeeId: props.employeeId,
      name: props.name,
      email: props.email,
      department: props.department,
      role: props.role,
      preferences: TravelerPreferences.default(),
      deletedAt: null,
      anonymisedAt: null,
      dbVersion: 0,
      createdAt: now,
      updatedAt: now,
    };

    const traveler = new Traveler(travelerProps);
    traveler.apply(
      new TravelerCreatedEvent({
        aggregateId: id,
        ...(props.correlationId !== undefined && { correlationId: props.correlationId }),
        ...(props.causationId !== undefined && { causationId: props.causationId }),
        data: {
          travelerId: id,
          employeeId: props.employeeId,
          name: props.name,
          email: props.email,
          department: props.department,
          role: props.role,
        },
      }),
    );
    return traveler;
  }

  get employeeId(): string {
    return this.props.employeeId;
  }
  get name(): string {
    return this.props.name;
  }
  get email(): string {
    return this.props.email;
  }
  get department(): string {
    return this.props.department;
  }
  get role(): TravelerRole {
    return this.props.role;
  }
  get preferences(): TravelerPreferences {
    return this.props.preferences;
  }
  get deletedAt(): Date | null {
    return this.props.deletedAt;
  }
  get anonymisedAt(): Date | null {
    return this.props.anonymisedAt;
  }
  get dbVersion(): number {
    return this.props.dbVersion;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  update(updateProps: UpdateTravelerProps): void {
    const changedFields: string[] = [];

    if (updateProps.name !== undefined && updateProps.name !== this.props.name) {
      this.props.name = updateProps.name;
      changedFields.push('name');
    }
    if (
      updateProps.department !== undefined &&
      updateProps.department !== this.props.department
    ) {
      this.props.department = updateProps.department;
      changedFields.push('department');
    }
    if (updateProps.role !== undefined && updateProps.role !== this.props.role) {
      this.props.role = updateProps.role;
      changedFields.push('role');
    }

    if (changedFields.length > 0) {
      this.props.updatedAt = new Date();
      this.apply(
        new TravelerUpdatedEvent({
          aggregateId: this.id,
          ...(updateProps.correlationId !== undefined && { correlationId: updateProps.correlationId }),
          ...(updateProps.causationId !== undefined && { causationId: updateProps.causationId }),
          data: {
            travelerId: this.id,
            changedFields,
            snapshot: {
              name: this.props.name,
              email: this.props.email,
              department: this.props.department,
              role: this.props.role,
            },
          },
        }),
      );
    }
  }

  softDelete(correlationId?: string, causationId?: string): void {
    const now = new Date();
    this.props.deletedAt = now;
    this.props.updatedAt = now;
    this.apply(
      new TravelerDeletedEvent({
        aggregateId: this.id,
        ...(correlationId !== undefined && { correlationId }),
        ...(causationId !== undefined && { causationId }),
        data: {
          travelerId: this.id,
          deletedAt: now.toISOString(),
        },
      }),
    );
  }

  anonymisePii(): void {
    const now = new Date();
    this.props.name = `DELETED_USER_${this.id}`;
    this.props.email = `deleted-${this.id}@anonymised.invalid`;
    this.props.anonymisedAt = now;
    this.props.updatedAt = now;
  }

  updatePreferences(
    newPreferences: TravelerPreferences,
    correlationId?: string,
    causationId?: string,
  ): void {
    this.props.preferences = newPreferences;
    this.props.updatedAt = new Date();
    this.apply(
      new TravelerUpdatedEvent({
        aggregateId: this.id,
        ...(correlationId !== undefined && { correlationId }),
        ...(causationId !== undefined && { causationId }),
        data: {
          travelerId: this.id,
          changedFields: ['preferences'],
          snapshot: {
            name: this.props.name,
            email: this.props.email,
            department: this.props.department,
            role: this.props.role,
          },
        },
      }),
    );
  }
}
