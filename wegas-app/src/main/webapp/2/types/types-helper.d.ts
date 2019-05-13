/**
 * Remove specified keys.
 */
type Omit<Type, Keys extends keyof Type> = Pick<
  Type,
  Exclude<keyof Type, Keys>
>;

/**
 * Make specified key optional. Others don't change.
 */
type PartialKey<Type, Keys extends keyof Type> = Omit<Type, Keys> &
  Partial<Pick<Type, Keys>>;
/**
 * Merge two type into a new one.
 * Keys of the second type overrides the ones of the first type.
 */
type Merge<A, B> = Omit<A, Extract<keyof A, keyof B>> & B;
