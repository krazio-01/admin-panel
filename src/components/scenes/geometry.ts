import type { BufferGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function mergeAndDispose(parts: BufferGeometry[]): BufferGeometry {
    const isMixed = parts.some((part) => part.index === null);
    const compatible = isMixed
        ? parts.map((part) => (part.index ? part.toNonIndexed() : part))
        : parts;
    const merged = mergeGeometries(compatible);

    for (const part of new Set([...parts, ...compatible])) part.dispose();

    return merged;
}
