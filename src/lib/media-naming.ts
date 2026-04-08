/**
 * Media filename naming helpers.
 */

/**
 * Returns true if the filename matches the in-use image naming convention,
 * e.g. `myproject_inuse_1700000000000.webp`.
 */
export function isInUseImage(filename: string): boolean {
  return /_inuse[_\.]/i.test(filename)
}
