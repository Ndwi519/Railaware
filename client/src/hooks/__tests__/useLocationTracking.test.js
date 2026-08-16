import { renderHook, act } from '@testing-library/react';
import { useLocationTracking } from '../useLocationTracking';
import { expect, test, vi, beforeEach, describe } from 'vitest';

describe('useLocationTracking', () => {
  let permissionsQueryMock;

  beforeEach(() => {
    permissionsQueryMock = vi.fn().mockResolvedValue({ state: 'granted' });
    global.navigator.permissions = {
      query: permissionsQueryMock,
    };
    global.navigator.geolocation = {
      getCurrentPosition: vi.fn(),
      watchPosition: vi.fn(),
      clearWatch: vi.fn(),
    };
  });

  test('A. geolocation unavailable', () => {
    const originalGeolocation = global.navigator.geolocation;
    delete global.navigator.geolocation;

    const { result } = renderHook(() => useLocationTracking(false, null));
    expect(result.current.permissionStatus).toBe('unsupported');

    global.navigator.geolocation = originalGeolocation;
  });

  test('B. initial permission = prompt', async () => {
    permissionsQueryMock.mockResolvedValue({ state: 'prompt' });
    const { result } = renderHook(() => useLocationTracking(false, null));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.permissionStatus).toBe('prompt');
    expect(global.navigator.geolocation.watchPosition).not.toHaveBeenCalled();
  });

  test('C. user clicks Enable Location and geolocation succeeds', async () => {
    permissionsQueryMock.mockResolvedValue({ state: 'prompt' });
    const { result } = renderHook(() => useLocationTracking(false, null));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    global.navigator.geolocation.getCurrentPosition.mockImplementation((success) => {
      success({ coords: { latitude: 10, longitude: 20 } });
    });

    act(() => {
      result.current.requestPermission();
    });

    expect(result.current.permissionStatus).toBe('granted');
    expect(result.current.rawPosition).toEqual([10, 20]);
    // watchPosition should start after granted
    expect(global.navigator.geolocation.watchPosition).toHaveBeenCalled();
  });

  test('D. user clicks Enable Location and permission is denied', async () => {
    permissionsQueryMock.mockResolvedValue({ state: 'prompt' });
    const { result } = renderHook(() => useLocationTracking(false, null));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    global.navigator.geolocation.getCurrentPosition.mockImplementation((success, err) => {
      err({ code: 1, message: 'User denied Geolocation' });
    });

    act(() => {
      result.current.requestPermission();
    });

    expect(result.current.permissionStatus).toBe('denied');
    expect(result.current.geoError).toEqual({ code: 1, message: 'User denied Geolocation' });
  });

  test('E. permission is already granted', async () => {
    permissionsQueryMock.mockResolvedValue({ state: 'granted' });

    global.navigator.geolocation.getCurrentPosition.mockImplementation((success) => {
      success({ coords: { latitude: 10, longitude: 20 } });
    });

    const { result } = renderHook(() => useLocationTracking(false, null));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(global.navigator.geolocation.getCurrentPosition).toHaveBeenCalled();
    expect(result.current.permissionStatus).toBe('granted');
    expect(result.current.rawPosition).toEqual([10, 20]);
    expect(global.navigator.geolocation.watchPosition).toHaveBeenCalled();
  });

  test('F. permission is already denied', async () => {
    permissionsQueryMock.mockResolvedValue({ state: 'denied' });
    const { result } = renderHook(() => useLocationTracking(false, null));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.permissionStatus).toBe('denied');
    expect(global.navigator.geolocation.watchPosition).not.toHaveBeenCalled();
  });

  test('G. POSITION_UNAVAILABLE (code 2)', async () => {
    permissionsQueryMock.mockResolvedValue({ state: 'granted' });
    const { result } = renderHook(() => useLocationTracking(false, null));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    const errorCallback = global.navigator.geolocation.watchPosition.mock.calls[0][1];

    act(() => {
      errorCallback({ code: 2, message: 'Position unavailable' });
    });

    expect(result.current.permissionStatus).toBe('granted'); // NOT denied
    expect(result.current.geoError.code).toBe(2);
  });

  test('H. TIMEOUT (code 3)', async () => {
    permissionsQueryMock.mockResolvedValue({ state: 'granted' });
    const { result } = renderHook(() => useLocationTracking(false, null));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    const errorCallback = global.navigator.geolocation.watchPosition.mock.calls[0][1];

    act(() => {
      errorCallback({ code: 3, message: 'Position timeout' });
    });

    expect(result.current.permissionStatus).toBe('granted'); // NOT denied
    expect(result.current.geoError.code).toBe(3);
  });

  test('J. Permissions API reports granted', async () => {
    permissionsQueryMock.mockResolvedValue({ state: 'granted' });

    global.navigator.geolocation.getCurrentPosition.mockImplementation((success) => {
      success({ coords: { latitude: 30, longitude: 40 } });
    });

    const { result } = renderHook(() => useLocationTracking(false, null));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(global.navigator.geolocation.getCurrentPosition).toHaveBeenCalled();
    expect(result.current.permissionStatus).toBe('granted');
    expect(result.current.rawPosition).toEqual([30, 40]);
    expect(global.navigator.geolocation.watchPosition).toHaveBeenCalled();
  });

  test('K. Permissions API reports denied', async () => {
    permissionsQueryMock.mockResolvedValue({ state: 'denied' });
    const { result } = renderHook(() => useLocationTracking(false, null));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.permissionStatus).toBe('denied');
    expect(global.navigator.geolocation.watchPosition).not.toHaveBeenCalled();
  });

  test('I. Permissions API unavailable', () => {
    const originalPermissions = global.navigator.permissions;
    delete global.navigator.permissions;

    const { result } = renderHook(() => useLocationTracking(false, null));
    expect(result.current.permissionStatus).toBe('prompt');

    global.navigator.permissions = originalPermissions;
  });

  test('L. retry after permission changes from denied -> granted', async () => {
    const mockResult = { state: 'denied' };
    permissionsQueryMock.mockResolvedValue(mockResult);

    const { result } = renderHook(() => useLocationTracking(false, null));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.permissionStatus).toBe('denied');

    // Simulate permission change
    act(() => {
      mockResult.state = 'granted';
      if (mockResult.onchange) mockResult.onchange();
    });

    expect(result.current.permissionStatus).toBe('granted');
    expect(global.navigator.geolocation.watchPosition).toHaveBeenCalled();
  });

  test('M. no infinite reload loop', async () => {
    const reloadMock = vi.fn();
    const originalLocation = window.location;
    delete window.location;
    window.location = { ...originalLocation, reload: reloadMock };

    permissionsQueryMock.mockResolvedValue({ state: 'denied' });
    const { result } = renderHook(() => useLocationTracking(false, null));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.permissionStatus).toBe('denied');

    // Simulate user interaction that would previously cause a reload
    if (result.current.requestPermission) {
      act(() => {
        result.current.requestPermission();
      });
    }

    expect(reloadMock).not.toHaveBeenCalled();

    // Restore window.location
    window.location = originalLocation;
  });

  test('N. existing simulation mode still works', () => {
    const { result } = renderHook(() => useLocationTracking(true, [40, -74]));

    expect(result.current.permissionStatus).toBe('granted');
    expect(result.current.rawPosition).toEqual([40, -74]);
  });
});
