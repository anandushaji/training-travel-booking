export declare abstract class ValueObject<TProps extends object> {
    protected readonly props: Readonly<TProps>;
    constructor(props: TProps);
    equals(other: ValueObject<TProps>): boolean;
}
//# sourceMappingURL=value-object.base.d.ts.map