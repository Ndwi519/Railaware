const express = require('express');
const SimulationRunner = require('../simulation/SimulationRunner.js');
const EvaluationRecorder = require('../simulation/EvaluationRecorder.js');
const MetricsEngine = require('../metrics/MetricsEngine.js');
const ReportGenerator = require('../reports/ReportGenerator.js');
const ScenarioRegistry = require('../scenarios/registry.js');
const EvaluationMapper = require('./EvaluationMapper.js');

const router = express.Router();
const registry = new ScenarioRegistry();
// Pre-load scenarios asynchronously
registry.loadAll().catch(console.error);

router.get('/scenarios', (req, res) => {
  const all = registry.getAll();
  res.json(all.map(s => ({
    id: s.id,
    name: s.name,
    description: s.description,
    ticksCount: s.ticks.length
  })));
});

router.post('/run', async (req, res) => {
  const { scenarioId } = req.body;
  if (!scenarioId) return res.status(400).json({ error: 'scenarioId required' });

  const scenario = registry.get(scenarioId);
  if (!scenario) return res.status(404).json({ error: 'Scenario not found' });

  try {
    const runner = new SimulationRunner();
    const recorder = new EvaluationRecorder();

    // Execute scenario and collect objective/subjective records
    await runner.executeScenario(scenario, recorder);

    // Calculate metrics based on ADR 0007 taxonomy
    const metricsEngine = new MetricsEngine();
    const rawMetrics = metricsEngine.calculate(scenario, recorder.getRecords());

    // Generate Report
    const reportGenerator = new ReportGenerator();
    const report = reportGenerator.generate(scenario, rawMetrics);

    const mappedRecords = recorder.getRecords().map(record => ({
      ...record,
      pipelineResult: EvaluationMapper.mapResult(record.pipelineResult)
    }));

    res.json({
      success: true,
      report,
      records: mappedRecords // Optional: return trace for UI visualization
    });
  } catch (error) {
    console.error('Scenario execution failed', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
