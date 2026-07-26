import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useSmoothedLocation } from '../hooks/useSmoothedLocation';

describe('useSmoothedLocation', () => {
    it('initializes with raw position', () => {
        const { result } = renderHook(() => useSmoothedLocation([10, 20]));
        expect(result.current).toEqual([10, 20]);
    });

    it('smoothes small position changes', () => {
        const { result, rerender } = renderHook(
            ({ pos }) => useSmoothedLocation(pos, 0.5),
            { initialProps: { pos: [10.0, 20.0] } }
        );
        
        // Small move (0.0002 degrees is ~22 meters, well below 500m)
        rerender({ pos: [10.0002, 20.0002] });
        
        // Expected: 10 + 0.5 * (10.0002 - 10) = 10.0001
        expect(result.current[0]).toBeCloseTo(10.0001);
        expect(result.current[1]).toBeCloseTo(20.0001);
    });

    it('snaps immediately on large distance changes', () => {
        const { result, rerender } = renderHook(
            ({ pos }) => useSmoothedLocation(pos, 0.5),
            { initialProps: { pos: [10.0, 20.0] } }
        );
        
        // Massive teleport (simulating spoof or bad GPS bounce) > 500m
        // 1 degree latitude is ~111km, so 0.1 degree is ~11km
        rerender({ pos: [10.1, 20.1] });
        
        expect(result.current[0]).toBe(10.1);
        expect(result.current[1]).toBe(20.1);
    });

    it('handles null position', () => {
        const { result } = renderHook(() => useSmoothedLocation(null));
        expect(result.current).toBeNull();
    });
});
