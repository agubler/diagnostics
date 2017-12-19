export type SerializedValue = string | number | boolean | undefined | null;

export type SerializedObject<T> = { [P in keyof T]: SerializedValue };

/**
 * A function that takes an object and returns a serialized version of the object
 * @param target An object, where the keys will be converted to a serializeable object
 */
export function serializeObject<P>(target: P): SerializedObject<P> {
	const serialized: { [K in keyof P]: any } = {} as any;
	const keys: (keyof P)[] = Object.keys(target) as any;
	for (let i = 0; i < keys.length; i++) {
		const key = keys[i];
		const value = target[key];
		switch (typeof value) {
			case 'function':
				serialized[key] = `@@function${(value as any).name ? `(${(value as any).name})` : ''}`;
				break;
			case 'object':
				if (value === null) {
					serialized[key] = null;
				} else {
					try {
						serialized[key] = JSON.stringify(value);
					} catch {
						serialized[key] = `@@object${
							value.constructor && (value.constructor as any).name
								? `(${(value.constructor as any).name})`
								: ''
						}`;
					}
				}
				break;
			case 'symbol':
				serialized[key] = `@@symbol(${String(value)})`;
				break;
			default:
				serialized[key] = value;
		}
	}
	return serialized;
}
