<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { api } from '$utils/api';
	import type { CLDModel, BondingCurve, EmissionSchedule } from '@tokenomics/shared';

	// Lazy-load 3D components (SSR-unsafe)
	import { browser } from '$app/environment';

	const projectId = $derived(page.params.id);

	let activeScene = $state<'cld' | 'bonding' | 'emission' | 'flow' | 'agents' | 'montecarlo'>('bonding');
	let loading = $state(true);

	// Model data
	let cld = $state<CLDModel>({ variables: [], links: [], loops: [] });
	let bondingCurve = $state<BondingCurve>({ id: 'default', type: 'linear', params: { slope: 0.001, intercept: 0.1 } });
	let emissionSchedules = $state<EmissionSchedule[]>([]);
	let simResults = $state<any>(null);

	onMount(async () => {
		try {
			const full = await api.get<any>(`/api/projects/${projectId}`);
			if (full.cld) cld = full.cld;
			if (full.bondingCurves?.length) bondingCurve = full.bondingCurves[0];
			if (full.emissionSchedules?.length) emissionSchedules = full.emissionSchedules;
		} catch { /* use defaults */ }
		finally { loading = false; }
	});

	const scenes = [
		{ id: 'bonding', label: 'Bonding Curve' },
		{ id: 'emission', label: 'Emission Landscape' },
		{ id: 'cld', label: 'Causal Loops 3D' },
		{ id: 'flow', label: 'Token Flow' },
		{ id: 'agents', label: 'Agent Swarm' },
		{ id: 'montecarlo', label: 'Monte Carlo Cloud' },
	] as const;
</script>

<div class="flex flex-col h-full">
	<!-- Scene selector -->
	<div class="flex items-center gap-1.5 px-4 py-2 border-b border-border bg-card shrink-0 overflow-x-auto">
		{#each scenes as scene}
			<button
				onclick={() => activeScene = scene.id}
				class="px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors
					{activeScene === scene.id ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}"
			>
				{scene.label}
			</button>
		{/each}
	</div>

	<!-- 3D scene -->
	<div class="flex-1 min-h-[400px]">
		{#if loading}
			<div class="flex items-center justify-center h-full text-sm text-muted-foreground">Loading model data...</div>
		{:else if browser}
			{#if activeScene === 'bonding'}
				{#await import('$components/three/BondingCurveSurface.svelte') then { default: BondingCurveSurface }}
					<BondingCurveSurface curve={bondingCurve} />
				{/await}
			{:else if activeScene === 'emission'}
				{#await import('$components/three/EmissionLandscape.svelte') then { default: EmissionLandscape }}
					<EmissionLandscape schedules={emissionSchedules} />
				{/await}
			{:else if activeScene === 'cld'}
				{#await import('$components/three/CLD3DScene.svelte') then { default: CLD3DScene }}
					<CLD3DScene model={cld} />
				{/await}
			{:else if activeScene === 'flow'}
				{#await import('$components/three/TokenFlowScene.svelte') then { default: TokenFlowScene }}
					<TokenFlowScene
						stocks={cld.variables.filter(v => v.type === 'stock').map(v => ({ id: v.id, label: v.label, value: v.initialValue ?? 0 }))}
						flows={[]}
					/>
				{/await}
			{:else if activeScene === 'agents'}
				{#await import('$components/three/AgentSwarmScene.svelte') then { default: AgentSwarmScene }}
					<AgentSwarmScene snapshots={simResults?.agentSnapshots ?? []} />
				{/await}
			{:else if activeScene === 'montecarlo'}
				{#await import('$components/three/MonteCarloCloud.svelte') then { default: MonteCarloCloud }}
					<MonteCarloCloud iterations={simResults?.iterations ?? []} />
				{/await}
			{/if}
		{:else}
			<div class="flex items-center justify-center h-full text-sm text-muted-foreground">3D requires browser rendering</div>
		{/if}
	</div>
</div>
