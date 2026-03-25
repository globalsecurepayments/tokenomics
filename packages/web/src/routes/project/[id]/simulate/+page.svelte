<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { api } from '$utils/api';

	const projectId = $derived(page.params.id);

	let simType = $state<'monte_carlo' | 'abm'>('monte_carlo');
	let running = $state(false);
	let progress = $state(0);
	let simId = $state<string | null>(null);

	// MC config
	let mcIterations = $state(1000);
	let mcTimesteps = $state(365);
	let mcStepUnit = $state('day');
	let mcSeed = $state(42);

	// ABM config
	let abmTimesteps = $state(365);
	let abmSeed = $state(42);
	let agentPops = $state([
		{ type: 'holder', count: 500, buyProb: 0.02, sellProb: 0.01, holdMean: 90, holdStd: 30, stakeProb: 0.1 },
		{ type: 'speculator', count: 200, buyProb: 0.15, sellProb: 0.12, holdMean: 7, holdStd: 5, stakeProb: 0 },
		{ type: 'worker', count: 300, buyProb: 0.05, sellProb: 0.08, holdMean: 14, holdStd: 7, stakeProb: 0 },
		{ type: 'whale', count: 10, buyProb: 0.01, sellProb: 0.005, holdMean: 180, holdStd: 60, stakeProb: 0.3 },
	]);

	async function launchSimulation() {
		running = true;
		progress = 0;

		const config: any = {
			projectId,
			type: simType,
		};

		if (simType === 'monte_carlo') {
			config.iterations = mcIterations;
			config.timesteps = mcTimesteps;
			config.stepUnit = mcStepUnit;
			config.seed = mcSeed;
			config.parameters = [];
		} else {
			config.timesteps = abmTimesteps;
			config.seed = abmSeed;
			config.agentPopulations = agentPops.map(p => ({
				type: p.type,
				count: p.count,
				behavior: {
					buyProbability: p.buyProb,
					sellProbability: p.sellProb,
					holdDuration: { mean: p.holdMean, std: p.holdStd },
					stakeProbability: p.stakeProb || undefined,
				},
			}));
		}

		try {
			const res = await api.post<{ simId: string }>(`/api/projects/${projectId}/simulate`, config);
			simId = res.simId;
			pollProgress();
		} catch (err) {
			console.error('Launch failed:', err);
			running = false;
		}
	}

	async function pollProgress() {
		if (!simId) return;
		try {
			const status = await api.get<{ status: string; progress: number }>(`/api/simulations/sim/${simId}`);
			progress = status.progress;
			if (status.status === 'complete') {
				running = false;
				goto(`/project/${projectId}/results?sim=${simId}`);
			} else if (status.status === 'failed') {
				running = false;
			} else {
				setTimeout(pollProgress, 500);
			}
		} catch {
			setTimeout(pollProgress, 1000);
		}
	}
</script>

