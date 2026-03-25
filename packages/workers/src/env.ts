export interface Env {
	PROJECT_STATE: DurableObjectNamespace;
	SIMULATION_ENGINE: DurableObjectNamespace;
	SIM_RESULTS: R2Bucket;
	TEMPLATES: KVNamespace;
	ENVIRONMENT: string;
	ADMIN_KEY: string;
}
