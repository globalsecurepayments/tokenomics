/**
 * Seeded pseudo-random number generator (xoshiro128**).
 * Deterministic: same seed → same sequence. Essential for reproducible simulations.
 */
export class SeededRNG {
	private s: Uint32Array;

	constructor(seed: number) {
		this.s = new Uint32Array(4);
		this.s[0] = seed >>> 0;
		this.s[1] = (seed * 1812433253 + 1) >>> 0;
		this.s[2] = (this.s[1] * 1812433253 + 1) >>> 0;
		this.s[3] = (this.s[2] * 1812433253 + 1) >>> 0;
		for (let i = 0; i < 20; i++) this.next();
	}

	next(): number {
		const s = this.s;
		const result = Math.imul(s[1] * 5, 7) >>> 0;
		const t = s[1] << 9;
		s[2] ^= s[0];
		s[3] ^= s[1];
		s[1] ^= s[2];
		s[0] ^= s[3];
		s[2] ^= t;
		s[3] = (s[3] << 11) | (s[3] >>> 21);
		return (result >>> 0) / 4294967296;
	}

	/** Uniform random in [min, max) */
	uniform(min: number, max: number): number {
		return min + this.next() * (max - min);
	}

	/** Normal distribution via Box-Muller transform */
	normal(mean: number, std: number): number {
		const u1 = this.next();
		const u2 = this.next();
		const z = Math.sqrt(-2 * Math.log(u1 || 1e-10)) * Math.cos(2 * Math.PI * u2);
		return mean + z * std;
	}

	/** Log-normal distribution */
	lognormal(mu: number, sigma: number): number {
		return Math.exp(this.normal(mu, sigma));
	}

	/** Triangular distribution */
	triangular(min: number, mode: number, max: number): number {
		const u = this.next();
		const fc = (mode - min) / (max - min);
		if (u < fc) {
			return min + Math.sqrt(u * (max - min) * (mode - min));
		}
		return max - Math.sqrt((1 - u) * (max - min) * (max - mode));
	}
}
