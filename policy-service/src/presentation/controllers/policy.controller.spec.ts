import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, HttpCode } from '@nestjs/common';
import { PolicyController } from './policy.controller';
import { CreatePolicyUseCase } from '../../application/use-cases/create-policy.use-case';
import { GetPolicyUseCase } from '../../application/use-cases/get-policy.use-case';
import { ListPoliciesUseCase } from '../../application/use-cases/list-policies.use-case';
import { UpdatePolicyUseCase } from '../../application/use-cases/update-policy.use-case';
import { DeletePolicyUseCase } from '../../application/use-cases/delete-policy.use-case';
import { ValidatePolicyUseCase } from '../../application/use-cases/validate-policy.use-case';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Reflector } from '@nestjs/core';
import { generateUuid } from '@travel/shared';
import { CabinClass } from '../../domain/value-objects/policy-rules.value-object';

function makeAdminReq(role = 'ADMIN') {
  return {
    user: { sub: generateUuid(), role, department: 'Engineering' },
    headers: { 'x-correlation-id': generateUuid() },
  } as any;
}

describe('PolicyController', () => {
  let controller: PolicyController;
  let mockCreate: jest.Mocked<CreatePolicyUseCase>;
  let mockGet: jest.Mocked<GetPolicyUseCase>;
  let mockList: jest.Mocked<ListPoliciesUseCase>;
  let mockUpdate: jest.Mocked<UpdatePolicyUseCase>;
  let mockDelete: jest.Mocked<DeletePolicyUseCase>;
  let mockValidate: jest.Mocked<ValidatePolicyUseCase>;

  const mockPolicy = {
    id: generateUuid(),
    name: 'Test',
    department: 'Engineering',
    active: true,
    version: 0,
    rules: {
      maxFlightCost: 1000,
      allowedCabinClasses: [CabinClass.ECONOMY],
      advanceBookingDays: 7,
      requiresApproval: false,
      approvalThreshold: 800,
      allowInternational: true,
    },
    description: null,
    createdBy: 'admin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    mockCreate = { execute: jest.fn().mockResolvedValue(mockPolicy) } as any;
    mockGet = { execute: jest.fn().mockResolvedValue(mockPolicy) } as any;
    mockList = { execute: jest.fn().mockResolvedValue([mockPolicy]) } as any;
    mockUpdate = { execute: jest.fn().mockResolvedValue(mockPolicy) } as any;
    mockDelete = { execute: jest.fn().mockResolvedValue(undefined) } as any;
    mockValidate = {
      execute: jest.fn().mockResolvedValue({ valid: true, violations: [], requiresApproval: false, policyId: null, department: 'Engineering' }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PolicyController],
      providers: [
        { provide: CreatePolicyUseCase, useValue: mockCreate },
        { provide: GetPolicyUseCase, useValue: mockGet },
        { provide: ListPoliciesUseCase, useValue: mockList },
        { provide: UpdatePolicyUseCase, useValue: mockUpdate },
        { provide: DeletePolicyUseCase, useValue: mockDelete },
        { provide: ValidatePolicyUseCase, useValue: mockValidate },
        Reflector,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: (ctx: any) => {
        const req = ctx.switchToHttp().getRequest();
        return !!req.user;
      }})
      .overrideGuard(RolesGuard)
      .useValue({
        canActivate: (ctx: any) => {
          // Allow all for basic controller tests; role tests done separately
          return true;
        },
      })
      .compile();

    controller = module.get<PolicyController>(PolicyController);
  });

  it('POST /policies returns created policy', async () => {
    const result = await controller.create(
      { name: 'Test', department: 'Eng', rules: { maxFlightCost: 1000, allowedCabinClasses: [CabinClass.ECONOMY], advanceBookingDays: 7, requiresApproval: false, approvalThreshold: 800, allowInternational: true } },
      makeAdminReq(),
    );
    expect(result).toEqual(mockPolicy);
  });

  it('POST /policies/validate routes correctly (not matched by :id)', async () => {
    const result = await controller.validate(
      { travelerId: generateUuid(), amount: 300 },
      makeAdminReq(),
    );
    expect(result.valid).toBe(true);
    expect(mockValidate.execute).toHaveBeenCalledTimes(1);
  });

  it('GET /policies returns list', async () => {
    const result = await controller.findAll();
    expect(result).toHaveLength(1);
  });

  it('GET /policies/:id returns policy', async () => {
    const result = await controller.findOne(mockPolicy.id);
    expect(result.id).toBe(mockPolicy.id);
  });

  it('correlationId forwarded from header', async () => {
    const corrId = generateUuid();
    const req = {
      user: { sub: generateUuid(), role: 'ADMIN', department: 'Engineering' },
      headers: { 'x-correlation-id': corrId },
    } as any;

    await controller.validate({ travelerId: generateUuid(), amount: 100 }, req);
    const callArgs = mockValidate.execute.mock.calls[0]!;
    expect(callArgs[2]).toBe(corrId);
  });

  it('correlationId generated when header absent', async () => {
    const req = {
      user: { sub: generateUuid(), role: 'ADMIN', department: 'Engineering' },
      headers: {},
    } as any;

    await controller.validate({ travelerId: generateUuid(), amount: 100 }, req);
    const callArgs = mockValidate.execute.mock.calls[0]!;
    expect(typeof callArgs[2]).toBe('string');
    expect(callArgs[2]!.length).toBeGreaterThan(0);
  });

  it('PUT /policies/:id updates policy', async () => {
    const result = await controller.update(mockPolicy.id, { name: 'Updated' });
    expect(result).toEqual(mockPolicy);
    expect(mockUpdate.execute).toHaveBeenCalledWith(mockPolicy.id, { name: 'Updated' });
  });

  it('DELETE /policies/:id removes policy', async () => {
    await controller.remove(mockPolicy.id);
    expect(mockDelete.execute).toHaveBeenCalledWith(mockPolicy.id);
  });

  it('GET /policies with department and active filters', async () => {
    await controller.findAll('Engineering', 'true');
    expect(mockList.execute).toHaveBeenCalledWith({ department: 'Engineering', active: true });
  });

  it('GET /policies with active=false filter', async () => {
    await controller.findAll(undefined, 'false');
    expect(mockList.execute).toHaveBeenCalledWith({ active: false });
  });
});

