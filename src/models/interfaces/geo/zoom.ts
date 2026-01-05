/**
 * Utility type to create a union type of numbers from 0 to N-1
 * @example
 * type ZoomLevel = Enumerate<23>; // results in union type 0 | 1 | 2 | ... | 22
 * @template N - The upper limit (exclusive) for the enumeration
 * @template Acc - Accumulator for building the tuple of numbers
 */
export type Enumerate<N extends number, Acc extends number[] = []> = Acc['length'] extends N ? Acc[number] : Enumerate<N, [...Acc, Acc['length']]>;

/**
 * Zoom level type representing integer values from 0 to 22
 */
// eslint-disable-next-line @typescript-eslint/no-magic-numbers
export type ZoomLevel = Enumerate<23>; // 0 to 22
