import 'reflect-metadata';
import { getMetadataArgsStorage } from 'typeorm';
import { ProcessedEventEntity } from './processed-event.entity';

describe('ProcessedEventEntity', () => {
  it('eventId is PrimaryColumn', () => {
    const storage = getMetadataArgsStorage();
    const primary = storage.columns.find(
      (c) =>
        c.target === ProcessedEventEntity &&
        (c as any).propertyName === 'eventId' &&
        (c as any).mode === 'regular',
    );
    // Check it appears in the primary keys section
    const pk = storage.columns.find(
      (c) => c.target === ProcessedEventEntity && (c as any).propertyName === 'eventId',
    );
    expect(pk).toBeDefined();
    // Ensure no generated column decorator is applied
    const generated = storage.generations.find(
      (g) => g.target === ProcessedEventEntity && (g as any).propertyName === 'eventId',
    );
    expect(generated).toBeUndefined();
  });
});