describe('PolicyController - role enforcement', () => {
  let controller: PolicyController;
  let rolesGuard: RolesGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PolicyController],
      providers: [
        { provide: CreatePolicyUseCase, useValue: { execute: jest.fn() } },
        { provide: GetPolicyUseCase, useValue: { execute: jest.fn() } },
        { provide: ListPoliciesUseCase, useValue: { execute: jest.fn() } },
        { provide: UpdatePolicyUseCase, useValue: { execute: jest.fn() } },
        { provide: DeletePolicyUseCase, useValue: { execute: jest.fn() } },
        { provide: ValidatePolicyUseCase, useValue: { execute: jest.fn() } },
        Reflector,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PolicyController>(PolicyController);
    rolesGuard = new RolesGuard(new Reflector());
  });

  it('RolesGuard throws ForbiddenException for MANAGER on create', () => {
    const mockContext = {
      getHandler: () => PolicyController.prototype.create,
      switchToHttp: () => ({ getRequest: () => ({ user: { role: 'MANAGER' } }) }),
    } as any;
    expect(() => rolesGuard.canActivate(mockContext)).toThrow(ForbiddenException);
  });

  it('RolesGuard allows ADMIN on create', () => {
    const mockContext = {
      getHandler: () => PolicyController.prototype.create,
      switchToHttp: () => ({ getRequest: () => ({ user: { role: 'ADMIN' } }) }),
    } as any;
    expect(rolesGuard.canActivate(mockContext)).toBe(true);
  });

  it('RolesGuard returns true when no roles required (method has no @Roles decorator)', () => {
    // findAll has no @Roles, so requiredRoles is undefined → returns true
    const mockContext = {
      getHandler: () => PolicyController.prototype.findAll,
      switchToHttp: () => ({ getRequest: () => ({ user: { role: 'EMPLOYEE' } }) }),
    } as any;
    expect(rolesGuard.canActivate(mockContext)).toBe(true);
  });

  it('RolesGuard throws ForbiddenException when user has no role property', () => {
    const mockContext = {
      getHandler: () => PolicyController.prototype.create,
      switchToHttp: () => ({ getRequest: () => ({ user: {} }) }),
    } as any;
    expect(() => rolesGuard.canActivate(mockContext)).toThrow();
  });
});
