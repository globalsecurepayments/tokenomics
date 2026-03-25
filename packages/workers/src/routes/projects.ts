import { Hono } from 'hono';
import type { Env } from '../env';

const app = new Hono<{ Bindings: Env }>();

/** List all projects (stored as KV keys with prefix "project:") */
app.get('/', async (c) => {
	const list = await c.env.TEMPLATES.list({ prefix: 'project:' });
	const projects = await Promise.all(
		list.keys.map(async (k) => {
			const data = await c.env.TEMPLATES.get(k.name, 'json');
			return data;
		})
	);
	return c.json({ projects: projects.filter(Boolean) });
});

/** Create a new project */
app.post('/', async (c) => {
	const body = await c.req.json();
	const id = body.id ?? crypto.randomUUID();
	const now = Date.now();
	const project = {
		id,
		name: body.name,
		description: body.description,
		tokenSymbol: body.tokenSymbol,
		totalSupply: body.totalSupply,
		decimals: body.decimals ?? 18,
		status: 'draft',
		createdAt: now,
		updatedAt: now
	};

	// Store project index in KV
	await c.env.TEMPLATES.put(`project:${id}`, JSON.stringify(project));

	// Initialize ProjectState DO
	const doId = c.env.PROJECT_STATE.idFromName(id);
	const stub = c.env.PROJECT_STATE.get(doId);
	await stub.fetch(new Request('http://do/project', {
		method: 'PUT',
		body: JSON.stringify(project)
	}));

	return c.json(project, 201);
});

/** Get project with full model */
app.get('/:id', async (c) => {
	const id = c.req.param('id');
	const doId = c.env.PROJECT_STATE.idFromName(id);
	const stub = c.env.PROJECT_STATE.get(doId);
	const res = await stub.fetch(new Request('http://do/full'));
	return new Response(res.body, { status: res.status, headers: res.headers });
});

/** Update project metadata */
app.put('/:id', async (c) => {
	const id = c.req.param('id');
	const body = await c.req.json();
	body.id = id;

	const doId = c.env.PROJECT_STATE.idFromName(id);
	const stub = c.env.PROJECT_STATE.get(doId);
	await stub.fetch(new Request('http://do/project', {
		method: 'PUT',
		body: JSON.stringify(body)
	}));

	// Update KV index
	await c.env.TEMPLATES.put(`project:${id}`, JSON.stringify(body));

	return c.json({ ok: true });
});

/** Delete project */
app.delete('/:id', async (c) => {
	const id = c.req.param('id');
	const doId = c.env.PROJECT_STATE.idFromName(id);
	const stub = c.env.PROJECT_STATE.get(doId);
	await stub.fetch(new Request('http://do/project', { method: 'DELETE' }));
	await c.env.TEMPLATES.delete(`project:${id}`);
	return c.json({ ok: true });
});

/** Duplicate project */
app.post('/:id/duplicate', async (c) => {
	const id = c.req.param('id');
	const srcDoId = c.env.PROJECT_STATE.idFromName(id);
	const srcStub = c.env.PROJECT_STATE.get(srcDoId);
	const fullRes = await srcStub.fetch(new Request('http://do/full'));
	const full = await fullRes.json() as any;

	const newId = crypto.randomUUID();
	const now = Date.now();
	full.project.id = newId;
	full.project.name = `${full.project.name} (Copy)`;
	full.project.createdAt = now;
	full.project.updatedAt = now;

	// Create new DO
	const newDoId = c.env.PROJECT_STATE.idFromName(newId);
	const newStub = c.env.PROJECT_STATE.get(newDoId);
	await newStub.fetch(new Request('http://do/project', { method: 'PUT', body: JSON.stringify(full.project) }));
	if (full.cld) await newStub.fetch(new Request('http://do/cld', { method: 'PUT', body: JSON.stringify(full.cld) }));
	if (full.stockFlow) await newStub.fetch(new Request('http://do/stock-flow', { method: 'PUT', body: JSON.stringify(full.stockFlow) }));
	if (full.bondingCurves?.length) await newStub.fetch(new Request('http://do/bonding-curve', { method: 'PUT', body: JSON.stringify(full.bondingCurves) }));
	if (full.emissionSchedules?.length) await newStub.fetch(new Request('http://do/emission', { method: 'PUT', body: JSON.stringify(full.emissionSchedules) }));
	if (full.vestingSchedules?.length) await newStub.fetch(new Request('http://do/vesting', { method: 'PUT', body: JSON.stringify(full.vestingSchedules) }));
	if (full.allocations?.length) await newStub.fetch(new Request('http://do/allocation', { method: 'PUT', body: JSON.stringify(full.allocations) }));

	await c.env.TEMPLATES.put(`project:${newId}`, JSON.stringify(full.project));
	return c.json(full.project, 201);
});

/** Export project as JSON */
app.post('/:id/export', async (c) => {
	const id = c.req.param('id');
	const doId = c.env.PROJECT_STATE.idFromName(id);
	const stub = c.env.PROJECT_STATE.get(doId);
	const res = await stub.fetch(new Request('http://do/full'));
	const full = await res.json();
	return c.json(full);
});

export default app;
