import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './env';
import projects from './routes/projects';
import models from './routes/models';
import simulations from './routes/simulations';

export { ProjectState } from './durable-objects/project-state';
export { SimulationEngine } from './durable-objects/simulation-engine';

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors({
	origin: '*',
	allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
	allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));

app.get('/api/health', (c) => {
	return c.json({
		status: 'ok',
		service: 'tokenomics-lab',
		timestamp: Date.now()
	});
});

app.route('/api/projects', projects);
app.route('/api/projects', models);
app.route('/api/projects', simulations);
app.route('/api/simulations', simulations);

export default app;
