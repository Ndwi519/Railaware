const { createRailAwareService } = require('./application/bootstrap/createRailAwareService.js');
const express = require('express');

async function runValidation() {
  const app = express();
  app.use(express.json());
  
  const config = {
    overpassUrl: 'https://overpass-api.de/api/interpreter',
    railradarKey: 'test_key',
    nodeEnv: 'test'
  };

  const railAwareService = createRailAwareService(config);

  app.post('/api/v1/observation', async (req, res) => {
    try {
      const response = await railAwareService.evaluateLocation('test-session', req.body.lat, req.body.lng);
      res.json(response);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  });

  const server = app.listen(3002);
  const apiUrl = 'http://localhost:3002/api/v1/observation';

  const runScenario = async (name, lat, lng, setupMock = null) => {
    console.log(`\n\n=========================================================`);
    console.log(`SCENARIO: ${name}`);
    console.log(`=========================================================`);
    let originalDiscover = railAwareService.discoveryService.discoverTrain;
    let originalLive = railAwareService.provider.getLiveTrainProgress;
    
    if (setupMock) {
        setupMock();
    }
    
    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng })
      });
      const data = await res.json();
      console.log(JSON.stringify(data, null, 2));
    } catch(e) {
      console.log(`Error: ${e.message}`);
    } finally {
      railAwareService.discoveryService.discoverTrain = originalDiscover;
      railAwareService.provider.getLiveTrainProgress = originalLive;
    }
  };

  const { createTrain } = require('./domain/models/Train.js');
  const { createStation } = require('./domain/models/Station.js');
  const { createJourney } = require('./domain/models/Journey.js');

  // Scenario A: Topology unresolved
  await runScenario('A: Topology unresolved', 26.9300, 75.8000, () => {
    railAwareService.discoveryService.discoverTrain = async () => {
        return { trainTarget: null, journey: null, corridor: null, discoveredTrains: [], providerError: null };
    };
  });

  // Scenario B: Verified corridor. Zero trains returned.
  await runScenario('B: Verified corridor. Zero trains returned.', 26.9205, 75.7876, () => {
     railAwareService.discoveryService.discoverTrain = async () => {
        return { 
           trainTarget: null, 
           journey: null, 
           corridor: { resolutionStatus: 'RESOLVED', stationResolutionDetails: { confidence: 'HIGH' } }, 
           discoveredTrains: [], 
           providerError: null 
        };
     };
  });

  // Scenario C: Verified corridor. One active train. (Distant)
  await runScenario('C: Verified corridor. One active train.', 26.9205, 75.7876, () => {
     railAwareService.discoveryService.discoverTrain = async () => {
        return { 
           trainTarget: '12903', 
           journey: createJourney({
             id: 'test',
             train: createTrain({ number: '12903', name: 'Test', startDate: '2026' }),
             targetStation: createStation({ code: 'JP', name: 'Jaipur' }),
             userId: 'test'
           }), 
           corridor: { 
             resolutionStatus: 'RESOLVED',
             stationResolutionDetails: { confidence: 'HIGH' },
             stations: [
                { feature: { station: { code: 'DPA' } }, alongTrackDistanceMetres: 0 },
                { feature: { station: { code: 'JP' } }, alongTrackDistanceMetres: 10000 }
             ]
           }, 
           discoveredTrains: [{id: '12903'}], 
           providerError: null 
        };
     };
     railAwareService.provider.getLiveTrainProgress = async () => ({
        id: '12903', status: 'running', previousStation: 'DPA', nextStation: 'JP', segmentProgress: 0.1, lastUpdatedAt: new Date().toISOString()
     });
  });

  // Scenario D: Train approaching target station.
  await runScenario('D: Train approaching target station.', 26.9205, 75.7876, () => {
     railAwareService.discoveryService.discoverTrain = async () => {
        return { 
           trainTarget: '12903', 
           journey: createJourney({
             id: 'test',
             train: createTrain({ number: '12903', name: 'Test', startDate: '2026' }),
             targetStation: createStation({ code: 'JP', name: 'Jaipur' }),
             userId: 'test'
           }), 
           corridor: { 
             resolutionStatus: 'RESOLVED',
             stationResolutionDetails: { confidence: 'HIGH' },
             stations: [
                { feature: { station: { code: 'DPA' } }, alongTrackDistanceMetres: 0 },
                { feature: { station: { code: 'JP' } }, alongTrackDistanceMetres: 10000 }
             ]
           }, 
           discoveredTrains: [{id: '12903'}], 
           providerError: null 
        };
     };
     railAwareService.provider.getLiveTrainProgress = async () => ({
        id: '12903', status: 'running', previousStation: 'DPA', nextStation: 'JP', segmentProgress: 0.98, lastUpdatedAt: new Date().toISOString()
     });
  });

  // Scenario E: Train at station.
  await runScenario('E: Train at station.', 26.9205, 75.7876, () => {
     railAwareService.discoveryService.discoverTrain = async () => {
        return { 
           trainTarget: '12903', 
           journey: createJourney({
             id: 'test',
             train: createTrain({ number: '12903', name: 'Test', startDate: '2026' }),
             targetStation: createStation({ code: 'JP', name: 'Jaipur' }),
             userId: 'test'
           }), 
           corridor: { 
             resolutionStatus: 'RESOLVED',
             stationResolutionDetails: { confidence: 'HIGH' },
             stations: [
                { feature: { station: { code: 'DPA' } }, alongTrackDistanceMetres: 0 },
                { feature: { station: { code: 'JP' } }, alongTrackDistanceMetres: 10000 }
             ]
           }, 
           discoveredTrains: [{id: '12903'}], 
           providerError: null 
        };
     };
     railAwareService.provider.getLiveTrainProgress = async () => ({
        id: '12903', status: 'arrived', previousStation: 'JP', nextStation: null, segmentProgress: 0.0, lastUpdatedAt: new Date().toISOString()
     });
  });

  server.close();
}

runValidation().catch(console.error);
