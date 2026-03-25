<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { api } from '$utils/api';
	import VestingScheduleBuilder from '$components/vesting/VestingScheduleBuilder.svelte';
	import type { VestingSchedule } from '@tokenomics/shared';

	const projectId = $derived(page.params.id);
	let schedules = $state<VestingSchedule[]>([]);
	let loading = $state(true);

	onMount(async () => {
		try {
			const data = await api.get<VestingSchedule[]>(`/api/projects/${projectId}/vesting`);
			if (Array.isArray(data)) schedules = data;
		} catch { /* defaults */ }
		finally { loading = false; }
	});

	async function handleSave(updated: VestingSchedule[]) {
		await api.put(`/api/projects/${projectId}/vesting`, updated);
		schedules = updated;
	}
</script>

<div class="p-6 max-w-4xl mx-auto">
	<h2 class="text-lg font-semibold mb-1">Vesting Schedules</h2>
	<p class="text-sm text-muted-foreground mb-6">Define token unlock timelines per category</p>
	{#if loading}
		<p class="text-sm text-muted-foreground">Loading...</p>
	{:else}
		<VestingScheduleBuilder bind:schedules onSave={handleSave} />
	{/if}
</div>
