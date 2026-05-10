export interface IRepository<T, ID> {
    save(entity: T): Promise<void>;
    findById(id: ID): Promise<T | null>;
    findAll(filter?: Partial<T>): Promise<T[]>;
    delete(id: ID): Promise<void>;
}
//# sourceMappingURL=repository.interface.d.ts.map