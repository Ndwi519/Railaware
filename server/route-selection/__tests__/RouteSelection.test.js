const { RouteSelection } = require('../RouteSelection.js');
const { RouteSelectionEvidence } = require('../RouteSelectionEvidence.js');
const { BranchEvidence } = require('../BranchEvidence.js');
const { MovementState } = require('../../directional-inference/MovementState.js');
const { BranchStatus } = require('../BranchDecision.js');
const { TravelDirection } = require('../TravelDirection.js');
describe('RouteSelection', () => {
  let routeSelection;
  beforeEach(() => {
    routeSelection = new RouteSelection();
  });

  it('returns AMBIGUOUS for STATIONARY movement state', () => {
    const evidence = new RouteSelectionEvidence({
      movementState: MovementState.STATIONARY,
      travelDirection: TravelDirection.STATIONARY,
      downstreamBranches: [new BranchEvidence({ branchId: 1, divergenceDegrees: 0 })]
    });
    const decision = routeSelection.evaluate(evidence);
    expect(decision.status).toBe(BranchStatus.AMBIGUOUS);
    expect(decision.ambiguityReason).toBe('STATIONARY_NO_VECTOR');
  });

  it('selects a single branch regardless of divergence', () => {
    const evidence = new RouteSelectionEvidence({
      movementState: MovementState.MOVING,
      travelDirection: TravelDirection.FORWARD,
      downstreamBranches: [new BranchEvidence({ branchId: 1, divergenceDegrees: 50 })]
    });
    const decision = routeSelection.evaluate(evidence);
    expect(decision.status).toBe(BranchStatus.SELECTED);
    expect(decision.selectedBranchId).toBe("1");
  });

  it('selects unambiguous branch out of multiple (others fail threshold)', () => {
    const evidence = new RouteSelectionEvidence({
      movementState: MovementState.MOVING,
      travelDirection: TravelDirection.FORWARD,
      downstreamBranches: [
        new BranchEvidence({ branchId: 1, divergenceDegrees: 10 }),
        new BranchEvidence({ branchId: 2, divergenceDegrees: 90 })
      ]
    });
    const decision = routeSelection.evaluate(evidence);
    expect(decision.status).toBe(BranchStatus.SELECTED);
    expect(decision.selectedBranchId).toBe("1");
  });

  it('returns AMBIGUOUS if multiple branches pass threshold', () => {
    const evidence = new RouteSelectionEvidence({
      movementState: MovementState.MOVING,
      travelDirection: TravelDirection.FORWARD,
      downstreamBranches: [
        new BranchEvidence({ branchId: 1, divergenceDegrees: 10 }),
        new BranchEvidence({ branchId: 2, divergenceDegrees: 15 })
      ]
    });
    const decision = routeSelection.evaluate(evidence);
    expect(decision.status).toBe(BranchStatus.AMBIGUOUS);
    expect(decision.ambiguityReason).toBe('MULTIPLE_BRANCHES_ALIGNED');
  });

  it('conservatively retains current branch if multiple branches exist but none are aligned (Defect-003)', () => {
    // Topology: Train is on main branch. Downstream Y-junction has Branch A and Branch B.
    // Train heading deviates by > 45 degrees from BOTH downstream forks (e.g. sharp curve before junction).
    const evidence = new RouteSelectionEvidence({
      movementState: MovementState.MOVING,
      travelDirection: TravelDirection.FORWARD,
      currentBranchId: "99",
      downstreamBranches: [
        new BranchEvidence({ branchId: 1, divergenceDegrees: 50 }), // Branch A
        new BranchEvidence({ branchId: 2, divergenceDegrees: 60 })  // Branch B
      ]
    });

    const decision = routeSelection.evaluate(evidence);

    // Fallback heuristic: Retain current branch rather than throwing AMBIGUOUS
    expect(decision.status).toBe(BranchStatus.SELECTED);
    expect(decision.selectedBranchId).toBe("99");
    expect(decision.travelDirection).toBe(TravelDirection.FORWARD);
  });
});
