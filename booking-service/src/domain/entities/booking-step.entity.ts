import { Entity, generateUuid } from '@travel/shared';
import { StepStatus } from '../value-objects/step-status.enum';

interface BookingStepProps {
  id: string;
  sagaId: string;
  stepNumber: number;
  stepName: string;
  status: StepStatus;
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
  retryCount: number;
}

export class BookingStep extends Entity<BookingStepProps> {
  static create(sagaId: string, stepNumber: number, stepName: string): BookingStep {
    return new BookingStep({
      id: generateUuid(),
      sagaId,
      stepNumber,
      stepName,
      status: StepStatus.PENDING,
      retryCount: 0,
    });
  }

  get sagaId(): string {
    return this.props.sagaId;
  }

  get stepNumber(): number {
    return this.props.stepNumber;
  }

  get stepName(): string {
    return this.props.stepName;
  }

  get status(): StepStatus {
    return this.props.status;
  }

  get startedAt(): Date | undefined {
    return this.props.startedAt;
  }

  get completedAt(): Date | undefined {
    return this.props.completedAt;
  }

  get errorMessage(): string | undefined {
    return this.props.errorMessage;
  }

  get retryCount(): number {
    return this.props.retryCount;
  }

  markInProgress(): void {
    this.props.status = StepStatus.IN_PROGRESS;
    this.props.startedAt = new Date();
  }

  markCompleted(): void {
    this.props.status = StepStatus.COMPLETED;
    this.props.completedAt = new Date();
  }

  markFailed(error: string): void {
    this.props.status = StepStatus.FAILED;
    this.props.errorMessage = error;
  }
}
