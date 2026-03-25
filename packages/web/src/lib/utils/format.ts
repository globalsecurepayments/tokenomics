const compactFormatter = new Intl.NumberFormat('en-US', {
	notation: 'compact',
	maximumFractionDigits: 2
});

const preciseFormatter = new Intl.NumberFormat('en-US', {
	maximumFractionDigits: 6
});

export function formatCompact(n: number): string {
	return compactFormatter.format(n);
}

export function formatPrecise(n: number): string {
	return preciseFormatter.format(n);
}

export function formatPercent(n: number, decimals = 1): string {
	return `${n.toFixed(decimals)}%`;
}

export function formatCurrency(n: number): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		notation: n > 1_000_000 ? 'compact' : 'standard',
		maximumFractionDigits: 2
	}).format(n);
}
