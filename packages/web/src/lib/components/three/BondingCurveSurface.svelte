<script lang="ts">
	import { T } from '@threlte/core';
	import * as THREE from 'three';
	import { bondingCurvePrice, type BondingCurve } from '@tokenomics/shared';
	import SceneWrapper from './shared/SceneWrapper.svelte';

	let { curve, maxSupply = 1_000_000_000, timeSteps = 12 } = $props<{
		curve: BondingCurve;
		maxSupply?: number;
		timeSteps?: number;
	}>();

	const RES = 60;

	const geometry = $derived.by(() => {
		const geo = new THREE.PlaneGeometry(10, 10, RES - 1, timeSteps - 1);
		const pos = geo.attributes.position;
		const colors = new Float32Array(pos.count * 3);

		let maxPrice = 0;
		for (let i = 0; i < pos.count; i++) {
			const xi = (i % RES) / (RES - 1);
			const supply = xi * maxSupply;
			const price = bondingCurvePrice(curve, supply);
			maxPrice = Math.max(maxPrice, price);
		}

		for (let i = 0; i < pos.count; i++) {
			const xi = (i % RES) / (RES - 1);
			const supply = xi * maxSupply;
			const price = bondingCurvePrice(curve, supply);

			// X = supply, Z = time, Y = price (height)
			const height = maxPrice > 0 ? (price / maxPrice) * 4 : 0;
			pos.setY(i, height);

			// Color gradient: blue (low) → cyan → green → yellow → red (high)
			const t = maxPrice > 0 ? price / maxPrice : 0;
			const color = new THREE.Color();
			color.setHSL(0.6 - t * 0.6, 0.8, 0.5);
			colors[i * 3] = color.r;
			colors[i * 3 + 1] = color.g;
			colors[i * 3 + 2] = color.b;
		}

		geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
		geo.computeVertexNormals();
		return geo;
	});
</script>

<SceneWrapper title="Bonding Curve Surface">
	<T.Mesh rotation.x={-Math.PI / 4} position.y={-1}>
		{#key geometry}
			<T is={geometry} />
		{/key}
		<T.MeshStandardMaterial vertexColors side={THREE.DoubleSide} roughness={0.6} metalness={0.1} />
	</T.Mesh>

	<!-- Grid helper -->
	<T.GridHelper args={[12, 12, '#2a2a3e', '#1a1a2e']} position.y={-2} />
</SceneWrapper>
