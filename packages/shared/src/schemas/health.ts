import { z } from 'zod';

export const healthIndicatorSchema = z.object({
	name: z.string(),
	value: z.number(),
	target: z.number(),
	status: z.enum(['healthy', 'warning', 'critical']),
	description: z.string()
});

export const healthReportSchema = z.object({
	projectId: z.string().uuid(),
	timestamp: z.number(),
	indicators: z.object({
		normalizedTreasuryDecrease: healthIndicatorSchema,
		normalizedEmissionPerStaked: healthIndicatorSchema,
		logNormalizedInflation: healthIndicatorSchema,
		fdvTvlRatio: healthIndicatorSchema,
		floatAnalysis: healthIndicatorSchema
	}),
	overallScore: z.number().min(0).max(100)
});

export type HealthIndicator = z.infer<typeof healthIndicatorSchema>;
export type HealthReport = z.infer<typeof healthReportSchema>;
