import { Router } from 'express';
import { Types } from 'mongoose';
import { Block, District } from '../models';
import { sendError } from '../middleware/error-response';

const router = Router();

router.get('/districts', async (_request, response, next) => {
  try {
    const districts = await District.find({ isActive: true })
      .sort({ nameEn: 1 })
      .lean();
    const blocks = await Block.find({ isActive: true })
      .sort({ nameEn: 1 })
      .lean();
    const blocksByDistrict = new Map<string, typeof blocks>();
    for (const block of blocks) {
      const key = block.districtId.toString();
      blocksByDistrict.set(key, [...(blocksByDistrict.get(key) ?? []), block]);
    }

    response.json({
      success: true,
      data: districts.map((district) => ({
        id: district._id,
        code: district.code,
        nameEn: district.nameEn,
        nameHi: district.nameHi,
        blocks: (blocksByDistrict.get(district._id.toString()) ?? []).map((block) => ({
          id: block._id,
          code: block.code,
          nameEn: block.nameEn,
          nameHi: block.nameHi,
          verificationStatus: block.verificationStatus ?? 'VERIFIED',
        })),
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/districts/:districtId/blocks', async (request, response, next) => {
  try {
    if (!Types.ObjectId.isValid(request.params.districtId)) {
      sendError(response, 422, 'VALIDATION_ERROR', 'Invalid district identifier');
      return;
    }
    const district = await District.findOne({
      _id: request.params.districtId,
      isActive: true,
    }).lean();
    if (!district) {
      sendError(response, 404, 'DISTRICT_NOT_FOUND', 'District not found');
      return;
    }
    const blocks = await Block.find({
      districtId: district._id,
      isActive: true,
    }).sort({ nameEn: 1 }).lean();
    response.json({
      success: true,
      data: {
        district: {
          id: district._id,
          code: district.code,
          nameEn: district.nameEn,
          nameHi: district.nameHi,
        },
        blocks: blocks.map((block) => ({
          id: block._id,
          code: block.code,
          nameEn: block.nameEn,
          nameHi: block.nameHi,
          verificationStatus: block.verificationStatus ?? 'VERIFIED',
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
