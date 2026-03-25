/**
 * Quantity Theory of Money for token valuation.
 * M × V = P × Q
 * Where:
 *   M = token supply (market cap proxy)
 *   V = velocity (how often tokens change hands per period)
 *   P = price of digital resource
 *   Q = quantity of resource provided
 */

/** Calculate required market cap: M = P × Q / V */
export function requiredMarketCap(resourcePrice: number, resourceQuantity: number, velocity: number): number {
	if (velocity <= 0) return Infinity;
	return (resourcePrice * resourceQuantity) / velocity;
}

/** Calculate implied token price: price = M / circulatingSupply */
export function impliedTokenPrice(marketCap: number, circulatingSupply: number): number {
	if (circulatingSupply <= 0) return 0;
	return marketCap / circulatingSupply;
}

/** Calculate velocity from observed data */
export function observedVelocity(
	transactionVolume: number,
	averageNetworkValue: number
): number {
	if (averageNetworkValue <= 0) return 0;
	return transactionVolume / averageNetworkValue;
}

/** Calculate impact of velocity reduction mechanisms (staking, burn-and-mint) */
export function effectiveVelocity(
	baseVelocity: number,
	stakingRatio: number,
	burnRate: number
): number {
	const holdFactor = 1 - stakingRatio;
	const burnFactor = 1 - burnRate;
	return baseVelocity * holdFactor * burnFactor;
}
