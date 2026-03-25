<script lang="ts">
	import { T } from '@threlte/core';
	import * as THREE from 'three';
	import { cumulativeEmission, type EmissionSchedule } from '@tokenomics/shared';
	import SceneWrapper from './shared/SceneWrapper.svelte';

	let { schedules = [] } = $props<{ schedules: EmissionSchedule[] }>();

	const RES_X = 80; // time axis
	const RES_Z = Math.max(schedules.length * 4, 8); // schedule variants axis

	const geometry = $derived.by(() => {
		if (schedules.length === 0) return null;

		const geo = new THREE.PlaneGeometry(10, 6, RES_X - 1, RES_Z - 1);
		const pos = geo.attributes.position;
		const colors = new Float32Array(pos.count * 3);

		type Sched = typeof schedules[0];
		const maxDuration = Math.max(...schedules.map((s: Sched) => s.params.durationMonths));
		const maxEmission = Math.max(...schedules.map((s: Sched) => s.params.totalEmission));

		for (let i = 0; i < pos.count; i++) {
			const xi = (i % RES_X) / (RES_X - 1);
			const zi = Math.floor(i / RES_X) / (RES_Z - 1);
			const month = xi * maxDuration;

			// Interpolate between schedules for the Z axis
			const scheduleIdx = zi * (schedules.length - 1);
			const lower = Math.floor(scheduleIdx);
			const upper = Math.min(lower + 1, schedules.length - 1);
			const frac = scheduleIdx - lower;

			const emLower = cumulativeEmission(schedules[lower], month);
			const emUpper = cumulativeEmission(schedules[upper], month);
			const emission = emLower + frac * (emUpper - emLower);

			const height = maxEmission > 0 ? (emission / maxEmission) * 3 : 0;
			pos.setY(i, height);

			const t = maxEmission > 0 ? emission / maxEmission : 0;
			const color = new THREE.Color();
			color.setHSL(0.55 - t * 0.4, 0.7, 0.45 + t * 0.15);
			colors[i * 3] = color.r;
			colors[i * 3 + 1] = color.g;
			colors[i * 3 + 2] = color.b;
		}

		geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
		geo.computeVertexNormals();
		return geo;
	});
</script>

<SceneWrapper title="Emission Landscape">
	{#if geometry}
		<T.Mesh rotation.x={-Math.PI / 3.5} position.y={-1}>
			{#key geometry}
				<T is={geometry} />
			{/key}
			<T.MeshStandardMaterial vertexColors side={THREE.DoubleSide} roughness={0.5} metalness={0.1} />
		</T.Mesh>
	{:else}
		<T.Mesh>
			<T.BoxGeometry args={[2, 0.1, 2]} />
			<T.MeshStandardMaterial color="#2a2a3e" />
		</T.Mesh>
	{/if}

	<T.GridHelper args={[12, 12, '#2a2a3e', '#1a1a2e']} position.y={-2} />
</SceneWrapper>
