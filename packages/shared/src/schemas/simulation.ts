import { z } from 'zod';

export const distributionSchema = z.object({
	type: z.enum(['normal', 'uniform', 'lognormal', 'triangular']),
	params: z.record(z.number())
});

export const monteCarloConfigSchema = z.object({
	iterations: z.number().int().min(10).max(100_000).default(1000),
	timesteps: z.number().int().min(10).max(10_000).default(365),
	stepUnit: z.enum(['day', 'week', 'month']).default('day'),
	seed: z.number().int().optional(),
	parameters: z.array(
		z.object({
			variableId: z.string(),
			distribution: distributionSchema
		})
	)
});

export const agentBehaviorSchema = z.object({
	buyProbability: z.number().min(0).max(1),
	sellProbability: z.number().min(0).max(1),
	holdDuration: z.object({ mean: z.number(), std: z.number() }),
	stakeProbability: z.number().min(0).max(1).optional()
});

export const agentPopulationSchema = z.object({
	type: z.enum(['funseeker', 'worker', 'holder', 'speculator', 'whale']),
	count: z.number().int().min(1).max(10_000),
	behavior: agentBehaviorSchema
});

export const abmConfigSchema = z.object({
	timesteps: z.number().int().min(10).max(10_000).default(365),
	stepUnit: z.enum(['day', 'week', 'month']).default('day'),
	seed: z.number().int().optional(),
	agentPopulations: z.array(agentPopulationSchema)
});

export const simStatusSchema = z.enum(['queued', 'running', 'complete', 'failed']);

export const simResultSchema = z.object({
	id: z.string().uuid(),
	projectId: z.string().uuid(),
	type: z.enum(['monte_carlo', 'abm', 'parameter_sweep']),
	status: simStatusSchema,
	progress: z.number().min(0).max(100),
	config: z.union([monteCarloConfigSchema, abmConfigSchema]),
	startedAt: z.number().optional(),
	completedAt: z.number().optional(),
	summary: z
		.object({
			medianPrice: z.number().optional(),
			p5Price: z.number().optional(),
			p95Price: z.number().optional(),
			medianCirculatingSupply: z.number().optional(),
			finalTreasury: z.number().optional(),
			sharpeRatio: z.number().optional()
		})
		.optional()
});

export type Distribution = z.infer<typeof distributionSchema>;
export type MonteCarloConfig = z.infer<typeof monteCarloConfigSchema>;
export type AgentBehavior = z.infer<typeof agentBehaviorSchema>;
export type AgentPopulation = z.infer<typeof agentPopulationSchema>;
export type ABMConfig = z.infer<typeof abmConfigSchema>;
export type SimStatus = z.infer<typeof simStatusSchema>;
export type SimResult = z.infer<typeof simResultSchema>;
