<script lang="ts">
	import { VARIABLE_COLORS } from '$utils/colors';

	let { data, id } = $props<{ data: { label: string; type: string; initialValue?: number }; id: string }>();

	const color = $derived(VARIABLE_COLORS[data.type] ?? '#888');
	const isCloud = $derived(data.type === 'source' || data.type === 'sink');
</script>

<div
	class="relative rounded-lg border-2 px-3 py-2 min-w-[100px] text-center shadow-sm transition-shadow hover:shadow-md"
	style="border-color: {color}; background: color-mix(in srgb, {color} 10%, var(--color-card))"
>
	{#if isCloud}
		<!-- Cloud shape indicator -->
		<div class="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-muted border border-border text-[8px] flex items-center justify-center text-muted-foreground">
			{data.type === 'source' ? 'S' : 'K'}
		</div>
	{/if}

	<p class="text-xs font-medium text-foreground truncate">{data.label}</p>

	<p class="text-[10px] text-muted-foreground capitalize mt-0.5">{data.type}</p>

	{#if data.initialValue !== undefined}
		<p class="text-[10px] font-mono text-muted-foreground tabular-nums mt-0.5">
			= {data.initialValue}
		</p>
	{/if}
</div>
