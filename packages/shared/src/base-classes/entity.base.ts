export abstract class Entity<TProps extends { id: string }> {
  protected readonly props: TProps;

  constructor(props: TProps) {
    this.props = props;
  }

  get id(): string {
    return this.props.id;
  }

  equals(other: Entity<TProps>): boolean {
    if (other === null || other === undefined) return false;
    if (other.constructor !== this.constructor) return false;
    return this.id === other.id;
  }
}
