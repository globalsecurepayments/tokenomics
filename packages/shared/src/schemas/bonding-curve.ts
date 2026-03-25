import { z } from 'zod';

export const bondingCurveTypeSchema = z.enum(['linear', 'exponential', 'logarithmic', 'sigmoid', 'custom']);

export const bondingCurveSchema = z.object({
	id: z.string(),
	type: bondingCurveTypeSchema,
	params: z.object({
		slope: z.number().optional(),
		intercept: z.number().optional(),
		base: z.number().optional(),
		exponent: z.number().optional(),
		logBase: z.number().optional(),
		midpoint: z.number().optional(),
		steepness: z.number().optional(),
		maxPrice: z.number().optional(),
		reserveRatio: z.number().min(0).max(1).optional()
	}),
	customPoints: z
		.array(z.object({ supply: z.number(), price: z.number() }))
		.optional()
});

export type BondingCurveType = z.infer<typeof bondingCurveTypeSchema>;
export type BondingCurve = z.infer<typeof bondingCurveSchema>;
