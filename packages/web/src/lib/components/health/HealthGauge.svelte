<script lang="ts">
	import type { HealthIndicator } from '@tokenomics/shared';

	let { indicator } = $props<{ indicator: HealthIndicator }>();

	const statusColors: Record<string, { bg: string; text: string; ring: string }> = {
		healthy: { bg: 'bg-success/10', text: 'text-success', ring: 'ring-success/30' },
		warning: { bg: 'bg-warning/10', text: 'text-warning', ring: 'ring-warning/30' },
		critical: { bg: 'bg-destructive/10', text: 'text-destructive', ring: 'ring-destructive/30' },
	};

	const colors = $derived(statusColors[indicator.status] ?? statusColors.healthy);

	// Arc progress (0-1 clamped for visual)
	const normalizedValue = $derived(Math.min(Math.max(indicator.value / (indicator.target * 2), 0), 1));
	const arcAngle = $derived(normalizedValue * 180);
</script>

<div class="rounded-lg border border-border bg-card p-4 ring-1 {colors.ring}">
	<!-- Gauge arc via SVG -->
	<div class="flex justify-center mb-3">
		<svg viewBox="0 0 120 70" class="w-28 h-16">
			<!-- Background arc -->
			<path d="M 10 60 A 50 50 0 0 1 110 60" fill="none" stroke="var(--color-border)" stroke-width="8" stroke-linecap="round" />
			<!-- Value arc -->
			<path
				d="M 10 60 A 50 50 0 0 1 110 60"
				fill="none"
				stroke={indicator.status === 'healthy' ? 'var(--color-success)' : indicator.status === 'warning' ? 'var(--color-warning)' : 'var(--color-destructive)'}
				stroke-width="8"
				stroke-linecap="round"
				stroke-dasharray="{arcAngle * 1.745} 314"
			/>
			<!-- Value text -->
			<text x="60" y="58" text-anchor="middle" class="text-sm font-mono tabular-nums fill-foreground" font-size="16">
				{indicator.value.toFixed(2)}
			</text>
		</svg>
	</div>

	<div class="text-center">
		<p class="text-xs font-medium text-foreground">{indicator.name}</p>
		<p class="text-[10px] text-muted-foreground mt-0.5">Target: {indicator.target}</p>
		<span class="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium capitalize {colors.bg} {colors.text}">
			{indicator.status}
		</span>
	</div>

	<p class="text-[10px] text-muted-foreground text-center mt-2">{indicator.description}</p>
</div>
