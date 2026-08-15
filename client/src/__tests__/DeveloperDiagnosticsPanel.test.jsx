import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import DeveloperDiagnosticsPanel from '../components/DeveloperDiagnosticsPanel';
import React from 'react';

// Mock import.meta.env
vi.stubEnv('PROD', false);

describe('DeveloperDiagnosticsPanel', () => {
    it('does not render a visible toggle button by default (hidden for live demo)', () => {
        render(<DeveloperDiagnosticsPanel isSimulating={false} setIsSimulating={() => {}} />);
        const toggleButton = screen.queryByTitle('Developer Diagnostics');
        expect(toggleButton).toBeNull();
    });

    it('opens panel when shortcut Ctrl+Alt+D is pressed', () => {
        render(<DeveloperDiagnosticsPanel isSimulating={false} setIsSimulating={() => {}} />);
        fireEvent.keyDown(window, { key: 'd', ctrlKey: true, altKey: true });
        expect(screen.getByText('Diagnostics Panel')).toBeInTheDocument();
        expect(screen.getByText('ENABLE SIMULATION')).toBeInTheDocument();
    });

    it('shows simulation active state', () => {
        render(<DeveloperDiagnosticsPanel isSimulating={true} setIsSimulating={() => {}} />);
        fireEvent.keyDown(window, { key: 'd', ctrlKey: true, altKey: true });
        expect(screen.getByText('SIMULATION ACTIVE')).toBeInTheDocument();
        expect(screen.getByText('Click map or enter GPS coordinates manually')).toBeInTheDocument();
    });

    it('shows observation data when provided', () => {
        const obsData = {
            observation: { phase: 'observing', trackPresence: 'yes' },
            awareness: { status: 'UNKNOWN' },
            trains: [],
            corridor: {
                resolutionStatus: 'UNRESOLVED',
                nearestBoundingStations: null,
                userSegmentFraction: 0.5,
                stationResolutionDetails: { status: 'UNRESOLVED' }
            }
        };

        render(<DeveloperDiagnosticsPanel isSimulating={false} setIsSimulating={() => {}} observationData={obsData} />);
        fireEvent.keyDown(window, { key: 'd', ctrlKey: true, altKey: true });

        expect(screen.getByText(/Phase: UNAVAILABLE/i)).toBeInTheDocument();
        expect(screen.getByText(/Provider Diagnostics/)).toBeInTheDocument();
    });

    it('shows simulated position when active', () => {
        render(<DeveloperDiagnosticsPanel isSimulating={true} setIsSimulating={() => {}} simulatedPosition={[10.5, 20.5]} />);
        fireEvent.keyDown(window, { key: 'd', ctrlKey: true, altKey: true });
        expect(screen.getByDisplayValue('10.5')).toBeInTheDocument();
        expect(screen.getByDisplayValue('20.5')).toBeInTheDocument();
    });

    it('validates coordinates on apply', () => {
        const onApplyCoordinates = vi.fn();
        render(<DeveloperDiagnosticsPanel isSimulating={true} setIsSimulating={() => {}} onApplyCoordinates={onApplyCoordinates} />);
        fireEvent.keyDown(window, { key: 'd', ctrlKey: true, altKey: true });
        const latInput = screen.getByPlaceholderText('Latitude');
        const lngInput = screen.getByPlaceholderText('Longitude');
        const applyBtn = screen.getByText('APPLY COORDINATES');

        // Test invalid latitude
        fireEvent.change(latInput, { target: { value: '95' } });
        fireEvent.change(lngInput, { target: { value: '75' } });
        fireEvent.click(applyBtn);
        expect(screen.getByText('Latitude must be between -90 and 90.')).toBeInTheDocument();
        expect(onApplyCoordinates).not.toHaveBeenCalled();

        // Test invalid longitude
        fireEvent.change(latInput, { target: { value: '26' } });
        fireEvent.change(lngInput, { target: { value: '190' } });
        fireEvent.click(applyBtn);
        expect(screen.getByText('Longitude must be between -180 and 180.')).toBeInTheDocument();
        expect(onApplyCoordinates).not.toHaveBeenCalled();

        // Test valid coordinates
        fireEvent.change(latInput, { target: { value: '26.9205' } });
        fireEvent.change(lngInput, { target: { value: '75.7876' } });
        fireEvent.click(applyBtn);
        expect(screen.queryByText(/must be between/)).not.toBeInTheDocument();
        expect(onApplyCoordinates).toHaveBeenCalledWith([26.9205, 75.7876]);
    });

    it('triggers onApplyCoordinates when identical coordinates are applied', () => {
        const onApplyCoordinates = vi.fn();
        render(
            <DeveloperDiagnosticsPanel
                isSimulating={true}
                setIsSimulating={() => {}}
                onApplyCoordinates={onApplyCoordinates}
                simulatedPosition={[26, 75]}
            />
        );
        fireEvent.keyDown(window, { key: 'd', ctrlKey: true, altKey: true });

        const applyBtn = screen.getByText('APPLY COORDINATES');

        // Typing exactly the same numbers currently in simulatedPosition
        const latInput = screen.getByPlaceholderText('Latitude');
        const lngInput = screen.getByPlaceholderText('Longitude');

        fireEvent.change(latInput, { target: { value: '26.0' } });
        fireEvent.change(lngInput, { target: { value: '75.00' } });
        fireEvent.click(applyBtn);

        // It should call onApplyCoordinates to force a new reference update and pipeline refresh
        expect(onApplyCoordinates).toHaveBeenCalledWith([26, 75]);
    });

    it('submits on Enter key', () => {
        const onApplyCoordinates = vi.fn();
        render(<DeveloperDiagnosticsPanel isSimulating={true} setIsSimulating={() => {}} simulatedPosition={[10, 20]} onApplyCoordinates={onApplyCoordinates} />);
        fireEvent.keyDown(window, { key: 'd', ctrlKey: true, altKey: true });
        const latInput = screen.getByPlaceholderText('Latitude');
        const lngInput = screen.getByPlaceholderText('Longitude');

        fireEvent.change(latInput, { target: { value: '15' } });
        fireEvent.change(lngInput, { target: { value: '30' } });
        fireEvent.keyDown(latInput, { key: 'Enter', code: 'Enter' });

        expect(onApplyCoordinates).toHaveBeenCalledWith([15, 30]);
    });

    it('preserves decimal editing while active and allows sync after blur', () => {
        const { rerender } = render(<DeveloperDiagnosticsPanel isSimulating={true} setIsSimulating={() => {}} simulatedPosition={[10.5, 20.5]} />);
        fireEvent.keyDown(window, { key: 'd', ctrlKey: true, altKey: true });
        const latInput = screen.getByPlaceholderText('Latitude');

        fireEvent.focus(latInput);
        fireEvent.change(latInput, { target: { value: '10.' } });
        expect(latInput.value).toBe('10.');

        fireEvent.blur(latInput);

        rerender(<DeveloperDiagnosticsPanel isSimulating={true} setIsSimulating={() => {}} simulatedPosition={[15, 25]} />);

        expect(latInput.value).toBe('15');
    });
});
