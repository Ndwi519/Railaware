import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import AwarenessSidebar from '../components/AwarenessSidebar';

// Mock ScheduledServices to easily assert its presence or absence
vi.mock('../components/ScheduledServices', () => ({
  default: () => <div data-testid="mock-scheduled-services">Scheduled Services Mock</div>
}));

describe('AwarenessSidebar Structural Regression', () => {
    it('renders safety strip but hides sidebar panel when isTrainNearby is true', () => {
        const observationData = {
            awareness: {
                nearbyTracks: [{ id: 'track-1', crossTrackDistanceMetres: 10, side: 'left' }]
            }
        };

        render(
            <AwarenessSidebar
                observationData={observationData}
                isTrainNearby={true}
            />
        );

        // Verify safety strip IS rendered
        expect(screen.getByText(/Do not walk along tracks\. If tracks are nearby, keep clear/i)).toBeInTheDocument();

        // Verify sidebar panel body is NOT rendered
        expect(screen.queryByText('Awareness Panel')).toBeNull();
        expect(screen.queryByText('Matched Corridor')).toBeNull();

        // Verify ScheduledServices is NOT rendered
        expect(screen.queryByTestId('mock-scheduled-services')).toBeNull();
    });
});
