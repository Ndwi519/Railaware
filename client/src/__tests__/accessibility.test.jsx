import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { axe } from 'vitest-axe';
import * as matchers from 'vitest-axe/matchers';
expect.extend(matchers);
import LiveMapPage from '../pages/LiveMapPage';
import DeveloperDiagnosticsPanel from '../components/DeveloperDiagnosticsPanel';
import EmergencyMode from '../components/EmergencyMode';
import React from 'react';

// Mock Leaflet as it doesn't render well in JSDOM
vi.mock('../components/LiveMap', () => ({
  default: () => <div role="img" aria-label="Interactive map">Map Mock</div>
}));

describe('Accessibility Checks (axe-core)', () => {
    beforeAll(() => {
        global.navigator.geolocation = {
            watchPosition: vi.fn(),
            clearWatch: vi.fn()
        };
    });

    it('LiveMapPage loading state should have no a11y violations', async () => {
        const { container } = render(<LiveMapPage />);
        const results = await axe(container);
        expect(results).toHaveNoViolations();
    });

    it('LiveMapPage denied state should have no a11y violations', async () => {
        global.navigator.geolocation.watchPosition.mockImplementationOnce((success, error) => {
            error(new Error('Denied'));
            return 123;
        });
        
        const { container } = render(<LiveMapPage />);
        const results = await axe(container);
        expect(results).toHaveNoViolations();
    });

    it('DeveloperDiagnosticsPanel should have no a11y violations', async () => {
        const { container } = render(
            <DeveloperDiagnosticsPanel 
                isSimulating={true} 
                setIsSimulating={() => {}} 
                simulatedPosition={[10, 20]} 
                observationData={null} 
            />
        );
        const results = await axe(container);
        expect(results).toHaveNoViolations();
    });

    it('EmergencyMode should have no a11y violations', async () => {
        const mockObs = {
            awareness: { status: 'APPROACHING_STATION', distanceMetres: 100 }
        };
        const { container } = render(<EmergencyMode observationData={mockObs} />);
        const results = await axe(container);
        expect(results).toHaveNoViolations();
    });
});
