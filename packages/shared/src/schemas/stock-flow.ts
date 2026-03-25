import { z } from 'zod';

export const stockSchema = z.object({
	id: z.string(),
	variableId: z.string(),
	label: z.string().min(1),
	initialValue: z.number(),
	equation: z.string().optional()
});

export const flowSchema = z.object({
	id: z.string(),
	label: z.string().min(1),
	from: z.string().nullable(),
	to: z.string().nullable(),
	rateEquation: z.string(),
	unit: z.string().default('tokens/step')
});

export const converterSchema = z.object({
	id: z.string(),
	label: z.string().min(1),
	equation: z.string(),
	inputs: z.array(z.string())
});

export const stockFlowModelSchema = z.object({
	stocks: z.array(stockSchema),
	flows: z.array(flowSchema),
	converters: z.array(converterSchema)
});

export type Stock = z.infer<typeof stockSchema>;
export type Flow = z.infer<typeof flowSchema>;
export type Converter = z.infer<typeof converterSchema>;
export type StockFlowModel = z.infer<typeof stockFlowModelSchema>;
