import { renderHook, act } from '@testing-library/react';
import { useLocationTracking } from '../useLocationTracking';
import { expect, test, vi, beforeEach } from 'vitest';

beforeEach(() => {
  global.navigator.geolocation = {
    watchPosition: vi.fn(),
    clearWatch: vi.fn(),
  };
});

test('handles geolocation errors correctly based on code', () => {
  let errorCallback;
  global.navigator.geolocation.watchPosition.mockImplementation((success, err) => {
    errorCallback = err;
    return 123; // watchId
  });

  const { result, rerender } = renderHook(() => useLocationTracking(false, null));
  
  // Initially prompting
  expect(result.current.permissionStatus).toBe('prompting');

  // Simulate timeout (code 3)
  act(() => {
    errorCallback({ code: 3, message: 'Timeout' });
  });
  // Should still be prompting
  expect(result.current.permissionStatus).toBe('prompting');

  // Simulate position unavailable (code 2)
  act(() => {
    errorCallback({ code: 2, message: 'Position unavailable' });
  });
  expect(result.current.permissionStatus).toBe('prompting');

  // Simulate permission denied (code 1)
  act(() => {
    errorCallback({ code: 1, message: 'User denied' });
  });
  expect(result.current.permissionStatus).toBe('denied');
});
