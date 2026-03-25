<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { api } from '$utils/api';
	import AllocationEditor from '$components/allocation/AllocationEditor.svelte';
	import type { Allocation } from '@tokenomics/shared';

	const projectId = $derived(page.params.id);
	let allocations = $state<Allocation[]>([]);
	let loading = $state(true);

	onMount(async () => {
		try {
			const data = await api.get<Allocation[]>(`/api/projects/${projectId}/allocation`);
			if (Array.isArray(data)) allocations = data;
		} catch { /* defaults */ }
		finally { loading = false; }
	});

	async function handleSave(updated: Allocation[]) {
		await api.put(`/api/projects/${projectId}/allocation`, updated);
		allocations = updated;
	}
</script>

<div class="p-6 max-w-4xl mx-auto">
	<h2 class="text-lg font-semibold mb-1">Token Allocation</h2>
	<p class="text-sm text-muted-foreground mb-6">Define how total supply is distributed</p>
	{#if loading}
		<p class="text-sm text-muted-foreground">Loading...</p>
	{:else}
		<AllocationEditor bind:allocations onSave={handleSave} />
	{/if}
</div>
