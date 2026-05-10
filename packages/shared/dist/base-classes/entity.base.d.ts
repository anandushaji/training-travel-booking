export declare abstract class Entity<TProps extends {
    id: string;
}> {
    protected readonly props: TProps;
    constructor(props: TProps);
    get id(): string;
    equals(other: Entity<TProps>): boolean;
}
//# sourceMappingURL=entity.base.d.ts.map