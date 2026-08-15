import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ScheduledServices from '../components/ScheduledServices';

// Mock fetch globally
const originalFetch = global.fetch;

describe('ScheduledServices Component', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('renders nothing when no corridorId is provided', () => {
    const { container } = render(<ScheduledServices corridorId={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when the API returns no scheduled services', async () => {
    global.fetch.mockResolvedValueOnce({
      json: async () => ({
        scheduledServices: [],
        status: "no_scheduled_services"
      })
    });

    const { container } = render(<ScheduledServices corridorId="mock-corridor" />);

    // Wait for the fetch to resolve
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/v1/schedule/corridor/mock-corridor', expect.any(Object));
    });

    // The component should hide itself completely
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing on API error', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    const { container } = render(<ScheduledServices corridorId="mock-corridor" />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    // The component should hide itself completely
    expect(container.firstChild).toBeNull();
  });

  it('renders scheduled services and tests scrollability with many synthetic records', async () => {
    // Generate enough records to force scrolling
    const syntheticServices = Array.from({ length: 20 }, (_, i) => ({
      trainNumber: `123${i}`,
      trainName: `Mock Train ${i}`,
      scheduledDeparture: { station: 'MOCK_A', time: `10:${i.toString().padStart(2, '0')}` },
      scheduledArrival: { station: 'MOCK_B', time: `11:${i.toString().padStart(2, '0')}` }
    }));

    global.fetch.mockResolvedValueOnce({
      json: async () => ({
        status: "success",
        scheduledServices: syntheticServices
      })
    });

    render(<ScheduledServices corridorId="mock-corridor" />);

    // The main button should become visible once data is loaded
    await waitFor(() => {
      expect(screen.getByText('Scheduled Services')).toBeInTheDocument();
    });

    // Click the accordion button to open it
    const button = screen.getByRole('button');
    button.click();

    // Verify header is visible
    await waitFor(() => {
      expect(screen.getByText('Published Timetable · Not Real-Time')).toBeInTheDocument();
    });

    // Verify all 20 records are rendered inside the list
    for (let i = 0; i < 20; i++) {
      expect(screen.getByText(`123${i}`)).toBeInTheDocument();
    }

    // Verify the container has max-height and overflow-y-auto to allow scrolling
    // The list container is the div with divide-y
    // We can't strictly assert CSS computed styles in jsdom easily for layout,
    // but we can check the classes.
    const containerElements = document.getElementsByClassName('overflow-y-auto');
    expect(containerElements.length).toBeGreaterThan(0);
    expect(containerElements[0]).toHaveClass('overscroll-contain');
  });
});
