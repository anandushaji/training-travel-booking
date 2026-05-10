import { Entity, generateUuid } from '@travel/shared';
import { SagaStatus } from '../value-objects/saga-status.enum';
import { BookingStep } from './booking-step.entity';

interface BookingSagaProps {
  id: string;
  bookingId: string;
  status: SagaStatus;
  currentStep: number;
  steps: BookingStep[];
}

export class BookingSaga extends Entity<BookingSagaProps> {
  static create(bookingId: string): BookingSaga {
    return new BookingSaga({
      id: generateUuid(),
      bookingId,
      status: SagaStatus.STARTED,
      currentStep: 0,
      steps: [],
    });
  }

  get bookingId(): string {
    return this.props.bookingId;
  }

  get status(): SagaStatus {
    return this.props.status;
  }

  get currentStep(): number {
    return this.props.currentStep;
  }

  get steps(): BookingStep[] {
    return [...this.props.steps];
  }

  addStep(stepName: string): BookingStep {
    const stepNumber = this.props.steps.length + 1;
    const step = BookingStep.create(this.props.id, stepNumber, stepName);
    this.props.steps.push(step);
    this.props.status = SagaStatus.IN_PROGRESS;
    return step;
  }

  markStepCompleted(stepNumber: number): void {
    const step = this.props.steps.find((s) => s.stepNumber === stepNumber);
    if (step) {
      step.markCompleted();
    }
    this.props.currentStep = stepNumber;
  }

  markStepFailed(stepNumber: number, error: string): void {
    const step = this.props.steps.find((s) => s.stepNumber === stepNumber);
    if (step) {
      step.markFailed(error);
    }
  }

  beginCompensation(): void {
    this.props.status = SagaStatus.COMPENSATING;
  }

  markCompensated(): void {
    this.props.status = SagaStatus.COMPENSATED;
  }

  markCompensatedWithErrors(): void {
    this.props.status = SagaStatus.COMPENSATED_WITH_ERRORS;
  }

  complete(): void {
    this.props.status = SagaStatus.COMPLETED;
  }

  fail(): void {
    this.props.status = SagaStatus.FAILED;
  }
}
