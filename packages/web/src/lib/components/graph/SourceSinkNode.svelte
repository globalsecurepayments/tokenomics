<script lang="ts">
	import { Handle, Position } from '@xyflow/svelte';

	let { data } = $props<{ data: { label: string; isSource: boolean } }>();
</script>

<div class="relative flex items-center justify-center w-16 h-12">
	{#if data.isSource}
		<Handle type="source" position={Position.Right} class="!bg-source !w-2 !h-2" />
	{:else}
		<Handle type="target" position={Position.Left} class="!bg-sink !w-2 !h-2" />
	{/if}

	<!-- Cloud shape via CSS -->
	<div class="w-14 h-10 rounded-full bg-muted/40 border border-border/50 flex items-center justify-center relative">
		<div class="absolute -top-1 left-2 w-6 h-5 rounded-full bg-muted/40 border border-border/50"></div>
		<div class="absolute -top-2 right-3 w-5 h-4 rounded-full bg-muted/40 border border-border/50"></div>
		<span class="text-[9px] font-mono text-muted-foreground z-10 relative">{data.label}</span>
	</div>
</div>
