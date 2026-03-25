<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { api } from '$utils/api';
	import StockFlowEditor from '$components/graph/StockFlowEditor.svelte';
	import type { StockFlowModel } from '@tokenomics/shared';

	const projectId = $derived(page.params.id);
	let model = $state<StockFlowModel>({ stocks: [], flows: [], converters: [] });
	let loading = $state(true);
	let saving = $state(false);

	onMount(async () => {
		try {
			const data = await api.get<StockFlowModel>(`/api/projects/${projectId}/stock-flow`);
			model = data;
		} catch { /* empty model */ }
		finally { loading = false; }
	});

	async function handleSave(updated: StockFlowModel) {
		saving = true;
		try {
			await api.put(`/api/projects/${projectId}/stock-flow`, updated);
			model = updated;
		} catch (err) { console.error('Save failed:', err); }
		finally { saving = false; }
	}
</script>

<div class="h-full flex flex-col relative">
	{#if saving}
		<div class="absolute top-2 right-4 z-10 text-xs text-muted-foreground animate-pulse">Saving...</div>
	{/if}
	{#if loading}
		<div class="flex-1 flex items-center justify-center text-sm text-muted-foreground">Loading stock-flow model...</div>
	{:else}
		<StockFlowEditor bind:model onSave={handleSave} />
	{/if}
</div>
