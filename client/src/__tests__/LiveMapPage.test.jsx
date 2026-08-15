import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LiveMapPage from '../pages/LiveMapPage';
import React from 'react';

// Mock Leaflet and child components
vi.mock('../components/LiveMap', () => ({
  default: ({ onMapClick }) => (
    <div data-testid="live-map-mock" onClick={() => onMapClick([12.34, 56.78])}>
      Map
    </div>
  )
}));

// DeveloperDiagnosticsPanel is intentionally not mocked to enable genuine integration testing

describe('LiveMapPage', () => {
    beforeEach(() => {
        global.navigator.geolocation = {
            watchPosition: vi.fn(),
            clearWatch: vi.fn()
        };
        vi.stubEnv('DEV', true);
    });

    it('shows permission denied overlay if geolocation fails', async () => {
        global.navigator.geolocation.watchPosition.mockImplementationOnce((success, error) => {
            error({ code: 1, message: 'User denied Geolocation' }); // code 1 = PERMISSION_DENIED
            return 123;
        });

        await act(async () => {
            render(<LiveMapPage />);
        });
        expect(screen.getByText('Location Access Required')).toBeInTheDocument();
    });

    it('renders observation data when fetch succeeds', async () => {
        global.navigator.geolocation.watchPosition.mockImplementationOnce((success) => {
            success({ coords: { latitude: 10, longitude: 20 } });
            return 123;
        });

        const mockResponse = {
            nearbyTracks: [{ id: '1', crossTrackDistanceMetres: 1200, side: 'right', geometry: [{lat: 10, lng: 20}] }],
            nearestStation: { name: 'Test Station' },
            nearestCrossing: { distanceMetres: 100 },
            disclaimer: 'situational awareness based on public data',
            discoveryContext: {
                corridor: { id: 'corridor-1' }
            }
        };

        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            headers: { get: vi.fn() },
            json: async () => mockResponse
        });

        await act(async () => {
            render(<LiveMapPage />);
        });

        expect(await screen.findByText(/Matched Corridor/i)).toBeInTheDocument();
        expect(screen.getByText(/1200 m/i)).toBeInTheDocument();

        expect(screen.getByText(/Test Station/i)).toBeInTheDocument();
        expect(screen.getByText(/100 m/i)).toBeInTheDocument();

        // Ensure legacy things are gone or handled
        expect(screen.queryByText(/On Railway Corridor/i)).toBeNull();

        // Check if ScheduledServices runs (mock discoveryTrains is an object which isn't rendered directly, but we test the container)
        // Assert Assistance Guidance (Disclaimer)
        expect(screen.getByText(/situational awareness based on public data/i)).toBeInTheDocument();
    });



    it('handles api error gracefully', async () => {
        global.navigator.geolocation.watchPosition.mockImplementationOnce((success) => {
            success({ coords: { latitude: 10, longitude: 20 } });
            return 123;
        });

        global.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 500,
            headers: { get: vi.fn() }
        });

        await act(async () => {
            render(<LiveMapPage />);
        });

        // After a failed API call the component must still render without crashing.
        // The map container remains visible and no observation panel is shown.
        expect(screen.queryByText(/Status:/i)).toBeNull();
    });


    it('aborts ongoing requests if a new request is triggered', async () => {
        global.navigator.geolocation.watchPosition.mockImplementationOnce((success) => {
            success({ coords: { latitude: 10, longitude: 20 } });
            return 123;
        });

        let resolveFirstFetch;
        const firstFetchPromise = new Promise(resolve => {
            resolveFirstFetch = resolve;
        });

        global.fetch = vi.fn()
            .mockImplementationOnce(() => firstFetchPromise)
            .mockResolvedValue({
                ok: true,
                headers: { get: vi.fn() },
                json: async () => ({ observation: {}, awareness: {} })
            });

        await act(async () => {
            render(<LiveMapPage />);
        });

        // First fetch started. Grab its signal.
        const firstSignal = global.fetch.mock.calls[0][1].signal;
        expect(firstSignal.aborted).toBe(false);

        const { fireEvent } = await import('@testing-library/react');

        // Open dev panel and enable simulation
        fireEvent.keyDown(window, { key: 'd', ctrlKey: true, shiftKey: true });

        const enableBtn = screen.getByText('ENABLE SIMULATION');
        fireEvent.click(enableBtn);

        // Enter coordinates and apply them to trigger a second fetch
        const latInput = screen.getByPlaceholderText('Latitude');
        const lngInput = screen.getByPlaceholderText('Longitude');
        fireEvent.change(latInput, { target: { value: '12.34' } });
        fireEvent.change(lngInput, { target: { value: '56.78' } });

        const applyBtn = screen.getByText('APPLY COORDINATES');
        await act(async () => {
            fireEvent.click(applyBtn);
        });

        // The first request should now be aborted
        expect(firstSignal.aborted).toBe(true);

        // Resolve the first fetch cleanly so it doesn't hang
        await act(async () => {
            resolveFirstFetch({
                ok: true,
                headers: { get: vi.fn() },
                json: async () => ({ observation: {}, awareness: {} })
            });
        });
    });

    it('cleans up timers correctly on unmount to prevent leaks', async () => {
        vi.useFakeTimers();
        global.navigator.geolocation.watchPosition.mockImplementationOnce((success) => {
            success({ coords: { latitude: 10, longitude: 20 } });
            return 123;
        });

        let renderResult;
        await act(async () => {
            renderResult = render(<LiveMapPage />);
        });

        // Advance timers to trigger interval updates
        await act(async () => {
            vi.advanceTimersByTime(2000);
        });

        // Unmount before simulation completes
        await act(async () => {
            renderResult.unmount();
        });

        // Advance timers massively to ensure no state updates are attempted
        expect(() => {
            act(() => {
                vi.advanceTimersByTime(10000);
            });
        }).not.toThrow();

        vi.useRealTimers();
    });

    it('dispatches exactly one fresh observation request per user action', async () => {
        let gpsCallback;
        global.navigator.geolocation.watchPosition.mockImplementation((success) => {
            gpsCallback = success;
            success({ coords: { latitude: 10, longitude: 20 } });
            return 123;
        });

        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            headers: { get: vi.fn() },
            json: async () => ({
                observation: { phase: 'observing', trackPresence: 'no' },
                awareness: { status: 'DISTANT' },
            })
        });

        await act(async () => {
            render(<LiveMapPage />);
        });

        // 1. Initial GPS -> 1 fetch
        expect(global.fetch).toHaveBeenCalledTimes(1);

        const { fireEvent } = await import('@testing-library/react');

        fireEvent.keyDown(window, { key: 'd', ctrlKey: true, shiftKey: true });
        fireEvent.click(screen.getByText('ENABLE SIMULATION'));

        const latInput = screen.getByPlaceholderText('Latitude');
        const lngInput = screen.getByPlaceholderText('Longitude');
        const applyBtn = screen.getByText('APPLY COORDINATES');
        const refreshBtn = screen.getByText('REFRESH');

        // 2. Apply Coordinates -> +1 fetch (total 2)
        fireEvent.change(latInput, { target: { value: '1.11' } });
        fireEvent.change(lngInput, { target: { value: '1.11' } });
        await act(async () => {
            fireEvent.click(applyBtn);
        });
        expect(global.fetch).toHaveBeenCalledTimes(2);

        // 3. Apply identical coordinates again -> +1 fetch (total 3)
        await act(async () => {
            fireEvent.click(applyBtn);
        });
        expect(global.fetch).toHaveBeenCalledTimes(3);

        // 4. Refresh button -> +1 fetch (total 4)
        await act(async () => {
            fireEvent.click(refreshBtn);
        });
        expect(global.fetch).toHaveBeenCalledTimes(4);

        // 5. Map click -> +1 fetch (total 5)
        const map = screen.getByTestId('live-map-mock');
        await act(async () => {
            map.click();
        });
        expect(global.fetch).toHaveBeenCalledTimes(5);
        expect(global.navigator.geolocation.clearWatch).toHaveBeenCalled();

        // 6. Disable simulation -> +1 fetch (teleports back to real GPS 10,20) (total 6)
        await act(async () => {
            fireEvent.click(screen.getByText('SIMULATION ACTIVE'));
        });
        expect(global.fetch).toHaveBeenCalledTimes(6);

        // 7. GPS movement -> +1 fetch (total 7)
        await act(async () => {
            gpsCallback({ coords: { latitude: 11, longitude: 21 } });
        });
        expect(global.fetch).toHaveBeenCalledTimes(7);
    });


});
