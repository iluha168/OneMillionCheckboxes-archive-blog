const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_'.split('')
const map: Record<string, number> = {};
let seed = 0
let prev: string;

/**
 * Return a string representing the specified number.
 *
 * @param {Number} num The number to convert.
 * @returns {String} The string representation of the number.
 * @api public
 */
export function encode(num: number): string {
    let encoded = '';
    do {
        encoded = alphabet[num % alphabet.length] + encoded;
        num = Math.floor(num / alphabet.length);
    } while (num > 0);
    return encoded;
}
/**
 * Return the integer value specified by the given string.
 *
 * @param {String} str The string to convert.
 * @returns {Number} The integer value represented by the string.
 * @api public
 */
export function decode(str: string): number {
    let decoded = 0;
    for (let i = 0; i < str.length; i++) {
        decoded = decoded * alphabet.length + map[str.charAt(i)];
    }
    return decoded;
}
/**
 * Yeast: A tiny growing id generator.
 *
 * @returns {String} A unique id.
 * @api public
 */
export function yeast(): string {
    const now = encode(+new Date());
    if (now !== prev)
        return seed = 0, prev = now;
    return now + '.' + encode(seed++);
}
//
// Map each character to its index.
//
for (let i = 0; i < alphabet.length; i++)
    map[alphabet[i]] = i;
