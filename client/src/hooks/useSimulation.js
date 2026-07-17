/**
 * useSimulation
 *
 * Manages developer-simulation state: whether simulation is active
 * and what the current simulated GPS position is.
 *
 * @returns {{
 *   isSimulating: boolean,
 *   setIsSimulating: Function,
 *   simulatedPosition: Array|null,
 *   setSimulatedPosition: Function
 * }}
 */
import { useState } from 'react';

export function useSimulation() {
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulatedPosition, setSimulatedPosition] = useState(null);

  return { isSimulating, setIsSimulating, simulatedPosition, setSimulatedPosition };
}
