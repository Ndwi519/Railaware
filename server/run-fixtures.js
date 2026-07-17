import fs from 'fs';
import { estimateTrainAwareness } from './awareness-engine/TrainEstimator.js';
import { ConfidenceLevel, TrainStatus } from './domain/types/enums.js';

// We create a structured fixture based on the real probe-results.json structure,
// but mapped into the normalized models that TrainEstimator expects.
const fixtures = [
  {
    name: "Scenario 1: Train approaching target station",
    inputs: {
      journey: { targetStation: { code: 'NDLS' } },
      observation: {
        status: TrainStatus.RUNNING,
        segmentProgress: 0.75, // 75% between PCN and FDB
        recordedAt: new Date('2026-07-09T00:05:31+05:30'),
        currentSegment: {
          previousStation: { code: 'PCN' },
          nextStation: { code: 'FDB' }
        }
      },
      corridor: {
        stations: [
          { feature: { station: { code: 'PCN' } }, alongTrackDistanceMetres: 1350000 },
          { feature: { station: { code: 'FDB' } }, alongTrackDistanceMetres: 1365000 },
          { feature: { station: { code: 'NDLS' } }, alongTrackDistanceMetres: 1389300 }
        ]
      },
      confidence: { level: ConfidenceLevel.HIGH }
    }
  },
  {
    name: "Scenario 2: Train has arrived at target station",
    inputs: {
      journey: { targetStation: { code: 'NDLS' } },
      observation: {
        status: TrainStatus.ARRIVED,
        segmentProgress: 0.0,
        recordedAt: new Date(),
        currentSegment: {
          previousStation: { code: 'NDLS' },
          nextStation: null
        }
      },
      corridor: {
        stations: [
          { feature: { station: { code: 'PCN' } }, alongTrackDistanceMetres: 1350000 },
          { feature: { station: { code: 'NDLS' } }, alongTrackDistanceMetres: 1389300 }
        ]
      },
      confidence: { level: ConfidenceLevel.HIGH }
    }
  },
  {
    name: "Scenario 3: Zero trains on verified topology (ADR-002)",
    inputs: {
      journey: null,
      observation: {
        status: TrainStatus.UNKNOWN,
        recordedAt: new Date(),
        currentSegment: null
      },
      corridor: {
        stations: []
      },
      confidence: { level: ConfidenceLevel.HIGH }
    }
  },
  {
    name: "Scenario 4: Topology Unresolved (Unknown Confidence)",
    inputs: {
      journey: { targetStation: { code: 'NDLS' } },
      observation: {
        status: TrainStatus.RUNNING,
        segmentProgress: null,
        recordedAt: new Date(),
        currentSegment: null
      },
      corridor: null,
      confidence: { level: ConfidenceLevel.UNKNOWN }
    }
  }
];

fixtures.forEach(f => {
  console.log('='.repeat(50));
  console.log(`Fixture Name: ${f.name}`);
  console.log('↓');
  console.log('Estimator Input:');
  console.log(JSON.stringify(f.inputs, null, 2));
  console.log('↓');
  
  const output = estimateTrainAwareness(f.inputs.journey, f.inputs.observation, f.inputs.corridor, f.inputs.confidence);
  
  console.log('Estimator Output:');
  console.log(JSON.stringify(output, null, 2));
  console.log('↓');
  console.log(`Explanation: ${output.explanation}`);
  console.log('='.repeat(50));
});