<div class="p-6 max-w-3xl mx-auto">
	<h2 class="text-lg font-semibold mb-1">Run Simulation</h2>
	<p class="text-sm text-muted-foreground mb-6">Stress-test your tokenomics model</p>

	<!-- Type selector -->
	<div class="flex gap-2 mb-6">
		<button
			onclick={() => simType = 'monte_carlo'}
			class="px-4 py-2 rounded-md text-sm font-medium transition-colors
				{simType === 'monte_carlo' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}"
		>
			Monte Carlo
		</button>
		<button
			onclick={() => simType = 'abm'}
			class="px-4 py-2 rounded-md text-sm font-medium transition-colors
				{simType === 'abm' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}"
		>
			Agent-Based
		</button>
	</div>

	<div class="rounded-lg border border-border bg-card p-4 space-y-4">
		{#if simType === 'monte_carlo'}
			<div class="grid grid-cols-2 gap-4">
				<label class="space-y-1">
					<span class="text-xs text-muted-foreground">Iterations</span>
					<input type="number" bind:value={mcIterations} min="10" max="100000" class="w-full h-9 rounded-md border border-border bg-secondary px-3 text-sm font-mono tabular-nums text-foreground" />
				</label>
				<label class="space-y-1">
					<span class="text-xs text-muted-foreground">Timesteps</span>
					<input type="number" bind:value={mcTimesteps} min="10" max="10000" class="w-full h-9 rounded-md border border-border bg-secondary px-3 text-sm font-mono tabular-nums text-foreground" />
				</label>
				<label class="space-y-1">
					<span class="text-xs text-muted-foreground">Step Unit</span>
					<select bind:value={mcStepUnit} class="w-full h-9 rounded-md border border-border bg-secondary px-3 text-sm text-foreground">
						<option value="day">Day</option>
						<option value="week">Week</option>
						<option value="month">Month</option>
					</select>
				</label>
				<label class="space-y-1">
					<span class="text-xs text-muted-foreground">Seed</span>
					<input type="number" bind:value={mcSeed} class="w-full h-9 rounded-md border border-border bg-secondary px-3 text-sm font-mono tabular-nums text-foreground" />
				</label>
			</div>
		{:else}
			<div class="grid grid-cols-2 gap-4 mb-4">
				<label class="space-y-1">
					<span class="text-xs text-muted-foreground">Timesteps</span>
					<input type="number" bind:value={abmTimesteps} min="10" max="10000" class="w-full h-9 rounded-md border border-border bg-secondary px-3 text-sm font-mono tabular-nums text-foreground" />
				</label>
				<label class="space-y-1">
					<span class="text-xs text-muted-foreground">Seed</span>
					<input type="number" bind:value={abmSeed} class="w-full h-9 rounded-md border border-border bg-secondary px-3 text-sm font-mono tabular-nums text-foreground" />
				</label>
			</div>

			<h3 class="text-sm font-medium">Agent Populations</h3>
			<div class="rounded border border-border overflow-x-auto">
				<table class="w-full text-xs">
					<thead class="bg-secondary">
						<tr class="text-muted-foreground">
							<th class="px-2 py-1.5 text-left">Type</th>
							<th class="px-2 py-1.5 text-right">Count</th>
							<th class="px-2 py-1.5 text-right">Buy%</th>
							<th class="px-2 py-1.5 text-right">Sell%</th>
							<th class="px-2 py-1.5 text-right">Hold(d)</th>
							<th class="px-2 py-1.5 text-right">Stake%</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-border">
						{#each agentPops as pop}
							<tr class="bg-card">
								<td class="px-2 py-1 capitalize">{pop.type}</td>
								<td class="px-2 py-1"><input type="number" bind:value={pop.count} min="1" class="w-14 text-right bg-transparent font-mono tabular-nums outline-none" /></td>
								<td class="px-2 py-1"><input type="number" bind:value={pop.buyProb} min="0" max="1" step="0.01" class="w-12 text-right bg-transparent font-mono tabular-nums outline-none" /></td>
								<td class="px-2 py-1"><input type="number" bind:value={pop.sellProb} min="0" max="1" step="0.01" class="w-12 text-right bg-transparent font-mono tabular-nums outline-none" /></td>
								<td class="px-2 py-1"><input type="number" bind:value={pop.holdMean} min="1" class="w-12 text-right bg-transparent font-mono tabular-nums outline-none" /></td>
								<td class="px-2 py-1"><input type="number" bind:value={pop.stakeProb} min="0" max="1" step="0.01" class="w-12 text-right bg-transparent font-mono tabular-nums outline-none" /></td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>

	<!-- Launch -->
	<div class="mt-6">
		{#if running}
			<div class="space-y-2">
				<div class="flex items-center justify-between text-sm">
					<span class="text-muted-foreground">Running simulation...</span>
					<span class="font-mono tabular-nums">{progress}%</span>
				</div>
				<div class="w-full h-2 bg-secondary rounded-full overflow-hidden">
					<div class="h-full bg-primary rounded-full transition-all duration-300" style="width: {progress}%"></div>
				</div>
			</div>
		{:else}
			<button
				onclick={launchSimulation}
				class="w-full py-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
			>
				Launch {simType === 'monte_carlo' ? `Monte Carlo (${mcIterations} iterations)` : `ABM (${agentPops.reduce((s, p) => s + p.count, 0)} agents)`}
			</button>
		{/if}
	</div>
</div>
