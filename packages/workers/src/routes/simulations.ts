import { Hono } from 'hono';
import type { Env } from '../env';

const app = new Hono<{ Bindings: Env }>();

/** Launch a simulation */
app.post('/:projectId/simulate', async (c) => {
	const projectId = c.req.param('projectId');
	const config = await c.req.json();
	config.projectId = projectId;

	const simId = crypto.randomUUID();
	const doId = c.env.SIMULATION_ENGINE.idFromName(simId);
	const stub = c.env.SIMULATION_ENGINE.get(doId);
	const res = await stub.fetch(new Request('http://do/launch', {
		method: 'POST',
		body: JSON.stringify(config)
	}));
	const result = await res.json() as any;
	return c.json({ ...result, simId }, 201);
});

/** Get simulation status */
app.get('/sim/:simId', async (c) => {
	const simId = c.req.param('simId');
	const doId = c.env.SIMULATION_ENGINE.idFromName(simId);
	const stub = c.env.SIMULATION_ENGINE.get(doId);
	const res = await stub.fetch(new Request('http://do/status'));
	return new Response(res.body, { status: res.status, headers: res.headers });
});

/** Get simulation results */
app.get('/sim/:simId/results', async (c) => {
	const simId = c.req.param('simId');
	const doId = c.env.SIMULATION_ENGINE.idFromName(simId);
	const stub = c.env.SIMULATION_ENGINE.get(doId);
	const res = await stub.fetch(new Request('http://do/results'));
	return new Response(res.body, { status: res.status, headers: res.headers });
});

/** Cancel simulation */
app.delete('/sim/:simId', async (c) => {
	const simId = c.req.param('simId');
	const doId = c.env.SIMULATION_ENGINE.idFromName(simId);
	const stub = c.env.SIMULATION_ENGINE.get(doId);
	const res = await stub.fetch(new Request('http://do/cancel', { method: 'DELETE' }));
	return new Response(res.body, { status: res.status, headers: res.headers });
});

/** WebSocket upgrade for progress streaming */
app.get('/sim/:simId/ws', async (c) => {
	const simId = c.req.param('simId');
	const doId = c.env.SIMULATION_ENGINE.idFromName(simId);
	const stub = c.env.SIMULATION_ENGINE.get(doId);
	return stub.fetch(c.req.raw);
});

export default app;
