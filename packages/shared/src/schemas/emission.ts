import { z } from 'zod';

export const emissionTypeSchema = z.enum(['linear', 'halving', 'sigmoid', 'custom']);

export const emissionScheduleSchema = z.object({
	id: z.string(),
	type: emissionTypeSchema,
	params: z.object({
		totalEmission: z.number().positive(),
		durationMonths: z.number().int().positive(),
		halvingPeriodMonths: z.number().int().positive().optional(),
		halvingFactor: z.number().min(0).max(1).optional(),
		sigmoidMidpoint: z.number().optional(),
		sigmoidSteepness: z.number().optional()
	}),
	customPoints: z
		.array(z.object({ month: z.number(), cumulativeEmission: z.number() }))
		.optional()
});

export type EmissionType = z.infer<typeof emissionTypeSchema>;
export type EmissionSchedule = z.infer<typeof emissionScheduleSchema>;
