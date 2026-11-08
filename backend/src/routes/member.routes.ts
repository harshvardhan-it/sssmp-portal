import { NextFunction, Request, Response, Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRoles } from '../middleware/auth.middleware';
import { sendError } from '../middleware/error-response';
import { Block, District, Member, AuditLog } from '../models';
import { assertScopeId } from '../services/admin-scope.service';
import { RegistrationError, registerMember, registrationDuplicateMessage } from '../services/registration.service';
import { login } from '../services/auth.service';

const router = Router();

export const profileUpdateSchema = z.object({
  fullName: z.string().trim().min(1).max(150).optional(),
  fatherHusbandName: z.string().trim().min(1).max(150).optional(),
  dob: z.string().date().optional().or(z.literal('')),
  gender: z.string().trim().max(30).optional(),
  mobile: z.string().regex(/^\d{10}$/).optional(),
  email: z.string().trim().email().max(254).optional().or(z.literal('')),
  address: z.string().trim().max(500).optional(),
  district: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  block: z.string().regex(/^[a-f\d]{24}$/i).optional().or(z.literal('')),
  schoolName: z.string().trim().min(1).max(250).optional(),
  designation: z.string().trim().min(1).max(150).optional(),
  employeeId: z.string().trim().min(1).max(50).optional(),
}).strict();

export const registrationSchema = z.object({
  fullName: z.string().trim().min(1).max(150),
  fatherHusbandName: z.string().trim().min(1).max(150),
  dob: z.string().date(),
  gender: z.string().trim().max(30).optional(),
  mobile: z.string().regex(/^\d{10}$/),
  email: z.string().trim().email().max(254).optional().or(z.literal('')),
  address: z.string().trim().max(500).optional(),
  district: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid district identifier'),
  block: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid block identifier').optional().or(z.literal('')),
  schoolName: z.string().trim().min(1).max(250),
  designation: z.string().trim().min(1).max(150),
  employeeId: z.string().trim().min(1, 'Employee Code / Unique ID is required').max(50),
  selectedPlan: z.enum(['office_bearer', 'yearly']),
  password: z.string().min(8).max(128),
  confirmPassword: z.string().min(8).max(128),
  agreeTerms: z.literal(true),
}).strict().superRefine((value, context) => {
  if (value.password !== value.confirmPassword) {
    context.addIssue({
      code: 'custom',
      path: ['confirmPassword'],
      message: 'Passwords do not match',
    });
  }
});

function isDuplicateKeyError(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: number }).code === 11000,
  );
}

