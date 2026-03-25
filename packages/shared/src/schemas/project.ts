import { z } from 'zod';

export const positionSchema = z.object({
	x: z.number(),
	y: z.number()
});

export const projectSchema = z.object({
	id: z.string().uuid(),
	name: z.string().min(1).max(100),
	description: z.string().max(2000).optional(),
	tokenSymbol: z.string().min(1).max(10),
	totalSupply: z.number().positive(),
	decimals: z.number().int().min(0).max(18).default(18),
	status: z.enum(['draft', 'modeling', 'simulating', 'analyzed']),
	createdAt: z.number(),
	updatedAt: z.number()
});

export const cldVariableSchema = z.object({
	id: z.string(),
	label: z.string().min(1),
	type: z.enum(['stock', 'flow', 'auxiliary', 'parameter', 'source', 'sink']),
	position: positionSchema,
	initialValue: z.number().optional(),
	unit: z.string().optional()
});

export const cldLinkSchema = z.object({
	id: z.string(),
	source: z.string(),
	target: z.string(),
	polarity: z.enum(['positive', 'negative']),
	delay: z.boolean().default(false)
});

export const cldLoopSchema = z.object({
	id: z.string(),
	type: z.enum(['reinforcing', 'balancing']),
	label: z.string().min(1),
	variableIds: z.array(z.string()),
	position: positionSchema
});

export const cldModelSchema = z.object({
	variables: z.array(cldVariableSchema),
	links: z.array(cldLinkSchema),
	loops: z.array(cldLoopSchema)
});

export type Position = z.infer<typeof positionSchema>;
export type Project = z.infer<typeof projectSchema>;
export type CLDVariable = z.infer<typeof cldVariableSchema>;
export type CLDLink = z.infer<typeof cldLinkSchema>;
export type CLDLoop = z.infer<typeof cldLoopSchema>;
export type CLDModel = z.infer<typeof cldModelSchema>;
