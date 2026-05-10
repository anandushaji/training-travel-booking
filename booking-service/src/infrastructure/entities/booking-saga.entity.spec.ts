// @ts-nocheck
import 'reflect-metadata';
import { getMetadataArgsStorage } from 'typeorm';
import { BookingSagaEntity } from './booking-saga.entity';
import { BookingSagaStepEntity } from './booking-saga-step.entity';

describe('BookingSagaEntity', () => {
  it('has OneToMany to steps', () => {
    void BookingSagaEntity;
    void BookingSagaStepEntity;
    const storage = getMetadataArgsStorage();
    const relations = storage.relations.filter(
      (r) => r.target === BookingSagaEntity && r.relationType === 'one-to-many',
    );
    expect(relations.length).toBeGreaterThan(0);
  });
});
