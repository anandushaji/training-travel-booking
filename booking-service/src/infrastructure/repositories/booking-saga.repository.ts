import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingSagaEntity } from '../entities/booking-saga.entity';
import { BookingSagaStepEntity } from '../entities/booking-saga-step.entity';
import { BookingSaga } from '../../domain/entities/booking-saga.entity';
import { BookingStep } from '../../domain/entities/booking-step.entity';
import { SagaStatus } from '../../domain/value-objects/saga-status.enum';
import { StepStatus } from '../../domain/value-objects/step-status.enum';

@Injectable()
export class BookingSagaRepository {
  constructor(
    @InjectRepository(BookingSagaEntity)
    private readonly repo: Repository<BookingSagaEntity>,
  ) {}

  async save(saga: BookingSaga): Promise<void> {
    const entity = this.toEntity(saga);
    await this.repo.save(entity);
  }

  async findByBookingId(bookingId: string): Promise<BookingSaga | null> {
    const entity = await this.repo.findOne({
      where: { bookingId },
      relations: ['steps'],
      order: { createdAt: 'DESC' },
    });
    if (!entity) return null;
    return this.toDomain(entity);
  }

  async findById(id: string): Promise<BookingSaga | null> {
    const entity = await this.repo.findOne({ where: { id }, relations: ['steps'] });
    if (!entity) return null;
    return this.toDomain(entity);
  }

  private toEntity(saga: BookingSaga): BookingSagaEntity {
    const entity = new BookingSagaEntity();
    entity.id = saga.id;
    entity.bookingId = saga.bookingId;
    entity.status = saga.status;
    entity.currentStep = saga.currentStep;
    entity.steps = saga.steps.map((s) => {
      const stepEntity = new BookingSagaStepEntity();
      stepEntity.id = s.id;
      stepEntity.sagaId = s.sagaId;
      stepEntity.stepNumber = s.stepNumber;
      stepEntity.stepName = s.stepName;
      stepEntity.status = s.status;
      stepEntity.startedAt = s.startedAt ?? null;
      stepEntity.completedAt = s.completedAt ?? null;
      stepEntity.errorMessage = s.errorMessage ?? null;
      stepEntity.retryCount = s.retryCount;
      return stepEntity;
    });
    return entity;
  }

  private toDomain(entity: BookingSagaEntity): BookingSaga {
    const saga = new (BookingSaga as any)({
      id: entity.id,
      bookingId: entity.bookingId,
      status: entity.status as SagaStatus,
      currentStep: entity.currentStep,
      steps: (entity.steps ?? []).map((s) => {
        return new (BookingStep as any)({
          id: s.id,
          sagaId: s.sagaId,
          stepNumber: s.stepNumber,
          stepName: s.stepName,
          status: s.status as StepStatus,
          startedAt: s.startedAt ?? undefined,
          completedAt: s.completedAt ?? undefined,
          errorMessage: s.errorMessage ?? undefined,
          retryCount: s.retryCount,
        });
      }),
    });
    return saga;
  }
}