export function createRegistrationHandler(
  services: { registerMember: typeof registerMember; login: typeof login } = { registerMember, login },
) {
  return async (request: Request, response: Response, next: NextFunction) => {
    try {
      const input = registrationSchema.parse(request.body);
      const result = await services.registerMember(input);
      try {
        const session = await services.login({
          identifier: input.email?.trim() || input.mobile,
          password: input.password,
        });
        response.status(201).json({ success: true, data: { ...result, auth: session } });
      } catch {
        response.status(201).json({
          success: true,
          data: { ...result, auth: null, authenticationRequired: true },
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        sendError(response, 422, 'VALIDATION_ERROR', 'Request validation failed', error.flatten());
        return;
      }
      if (error instanceof RegistrationError) {
        sendError(response, error.code === 'DUPLICATE' ? 409 : 422, error.code, error.message);
        return;
      }
      if (isDuplicateKeyError(error)) {
        sendError(response, 409, 'DUPLICATE_REGISTRATION', registrationDuplicateMessage(error) ?? 'A duplicate registration record was detected. Please verify your details.');
        return;
      }
      next(error);
    }
  };
}

router.post('/register', createRegistrationHandler());

router.get('/me', authenticate, async (request, response, next) => {
  try {
    const member = await Member.findOne({ userId: request.authenticatedUser!.id })
      .populate('districtId', 'code nameEn nameHi')
      .populate('blockId', 'code nameEn nameHi')
      .lean();
    if (!member) {
      sendError(response, 404, 'MEMBER_NOT_FOUND', 'Member profile not found');
      return;
    }
    response.json({
      success: true,
      data: {
        member: {
          id: member._id,
          registrationId: member.registrationId,
          fullName: member.fullName,
          fatherHusbandName: member.fatherOrHusbandName,
          dob: member.dateOfBirth,
          gender: member.gender,
          mobile: member.mobile,
          email: member.email,
          address: member.address,
          district: member.districtId,
          block: member.blockId,
          locationStatus: member.blockId ? 'VERIFIED' : 'LOCATION_PENDING',
          schoolName: member.schoolName,
          designation: member.designation,
          employeeId: member.employeeId,
          subscriptionPlan: member.subscriptionPlan,
          subscriptionAmount: member.subscriptionAmount,
          membershipStatus: member.membershipStatus,
          createdAt: member.createdAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/me', authenticate, requireRoles('MEMBER'), async (request, response, next) => {
  try {
    const input = profileUpdateSchema.parse(request.body);
    const member = await Member.findOne({ userId: request.authenticatedUser!.id });
    if (!member) { sendError(response, 404, 'MEMBER_NOT_FOUND', 'Member profile not found'); return; }
    const changes: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      if (key === 'dob') changes.dateOfBirth = value ? new Date(value) : undefined;
      else if (key === 'fatherHusbandName') changes.fatherOrHusbandName = value;
      else if (key === 'district') changes.districtId = value;
      else if (key === 'block') changes.blockId = value || undefined;
      else changes[key] = value;
    }
    const districtId = String(changes.districtId ?? member.districtId);
    const district = await District.findOne({ _id: districtId, isActive: true }).lean();
    if (!district) { sendError(response, 422, 'INVALID_LOCATION', 'District is invalid'); return; }
    if (changes.blockId) {
      const block = await Block.findOne({ _id: String(changes.blockId), districtId, isActive: true }).lean();
      if (!block) { sendError(response, 422, 'INVALID_LOCATION', 'Education Block is invalid'); return; }
      changes.locationStatus = block.verificationStatus === 'PROVISIONAL' ? 'LOCATION_PENDING' : 'VERIFIED';
    } else if (Object.prototype.hasOwnProperty.call(changes, 'blockId') || districtId !== member.districtId.toString()) {
      changes.blockId = undefined;
      changes.locationStatus = 'LOCATION_PENDING';
    }
    const unsetBlock = changes.blockId === undefined && (Object.prototype.hasOwnProperty.call(changes, 'blockId') || districtId !== member.districtId.toString());
    if (unsetBlock) delete changes.blockId;
    const updateDocument = { $set: changes, ...(unsetBlock ? { $unset: { blockId: '' } } : {}) };
    const updated = await Member.findOneAndUpdate({ _id: member._id, userId: request.authenticatedUser!.id }, updateDocument, { new: true, runValidators: true })
      .populate('districtId', 'code nameEn nameHi').populate('blockId', 'code nameEn nameHi').lean();
    await AuditLog.create({ actorUserId: assertScopeId(request.authenticatedUser!.id, 'user'), action: 'MEMBER_PROFILE_UPDATED', targetEntityType: 'MEMBER', targetEntityId: member._id, metadata: { fields: Object.keys(changes).join(',') } });
    response.json({ success: true, data: { member: updated } });
  } catch (error) {
    if (error instanceof z.ZodError) { sendError(response, 422, 'VALIDATION_ERROR', 'Request validation failed', error.flatten()); return; }
    if (error && typeof error === 'object' && 'code' in error && (error as { code?: number }).code === 11000) { sendError(response, 409, 'DUPLICATE_MEMBER_FIELD', 'Mobile, email, or Employee Code is already registered'); return; }
    next(error);
  }
});

export default router;
