import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useMarkerAnimation } from '../hooks/useMarkerAnimation';

describe('useMarkerAnimation', () => {
    it('initializes with raw position', () => {
        const { result } = renderHook(() => useMarkerAnimation([10, 20]));
        expect(result.current).toEqual([10, 20]);
    });

    it('applies EMA for subsequent updates', () => {
        const { result, rerender } = renderHook(
            (props) => useMarkerAnimation(props.pos, 0.5),
            { initialProps: { pos: [10.0000, 20.0000] } }
        );

        act(() => {
            rerender({ pos: [10.0001, 20.0001] });
        });

        // Current = [10.0000, 20.0000]
        // Target  = [10.0001, 20.0001]
        // Factor  = 0.5
        // New     = [10.00005, 20.00005]
        expect(result.current[0]).toBeCloseTo(10.00005, 6);
        expect(result.current[1]).toBeCloseTo(20.00005, 6);
    });

    it('handles null position', () => {
        const { result } = renderHook(() => useMarkerAnimation(null));
        expect(result.current).toBeNull();
    });

    it('processes a continuous walk sequence correctly', () => {
        // ~1m steps
        const step1 = [28.6261811, 77.2407131];
        const step2 = [28.6261901, 77.2407131];
        const step3 = [28.6261991, 77.2407131];
        const step4 = [28.6262081, 77.2407131];
        
        const { result, rerender } = renderHook(
            (props) => useMarkerAnimation(props.pos, 0.5),
            { initialProps: { pos: step1 } }
        );

        expect(result.current).toEqual(step1); // Initial snap

        const previousValues = [result.current];

        // Step 2
        act(() => { rerender({ pos: step2 }); });
        expect(result.current).not.toEqual(previousValues[0]); // Changed (no freeze)
        expect(result.current).not.toEqual(step2); // Lags smoothly behind raw value
        expect(result.current[0]).toBeGreaterThan(previousValues[0][0]); // Converging toward target
        expect(result.current[0]).toBeLessThan(step2[0]);
        previousValues.push(result.current);

        // Step 3
        act(() => { rerender({ pos: step3 }); });
        expect(result.current).not.toEqual(previousValues[1]);
        expect(result.current).not.toEqual(step3);
        expect(result.current[0]).toBeGreaterThan(previousValues[1][0]);
        expect(result.current[0]).toBeLessThan(step3[0]);
        previousValues.push(result.current);

        // Step 4
        act(() => { rerender({ pos: step4 }); });
        expect(result.current).not.toEqual(previousValues[2]);
        expect(result.current).not.toEqual(step4);
        expect(result.current[0]).toBeGreaterThan(previousValues[2][0]);
        expect(result.current[0]).toBeLessThan(step4[0]);
    });
});
