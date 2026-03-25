<script lang="ts">
	import { Canvas } from '@threlte/core';
	import { OrbitControls } from '@threlte/extras';
	import { T } from '@threlte/core';

	let { children, title = '' } = $props<{ children: any; title?: string }>();
</script>

<div class="rounded-lg border border-border bg-card overflow-hidden h-full relative">
	{#if title}
		<div class="absolute top-2 left-3 z-10 text-xs font-medium text-muted-foreground bg-card/80 px-2 py-0.5 rounded">
			{title}
		</div>
	{/if}
	<Canvas>
		<T.PerspectiveCamera makeDefault position={[0, 5, 10]} fov={60}>
			<OrbitControls enableDamping autoRotate autoRotateSpeed={0.3} />
		</T.PerspectiveCamera>

		<T.AmbientLight intensity={0.4} />
		<T.DirectionalLight position={[5, 10, 5]} intensity={0.8} />

		{@render children()}
	</Canvas>
</div>
