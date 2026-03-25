<script lang="ts">
	import { Handle, Position } from '@xyflow/svelte';
	import { formatCompact } from '$utils/format';

	let { data } = $props<{ data: { label: string; initialValue: number; equation?: string } }>();
</script>

<div class="relative rounded border-2 border-stock bg-[color-mix(in_srgb,var(--color-stock)_8%,var(--color-card))] min-w-[120px] shadow-sm">
	<Handle type="target" position={Position.Left} class="!bg-stock !w-2 !h-2" />
	<Handle type="source" position={Position.Right} class="!bg-stock !w-2 !h-2" />

	<div class="px-3 py-2">
		<p class="text-xs font-medium text-foreground">{data.label}</p>
		<p class="text-[10px] font-mono text-muted-foreground tabular-nums mt-0.5">
			{formatCompact(data.initialValue)}
		</p>
		{#if data.equation}
			<p class="text-[9px] font-mono text-muted-foreground/60 mt-0.5 truncate max-w-[140px]">
				{data.equation}
			</p>
		{/if}
	</div>
</div>
