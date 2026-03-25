<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { api } from '$utils/api';
	import CLDEditor from '$components/graph/CLDEditor.svelte';
	import type { CLDModel } from '@tokenomics/shared';

	const projectId = $derived(page.params.id);
	let model = $state<CLDModel>({ variables: [], links: [], loops: [] });
	let loading = $state(true);
	let saving = $state(false);
	let lastSaved = $state<string | null>(null);

	onMount(async () => {
		try {
			const data = await api.get<CLDModel>(`/api/projects/${projectId}/cld`);
			model = data;
		} catch {
			// New project — start with empty CLD
		} finally {
			loading = false;
		}
	});

	async function handleSave(updated: CLDModel) {
		saving = true;
		try {
			await api.put(`/api/projects/${projectId}/cld`, updated);
			model = updated;
			lastSaved = new Date().toLocaleTimeString();
		} catch (err) {
			console.error('Failed to save CLD:', err);
		} finally {
			saving = false;
		}
	}
</script>

<div class="h-full flex flex-col">
	{#if saving}
		<div class="absolute top-2 right-4 z-10 text-xs text-muted-foreground animate-pulse">
			Saving...
		</div>
	{:else if lastSaved}
		<div class="absolute top-2 right-4 z-10 text-xs text-muted-foreground">
			Saved {lastSaved}
		</div>
	{/if}

	{#if loading}
		<div class="flex-1 flex items-center justify-center text-sm text-muted-foreground">
			Loading causal loop diagram...
		</div>
	{:else}
		<CLDEditor bind:model onSave={handleSave} />
	{/if}
</div>
