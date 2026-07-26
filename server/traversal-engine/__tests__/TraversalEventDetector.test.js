const { TraversalEventDetector } = require('../TraversalEventDetector.js');
const { TraversalStateType } = require('../TraversalStateType.js');
const { TraversalEventType } = require('../TraversalEventType.js');
const { TraversalState } = require('../TraversalState.js');

describe('TraversalEventDetector', () => {
  let detector;

  beforeEach(() => {
    detector = new TraversalEventDetector();
  });

  const mockRouteContext = (segmentIndex, branchId, prevSt, nextSt) => ({
    currentSegmentIndex: segmentIndex,
    branchId: branchId,
    previousStation: prevSt ? { station: { code: prevSt }, corridorSegmentIndex: segmentIndex, alongTrackDistanceMetres: 100 } : null,
    nextStation: nextSt ? { station: { code: nextSt }, corridorSegmentIndex: segmentIndex, alongTrackDistanceMetres: 900 } : null
  });

  const mockProjection = (segmentIndex, distance) => ({
    segmentIndex,
    alongTrackDistanceMetres: distance
  });

  it('detects tracking started from INITIALIZING', () => {
    const rc = mockRouteContext(0, 'branch_0_1');
    const proj = mockProjection(0, 500);
    const prevState = new TraversalState({ state: TraversalStateType.INITIALIZING });
    const events = detector.detectEvents(prevState, proj, rc);
    expect(events.length).toBe(1);
    expect(events[0]).toEqual({ type: TraversalEventType.TRACKING_STARTED, projection: proj, routeContext: rc });
  });

  it('detects GPS loss from TRACKING', () => {
    const rc = mockRouteContext(0, 'branch_0_1');
    const prevState = new TraversalState({ state: TraversalStateType.TRACKING });
    const events = detector.detectEvents(prevState, null, rc);
    expect(events.length).toBe(1);
    expect(events[0].type).toBe(TraversalEventType.LOST_TRACKING);
  });

  it('detects impossible jumps', () => {
    const rc = mockRouteContext(0, 'branch_0_1');
    const prevState = new TraversalState({
      state: TraversalStateType.TRACKING,
      lastStableProjection: mockProjection(0, 500)
    });
    // 6000 is > config threshold
    const events = detector.detectEvents(prevState, mockProjection(0, 6500), rc);
    expect(events.length).toBe(1);
    expect(events[0].type).toBe(TraversalEventType.IMPOSSIBLE_JUMP);
  });

  it('detects segment and branch transitions', () => {
    const prevState = new TraversalState({
      state: TraversalStateType.TRACKING,
      currentSegmentIndex: 0,
      currentBranchId: 'branch_0_1',
      lastStableProjection: mockProjection(0, 500)
    });
    const rc2 = mockRouteContext(1, 'branch_1_2');
    const proj2 = mockProjection(1, 10);
    const events = detector.detectEvents(prevState, proj2, rc2);

    expect(events).toContainEqual({ type: TraversalEventType.ENTERED_SEGMENT, segmentIndex: 1 });
    expect(events).toContainEqual({ type: TraversalEventType.ENTERED_BRANCH, branchId: 'branch_1_2' });
    expect(events).toContainEqual({ type: TraversalEventType.PROJECTION_UPDATED, projection: proj2, routeContext: rc2 });
  });

  it('detects direction changes', () => {
    const prevState = new TraversalState({
      state: TraversalStateType.TRACKING,
      traversalDirection: true, // forward
      lastStableProjection: mockProjection(0, 500),
      currentSegmentIndex: 0
    });

    // Moving to 450 means negative delta (backward)
    const rc = mockRouteContext(0, 'branch_0_1');
    const proj = mockProjection(0, 450);
    const events = detector.detectEvents(prevState, proj, rc);
    expect(events).toContainEqual({ type: TraversalEventType.DIRECTION_CHANGED, direction: false });
    expect(events).toContainEqual({ type: TraversalEventType.PROJECTION_UPDATED, projection: proj, routeContext: rc });
  });

  it('detects station arrival and departure', () => {
    const rc = mockRouteContext(0, 'branch_0_1', 'A', 'B');

    // Arrive
    const prevState = new TraversalState({ state: TraversalStateType.TRACKING });
    const projArr = mockProjection(0, 200);
    let events = detector.detectEvents(prevState, projArr, rc);
    expect(events).toContainEqual({ type: TraversalEventType.ARRIVED_AT_STATION, station: { code: 'A' }, routeContext: rc });
    expect(events).toContainEqual({ type: TraversalEventType.PROJECTION_UPDATED, projection: projArr, routeContext: rc });

    // Depart
    const prevStateAtSt = new TraversalState({ state: TraversalStateType.AT_STATION });
    events = detector.detectEvents(prevStateAtSt, mockProjection(0, 300), rc);
    expect(events).toContainEqual({ type: TraversalEventType.DEPARTED_STATION });
  });

  it('detects passed stations semantically', () => {
    const rc1 = mockRouteContext(0, 'branch_0_1', 'A', 'B');
    const rc2 = mockRouteContext(0, 'branch_0_1', 'B', 'C');

    const prevState = new TraversalState({
      state: TraversalStateType.TRACKING,
      routeContext: rc1
    });

    const events = detector.detectEvents(prevState, mockProjection(0, 550), rc2);
    expect(events).toContainEqual({ type: TraversalEventType.PASSED_STATION, station: { code: 'B' } });
  });
});
