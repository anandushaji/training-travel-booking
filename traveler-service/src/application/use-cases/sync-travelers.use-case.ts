import { Injectable, Logger } from '@nestjs/common';
import { ITravelerRepository } from '../../domain/repositories/i-traveler.repository';
import { TravelerEventPublisher } from '../../infrastructure/kafka/traveler-event-publisher';
import { Traveler, TravelerRole } from '../../domain/aggregates/traveler.aggregate';
import { HrSoapClientStub } from '../../infrastructure/hr/hr-soap-client.stub';
import { SyncTravelersDto, SyncResult } from '../dto/sync-travelers.dto';
import { InvalidEmailException } from '../../domain/exceptions/invalid-email.exception';

const DEFAULT_ROLE: TravelerRole = 'EMPLOYEE';

@Injectable()
export class SyncTravelersUseCase {
  private readonly logger = new Logger(SyncTravelersUseCase.name);

  constructor(
    private readonly repository: ITravelerRepository,
    private readonly publisher: TravelerEventPublisher,
    private readonly hrClient: HrSoapClientStub,
  ) {}

  async execute(
    dto: SyncTravelersDto,
    correlationId?: string,
  ): Promise<SyncResult> {
    let synced = 0;
    const errors: Array<{ employeeId: string; reason: string }> = [];

    for (const record of dto.employees) {
      try {
        const existing = await this.repository.findByEmployeeId(record.employeeId);

        if (existing) {
          existing.update({
            name: record.name,
            department: record.department,
            ...(correlationId !== undefined && { correlationId }),
          });
          await this.repository.save(existing);
          for (const event of existing.getUncommittedEvents()) {
            await this.publisher.publish(event);
          }
          existing.clearEvents();
        } else {
          const role: TravelerRole =
            (record.role as TravelerRole) ?? DEFAULT_ROLE;
          const traveler = Traveler.create({
            employeeId: record.employeeId,
            name: record.name,
            email: record.email,
            department: record.department,
            role,
            ...(correlationId !== undefined && { correlationId }),
          });
          await this.repository.save(traveler);
          for (const event of traveler.getUncommittedEvents()) {
            await this.publisher.publish(event);
          }
          traveler.clearEvents();
        }

        synced += 1;
      } catch (err) {
        const reason =
          err instanceof InvalidEmailException ? 'InvalidEmail' : String(err);
        this.logger.warn(`Sync error for ${record.employeeId}: ${reason}`);
        errors.push({ employeeId: record.employeeId, reason });
      }
    }

    return { synced, errors };
  }
}
