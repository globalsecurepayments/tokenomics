import { Hono } from 'hono';
import type { Env } from '../env';

const app = new Hono<{ Bindings: Env }>();

/** Helper to forward PUT/GET to ProjectState DO */
function doFetch(c: any, projectId: string, path: string, method: string, body?: any) {
	const doId = c.env.PROJECT_STATE.idFromName(projectId);
	const stub = c.env.PROJECT_STATE.get(doId);
	const init: RequestInit = { method };
	if (body) init.body = JSON.stringify(body);
	return stub.fetch(new Request(`http://do${path}`, init));
}

// CLD
app.get('/:id/cld', async (c) => {
	const res = await doFetch(c, c.req.param('id'), '/cld', 'GET');
	return new Response(res.body, { status: res.status, headers: res.headers });
});
app.put('/:id/cld', async (c) => {
	const body = await c.req.json();
	const res = await doFetch(c, c.req.param('id'), '/cld', 'PUT', body);
	return new Response(res.body, { status: res.status, headers: res.headers });
});

// Stock-Flow
app.get('/:id/stock-flow', async (c) => {
	const res = await doFetch(c, c.req.param('id'), '/stock-flow', 'GET');
	return new Response(res.body, { status: res.status, headers: res.headers });
});
app.put('/:id/stock-flow', async (c) => {
	const body = await c.req.json();
	const res = await doFetch(c, c.req.param('id'), '/stock-flow', 'PUT', body);
	return new Response(res.body, { status: res.status, headers: res.headers });
});

// Bonding Curve
app.get('/:id/bonding-curve', async (c) => {
	const res = await doFetch(c, c.req.param('id'), '/bonding-curve', 'GET');
	return new Response(res.body, { status: res.status, headers: res.headers });
});
app.put('/:id/bonding-curve', async (c) => {
	const body = await c.req.json();
	const res = await doFetch(c, c.req.param('id'), '/bonding-curve', 'PUT', body);
	return new Response(res.body, { status: res.status, headers: res.headers });
});

// Emission
app.get('/:id/emission', async (c) => {
	const res = await doFetch(c, c.req.param('id'), '/emission', 'GET');
	return new Response(res.body, { status: res.status, headers: res.headers });
});
app.put('/:id/emission', async (c) => {
	const body = await c.req.json();
	const res = await doFetch(c, c.req.param('id'), '/emission', 'PUT', body);
	return new Response(res.body, { status: res.status, headers: res.headers });
});

// Vesting
app.get('/:id/vesting', async (c) => {
	const res = await doFetch(c, c.req.param('id'), '/vesting', 'GET');
	return new Response(res.body, { status: res.status, headers: res.headers });
});
app.put('/:id/vesting', async (c) => {
	const body = await c.req.json();
	const res = await doFetch(c, c.req.param('id'), '/vesting', 'PUT', body);
	return new Response(res.body, { status: res.status, headers: res.headers });
});

// Allocation
app.get('/:id/allocation', async (c) => {
	const res = await doFetch(c, c.req.param('id'), '/allocation', 'GET');
	return new Response(res.body, { status: res.status, headers: res.headers });
});
app.put('/:id/allocation', async (c) => {
	const body = await c.req.json();
	const res = await doFetch(c, c.req.param('id'), '/allocation', 'PUT', body);
	return new Response(res.body, { status: res.status, headers: res.headers });
});

export default app;
