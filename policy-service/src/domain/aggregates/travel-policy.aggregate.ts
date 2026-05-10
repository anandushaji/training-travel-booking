import { AggregateRoot, generateUuid } from '@travel/shared';
import { PolicyRules, PolicyRulesProps, CabinClass } from '../value-objects/policy-rules.value-object';

export interface TravelPolicyProps {
  id: string;
  name: string;
  description: string | null;
  department: string;
  rules: PolicyRules;
  active: boolean;
  createdBy: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePolicyProps {
  name: string;
  description?: string;
  department: string;
  rules: PolicyRulesProps;
  requiresApproval?: boolean;
}

export interface UpdatePolicyProps {
  name?: string;
  description?: string;
  rules?: PolicyRulesProps;
  active?: boolean;
}

export class TravelPolicy extends AggregateRoot<TravelPolicyProps> {
  static create(props: CreatePolicyProps, createdBy: string): TravelPolicy {
    const id = generateUuid();
    const now = new Date();
    const policyProps: TravelPolicyProps = {
      id,
      name: props.name,
      description: props.description ?? null,
      department: props.department,
      rules: new PolicyRules(props.rules),
      active: true,
      createdBy,
      version: 0,
      createdAt: now,
      updatedAt: now,
    };
    return new TravelPolicy(policyProps);
  }

  static reconstitute(props: TravelPolicyProps): TravelPolicy {
    return new TravelPolicy(props);
  }

  override get version(): number {
    return this.props.version;
  }

  get name(): string {
    return this.props.name;
  }

  get description(): string | null {
    return this.props.description;
  }

  get department(): string {
    return this.props.department;
  }

  get rules(): PolicyRules {
    return this.props.rules;
  }

  get active(): boolean {
    return this.props.active;
  }

  get createdBy(): string {
    return this.props.createdBy;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  update(updateProps: UpdatePolicyProps): void {
    if (updateProps.name !== undefined) {
      this.props.name = updateProps.name;
    }
    if (updateProps.description !== undefined) {
      this.props.description = updateProps.description;
    }
    if (updateProps.rules !== undefined) {
      this.props.rules = new PolicyRules(updateProps.rules);
    }
    if (updateProps.active !== undefined) {
      this.props.active = updateProps.active;
    }
    this.props.version += 1;
    this.props.updatedAt = new Date();
  }

  deactivate(): void {
    this.props.active = false;
    this.props.version += 1;
    this.props.updatedAt = new Date();
  }
}

export { CabinClass };
