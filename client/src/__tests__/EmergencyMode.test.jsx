import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import GuidedEmergencyMode from '../components/GuidedEmergencyMode';
import React from 'react';

// GuidedEmergencyMode always renders (it is triggered only when the button in LiveMapPage
// is pressed; null-guarding is handled at the call-site via conditional rendering).
// These tests verify the component's own null-safe rendering for its data fields.

describe('GuidedEmergencyMode', () => {
    it('renders the emergency guidance heading', () => {
        render(
            <GuidedEmergencyMode
                awarenessData={null}
                rawPosition={null}
                onClose={() => {}}
            />
        );
        expect(screen.getAllByText(/EMERGENCY/i)[0]).toBeInTheDocument();
    });

    it('shows waiting-for-GPS message when rawPosition is null', () => {
        render(
            <GuidedEmergencyMode
                awarenessData={null}
                rawPosition={null}
                onClose={() => {}}
            />
        );
        expect(screen.getByText(/Waiting for GPS/i)).toBeInTheDocument();
    });

    it('shows formatted coordinates when rawPosition is provided', () => {
        render(
            <GuidedEmergencyMode
                awarenessData={null}
                rawPosition={[51.50853, -0.12574]}
                onClose={() => {}}
            />
        );
        expect(screen.getByText(/51\.50853/)).toBeInTheDocument();
    });

    it('renders nearest-track text with valid crossTrackDistanceMetres', () => {
        const data = {
            awareness: {
                nearbyTracks: [{ crossTrackDistanceMetres: 42 }]
            }
        };
        render(
            <GuidedEmergencyMode
                awarenessData={data}
                rawPosition={null}
                onClose={() => {}}
            />
        );
        expect(screen.getByText(/approximately 42m away/i)).toBeInTheDocument();
    });

    it('renders "distance unknown" when crossTrackDistanceMetres is null', () => {
        const data = {
            awareness: {
                nearbyTracks: [{ crossTrackDistanceMetres: null }]
            }
        };
        render(
            <GuidedEmergencyMode
                awarenessData={data}
                rawPosition={null}
                onClose={() => {}}
            />
        );
        // Should not produce NaN; should show 'distance unknown'
        expect(screen.getAllByText(/distance unknown/i).length).toBeGreaterThanOrEqual(1);
        expect(screen.queryByText(/NaN/)).toBeNull();
    });

    it('renders nearest-crossing with valid distanceMetres', () => {
        const data = {
            awareness: {
                nearestCrossing: { distanceMetres: 300 }
            }
        };
        render(
            <GuidedEmergencyMode
                awarenessData={data}
                rawPosition={null}
                onClose={() => {}}
            />
        );
        expect(screen.getByText(/Nearest crossing — 300m/i)).toBeInTheDocument();
    });

    it('renders "distance unknown" when nearestCrossing.distanceMetres is null', () => {
        const data = {
            awareness: {
                nearestCrossing: { distanceMetres: null }
            }
        };
        render(
            <GuidedEmergencyMode
                awarenessData={data}
                rawPosition={null}
                onClose={() => {}}
            />
        );
        expect(screen.queryByText(/NaN/)).toBeNull();
        // The field renders 'distance unknown' for the crossing
        expect(screen.getAllByText(/distance unknown/i).length).toBeGreaterThanOrEqual(1);
    });

    it('renders nearest-station text with valid distanceMetres', () => {
        const data = {
            awareness: {
                nearestStation: { name: 'Test Station', distanceMetres: 500 }
            }
        };
        render(
            <GuidedEmergencyMode
                awarenessData={data}
                rawPosition={null}
                onClose={() => {}}
            />
        );
        expect(screen.getByText(/Test Station/i)).toBeInTheDocument();
        expect(screen.getByText(/approximately 500m away/i)).toBeInTheDocument();
    });

    it('renders "distance unknown" when nearestStation.distanceMetres is null', () => {
        const data = {
            awareness: {
                nearestStation: { name: 'Nowhere Station', distanceMetres: null }
            }
        };
        render(
            <GuidedEmergencyMode
                awarenessData={data}
                rawPosition={null}
                onClose={() => {}}
            />
        );
        expect(screen.queryByText(/NaN/)).toBeNull();
        expect(screen.getByText(/Nowhere Station/i)).toBeInTheDocument();
        expect(screen.getByText(/distance unknown/i)).toBeInTheDocument();
    });

    it('calls onClose when the close button is clicked', () => {
        const onClose = vi.fn();
        render(
            <GuidedEmergencyMode
                awarenessData={null}
                rawPosition={null}
                onClose={onClose}
            />
        );
        screen.getByLabelText('Close emergency mode').click();
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('renders the emergency call link pointing at tel:112', () => {
        render(
            <GuidedEmergencyMode
                awarenessData={null}
                rawPosition={null}
                onClose={() => {}}
            />
        );
        const callLink = screen.getByText(/Call Emergency Services/i).closest('a');
        expect(callLink).toHaveAttribute('href', 'tel:112');
    });

    it('always shows the three static safety instructions', () => {
        render(
            <GuidedEmergencyMode
                awarenessData={null}
                rawPosition={null}
                onClose={() => {}}
            />
        );
        expect(screen.getByText(/Move away from railway tracks immediately/i)).toBeInTheDocument();
        expect(screen.getByText(/Do not walk along or stand on railway tracks/i)).toBeInTheDocument();
        expect(screen.getByText(/use a marked public crossing/i)).toBeInTheDocument();
        expect(screen.getByText(/If You See or Hear a Train/i)).toBeInTheDocument();
    });

    it('calculates and renders correct bearing to crossing', () => {
        const data = {
            awareness: {
                nearestCrossing: { distanceMetres: 300, lat: 28.6149, lon: 77.2090 } // North of rawPosition
            }
        };
        render(
            <GuidedEmergencyMode
                awarenessData={data}
                rawPosition={[28.6139, 77.2090]} // South point
                onClose={() => {}}
            />
        );
        expect(screen.getByText(/Nearest crossing — 300m · north/i)).toBeInTheDocument();
    });

    it('calculates and renders correct bearing to diagonal crossing', () => {
        const data = {
            awareness: {
                nearestCrossing: { distanceMetres: 300, lat: 28.6149, lon: 77.2100 } // Northeast of rawPosition
            }
        };
        render(
            <GuidedEmergencyMode
                awarenessData={data}
                rawPosition={[28.6139, 77.2090]}
                onClose={() => {}}
            />
        );
        expect(screen.getByText(/Nearest crossing — 300m · northeast/i)).toBeInTheDocument();
    });
});
