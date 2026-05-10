import { IRepository } from '../../../src/interfaces/repository.interface';
import { IUseCase } from '../../../src/interfaces/use-case.interface';

// --- Booking stub types for compile-time checks ---

interface BookingEntity {
  id: string;
  status: string;
}

type BookingId = string;

// AC-01: Full IRepository implementation compiles
class MockBookingRepo implements IRepository<BookingEntity, BookingId> {
  async save(_entity: BookingEntity): Promise<void> {}
  async findById(_id: BookingId): Promise<BookingEntity | null> { return null; }
  async findAll(_filter?: Partial<BookingEntity>): Promise<BookingEntity[]> { return []; }
  async delete(_id: BookingId): Promise<void> {}
}

// AC-02: IUseCase implementation compiles
interface CreateCommand { name: string }
interface ResultDto { id: string }

class CreateBookingUseCase implements IUseCase<CreateCommand, ResultDto> {
  async execute(_input: CreateCommand): Promise<ResultDto> {
    return { id: 'new-id' };
  }
}

// AC-03: Missing findById causes a compile error — verified via @ts-expect-error
// @ts-expect-error — class is missing findById, findAll, and delete
class IncompleteMockRepo implements IRepository<BookingEntity, BookingId> {
  async save(_entity: BookingEntity): Promise<void> {}
}

describe('IRepository', () => {
  it('valid implementation with findAll compiles', async () => {
    const repo = new MockBookingRepo();
    expect(await repo.findAll()).toEqual([]);
    expect(await repo.findAll({ status: 'CONFIRMED' })).toEqual([]);
  });

  it('findById returns null when not found', async () => {
    const repo = new MockBookingRepo();
    expect(await repo.findById('any')).toBeNull();
  });
});

describe('IUseCase', () => {
  it('valid implementation compiles', async () => {
    const uc = new CreateBookingUseCase();
    const result = await uc.execute({ name: 'test' });
    expect(result.id).toBe('new-id');
  });
});

describe('IncompleteMockRepo', () => {
  it('is still constructible at runtime (TS error is compile-time only)', () => {
    // The @ts-expect-error above proves the compile error is raised.
    // Runtime test just ensures the class exists.
    expect(new IncompleteMockRepo()).toBeTruthy();
  });
});
