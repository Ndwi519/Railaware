const { createRailAwareService } = require('./application/bootstrap/createRailAwareService.js');
const express = require('express');
const cors = require('cors');

async function runValidation() {
  console.log('--- Real Location Validation Report ---\n');

  // 1. Stand up the exact Express pipeline
  const app = express();
  app.use(express.json());
  
  const apiKey = process.env.RAILRADAR_KEY;
  if (!apiKey) {
    console.error('FATAL: RAILRADAR_KEY environment variable is required to run live provider tests.');
    process.exit(1);
  }

  const config = {
    overpassUrl: 'https://overpass-api.de/api/interpreter',
    railradarKey: apiKey,
    nodeEnv: 'test'
  };

  const railAwareService = createRailAwareService(config);

  app.post('/api/v1/observation', async (req, res) => {
    try {
      const response = await railAwareService.evaluateLocation('test-session', req.body.lat, req.body.lng);
      res.json(response);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  const server = app.listen(3002);
  const apiUrl = 'http://localhost:3002/api/v1/observation';

  const testLocation = async (name, lat, lng, setupMock = null) => {
    console.log(`\nScenario: ${name} [${lat}, ${lng}]`);
    let originalDiscover = railAwareService.discoveryService.discoverTrain;
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
      console.log(`HTTP Status: ${res.status}`);
      console.log(`Awareness Status: ${data.awareness?.status}`);
      console.log(`Trains Found: ${data.trains?.length || 0}`);
      if (data.metadata?.providerError) {
         console.log(`Provider Error: ${data.metadata.providerError}`);
      }
      if (data.corridor) {
         console.log(`Corridor Status: ${data.corridor.resolutionStatus}`);
      } else {
         console.log(`Corridor: NOT FOUND`);
      }
    } catch(e) {
      console.log(`Error: ${e.message}`);
    } finally {
        if (setupMock) {
           railAwareService.discoveryService.discoverTrain = originalDiscover;
        }
    }
  };

  // 1. No Corridor Case (e.g., middle of a random field)
  await testLocation('No Corridor', 26.9300, 75.8000, () => {
    railAwareService.discoveryService.discoverTrain = async () => {
        return { trainTarget: null, journey: null, corridor: null, discoveredTrains: [], providerError: null };
    };
  });

  // 2. Corridor Found & Provider Success Case (Jaipur Junction)
  await testLocation('Corridor Found + Provider Success (Jaipur Junction)', 26.9205, 75.7876, () => {
     railAwareService.discoveryService.discoverTrain = async () => {
        const { createTrain } = require('./domain/models/Train.js');
        const { createStation } = require('./domain/models/Station.js');
        const { createJourney } = require('./domain/models/Journey.js');
        return { 
           trainTarget: '12903', 
           journey: createJourney({
             id: 'test',
             train: createTrain({ number: '12903', name: 'Test', startDate: '2026' }),
             targetStation: createStation({ code: 'JP', name: 'Jaipur' }),
             userId: 'test'
           }), 
           corridor: { resolutionStatus: 'RESOLVED' }, 
           discoveredTrains: [{id: '12903'}], 
           providerError: null 
        };
     };
     railAwareService.provider.getLiveTrainProgress = async () => ({
        id: '12903', status: 'running', previousStation: 'JP', segmentProgress: 0.8, lastUpdatedAt: new Date().toISOString()
     });
  });

  // 3. Overpass Timeout Case
  await testLocation('Overpass Timeout (504)', 26.9205, 75.7876, () => {
     railAwareService.discoveryService.discoverTrain = async () => {
         throw new Error('Overpass API timeout');
     };
  });

  // 4. Overpass Rate-Limit Case
  await testLocation('Overpass Rate Limit (429)', 26.9205, 75.7876, () => {
     railAwareService.discoveryService.discoverTrain = async () => {
         throw new Error('Overpass API rate limit exceeded');
     };
  });

  server.close();
  console.log('\n--- Validation Complete ---');
}

runValidation().catch(console.error);
