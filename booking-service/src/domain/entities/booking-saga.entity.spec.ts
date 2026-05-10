// @ts-nocheck
import { BookingSaga } from './booking-saga.entity';
import { SagaStatus } from '../value-objects/saga-status.enum';
import { StepStatus } from '../value-objects/step-status.enum';

describe('BookingSaga entity', () => {
  it('create - STARTED with currentStep 0', () => {
    const saga = BookingSaga.create('booking-1');
    expect(saga.status).toBe(SagaStatus.STARTED);
    expect(saga.currentStep).toBe(0);
    expect(saga.bookingId).toBe('booking-1');
  });

  it('addStep - appends PENDING step', () => {
    const saga = BookingSaga.create('booking-1');
    const step = saga.addStep('validate_policy');
    expect(step.status).toBe(StepStatus.PENDING);
    expect(step.stepName).toBe('validate_policy');
    expect(saga.steps).toHaveLength(1);
    expect(saga.status).toBe(SagaStatus.IN_PROGRESS);
  });

  it('markStepCompleted - increments currentStep', () => {
    const saga = BookingSaga.create('booking-1');
    saga.addStep('validate_policy');
    saga.markStepCompleted(1);
    expect(saga.currentStep).toBe(1);
  });

  it('beginCompensation - sets COMPENSATING', () => {
    const saga = BookingSaga.create('booking-1');
    saga.beginCompensation();
    expect(saga.status).toBe(SagaStatus.COMPENSATING);
  });

  it('complete - sets COMPLETED', () => {
    const saga = BookingSaga.create('booking-1');
    saga.complete();
    expect(saga.status).toBe(SagaStatus.COMPLETED);
  });

  it('markCompensated - sets COMPENSATED', () => {
    const saga = BookingSaga.create('booking-1');
    saga.beginCompensation();
    saga.markCompensated();
    expect(saga.status).toBe(SagaStatus.COMPENSATED);
  });

  it('markCompensatedWithErrors - sets COMPENSATED_WITH_ERRORS', () => {
    const saga = BookingSaga.create('booking-1');
    saga.beginCompensation();
    saga.markCompensatedWithErrors();
    expect(saga.status).toBe(SagaStatus.COMPENSATED_WITH_ERRORS);
  });

  it('has OneToMany to steps', () => {
    const saga = BookingSaga.create('booking-1');
    saga.addStep('step_a');
    saga.addStep('step_b');
    expect(saga.steps).toHaveLength(2);
    expect(saga.steps[0]?.sagaId).toBe(saga.id);
  });
});
