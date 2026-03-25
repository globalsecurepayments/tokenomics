<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { api } from '$utils/api';
	import BondingCurveDesigner from '$components/curves/BondingCurveDesigner.svelte';
	import EmissionCurveDesigner from '$components/curves/EmissionCurveDesigner.svelte';
	import type { BondingCurve, EmissionSchedule } from '@tokenomics/shared';

	const projectId = $derived(page.params.id);

	let bondingCurve = $state<BondingCurve>({
		id: 'default', type: 'linear', params: { slope: 0.001, intercept: 0.1 }
	});
	let emissionSchedule = $state<EmissionSchedule>({
		id: 'default', type: 'linear', params: { totalEmission: 500_000_000, durationMonths: 48 }
	});
	let loading = $state(true);
	let activeTab = $state<'bonding' | 'emission'>('bonding');

	onMount(async () => {
		try {
			const [curves, emissions] = await Promise.all([
				api.get<BondingCurve[]>(`/api/projects/${projectId}/bonding-curve`).catch(() => []),
				api.get<EmissionSchedule[]>(`/api/projects/${projectId}/emission`).catch(() => []),
			]);
			if (Array.isArray(curves) && curves.length > 0) bondingCurve = curves[0];
			if (Array.isArray(emissions) && emissions.length > 0) emissionSchedule = emissions[0];
		} catch { /* defaults */ }
		finally { loading = false; }
	});

	async function saveBondingCurve(curve: BondingCurve) {
		await api.put(`/api/projects/${projectId}/bonding-curve`, [curve]);
	}

	async function saveEmission(schedule: EmissionSchedule) {
		await api.put(`/api/projects/${projectId}/emission`, [schedule]);
	}
</script>

<div class="p-6 max-w-4xl mx-auto">
	{#if loading}
		<p class="text-sm text-muted-foreground">Loading curves...</p>
	{:else}
		<!-- Tab toggle -->
		<div class="flex gap-2 mb-6">
			<button
				onclick={() => activeTab = 'bonding'}
				class="px-4 py-2 rounded-md text-sm font-medium transition-colors
					{activeTab === 'bonding' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}"
			>
				Bonding Curve
			</button>
			<button
				onclick={() => activeTab = 'emission'}
				class="px-4 py-2 rounded-md text-sm font-medium transition-colors
					{activeTab === 'emission' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}"
			>
				Emission Schedule
			</button>
		</div>

		{#if activeTab === 'bonding'}
			<BondingCurveDesigner bind:curve={bondingCurve} onSave={saveBondingCurve} />
		{:else}
			<EmissionCurveDesigner bind:schedule={emissionSchedule} onSave={saveEmission} />
		{/if}
	{/if}
</div>
