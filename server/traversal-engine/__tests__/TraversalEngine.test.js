const { TraversalEngine } = require('../TraversalEngine.js');
const { TraversalStateType } = require('../TraversalStateType.js');
const { TraversalEventType } = require('../TraversalEventType.js');
const { TraversalConfig } = require('../TraversalConfig.js');
const { TraversalState } = require('../TraversalState.js');

describe('TraversalEngine Reducer', () => {
  let engine;

  beforeEach(() => {
    engine = new TraversalEngine();
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

  it('initializes to INITIALIZING when no events and no previous state', () => {
    const state = engine.update(null, []);
    expect(state.state).toBe(TraversalStateType.INITIALIZING);
    expect(state.routeContext).toBe(null);
  });

  it('transitions to TRACKING with TRACKING_STARTED event', () => {
    const rc = mockRouteContext(0, 'branch_0_1');
    const proj = mockProjection(0, 500);
    const events = [{ type: TraversalEventType.TRACKING_STARTED, projection: proj, routeContext: rc }];
    const state = engine.update(null, events);

    expect(state.state).toBe(TraversalStateType.TRACKING);
    expect(state.currentSegmentIndex).toBe(0);
    expect(state.currentBranchId).toBe('branch_0_1');
    expect(state.history.length).toBe(1);
    expect(state.history[0].type).toBe(TraversalEventType.TRACKING_STARTED);
    expect(state.lastStableProjection).toBe(proj);
    expect(state.routeContext).toBe(rc);
  });

  it('applies multiple events sequentially', () => {
    const prevState = new TraversalState({
      state: TraversalStateType.TRACKING,
      currentSegmentIndex: 0,
      currentBranchId: 'branch_0_1',
      lastStableProjection: mockProjection(0, 500),
      routeContext: mockRouteContext(0, 'branch_0_1')
    });

    const nextRc = mockRouteContext(1, 'branch_1_2');
    const nextProj = mockProjection(1, 10);
    const events = [
      { type: TraversalEventType.PROJECTION_UPDATED, projection: nextProj, routeContext: nextRc },
      { type: TraversalEventType.ENTERED_SEGMENT, segmentIndex: 1 },
      { type: TraversalEventType.ENTERED_BRANCH, branchId: 'branch_1_2' },
      { type: TraversalEventType.DIRECTION_CHANGED, direction: false }
    ];

    const state = engine.update(prevState, events);

    expect(state.state).toBe(TraversalStateType.TRACKING);
    expect(state.currentSegmentIndex).toBe(1);
    expect(state.currentBranchId).toBe('branch_1_2');
    expect(state.traversalDirection).toBe(false);
    expect(state.lastStableProjection).toBe(nextProj);
    expect(state.routeContext).toBe(nextRc);
  });

  it('rejects impossible jumps deterministically', () => {
    const prevState = new TraversalState({
      state: TraversalStateType.TRACKING,
      lastStableProjection: mockProjection(0, 500),
      routeContext: mockRouteContext(0, 'branch_0_1')
    });

    const events = [{ type: TraversalEventType.IMPOSSIBLE_JUMP }];
    const state = engine.update(prevState, events);

    expect(state.state).toBe(TraversalStateType.RECOVERING);
    // last stable projection must not update
    expect(state.lastStableProjection.alongTrackDistanceMetres).toBe(500);
  });

  it('transitions to AT_STATION and back to TRACKING', () => {
    const rc = mockRouteContext(0, 'branch_0_1');
    let state = new TraversalState({
      state: TraversalStateType.TRACKING,
      routeContext: rc
    });

    // Arrive
    state = engine.update(state, [{ type: TraversalEventType.ARRIVED_AT_STATION, station: 'A', routeContext: rc }]);
    expect(state.state).toBe(TraversalStateType.AT_STATION);

    // Depart
    state = engine.update(state, [{ type: TraversalEventType.DEPARTED_STATION }]);
    expect(state.state).toBe(TraversalStateType.TRACKING);
  });

  it('ensures identical input produces identical output (deterministic)', () => {
    const prevState = new TraversalState({
      state: TraversalStateType.TRACKING,
      currentSegmentIndex: 0,
      currentBranchId: 'branch_0_1'
    });

    const events = [
      { type: TraversalEventType.ENTERED_SEGMENT, segmentIndex: 2 }
    ];

    const stateA = engine.update(prevState, events);
    const stateB = engine.update(prevState, events);

    expect(JSON.stringify(stateA)).toEqual(JSON.stringify(stateB));
  });

  it('bounds history to max capacity via state reducer', () => {
    const rc = mockRouteContext(0, 'branch_0_1');
    let state = new TraversalState({ state: TraversalStateType.INITIALIZING });

    // Send 30 events
    const events = [];
    for (let i = 0; i < 30; i++) {
       events.push({ type: TraversalEventType.DIRECTION_CHANGED, direction: i % 2 === 0 });
    }

    state = engine.update(state, events);

    expect(state.history.length).toBe(TraversalConfig.MAX_HISTORY_EVENTS);
  });
});
