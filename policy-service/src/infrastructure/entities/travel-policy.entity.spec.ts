import 'reflect-metadata';
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('typeorm');
import { getMetadataArgsStorage } from 'typeorm';
import { TravelPolicyEntity } from './travel-policy.entity';

describe('TravelPolicyEntity', () => {
  it('has VersionColumn', () => {
    const storage = getMetadataArgsStorage();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const versionCols = (storage.columns as any[]).filter(
      (col: any) =>
        (col.target === TravelPolicyEntity || col.target === TravelPolicyEntity.name) &&
        col.mode === 'version',
    );
    expect(versionCols.length).toBeGreaterThan(0);
  });

  it('is mapped to travel_policies table', () => {
    const storage = getMetadataArgsStorage();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tableMeta = (storage.tables as any[]).find(
      (t: any) => t.target === TravelPolicyEntity,
    );
    expect(tableMeta?.name).toBe('travel_policies');
  });

  it('has unique constraint on name+department', () => {
    const storage = getMetadataArgsStorage();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const uniques = (storage.uniques as any[]).filter(
      (u: any) => u.target === TravelPolicyEntity,
    );
    const nameDepUnique = uniques.find(
      (u: any) =>
        Array.isArray(u.columns) &&
        (u.columns as string[]).includes('name') &&
        (u.columns as string[]).includes('department'),
    );
    expect(nameDepUnique).toBeDefined();
  });
});
