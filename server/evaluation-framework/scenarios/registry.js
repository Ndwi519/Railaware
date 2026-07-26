const fs = require('fs');
const path = require('path');
const { ScenarioSchema } = require('./models.js');

class ScenarioRegistry {
  constructor(dataDirectory) {
    this.dataDirectory = dataDirectory || path.join(__dirname, '../data/scenarios');
    this.scenarios = new Map();
  }

  async loadAll() {
    try {
      await fs.promises.mkdir(this.dataDirectory, { recursive: true });
      const files = await fs.promises.readdir(this.dataDirectory);

      for (const file of files) {
        if (file.endsWith('.json')) {
          await this.loadScenario(path.join(this.dataDirectory, file));
        }
      }
    } catch (error) {
      console.error(`Failed to load scenarios from ${this.dataDirectory}:`, error);
    }
  }

  async loadScenario(filePath) {
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      const raw = JSON.parse(content);
      const scenario = ScenarioSchema.parse(raw);
      this.scenarios.set(scenario.id, scenario);
      return scenario;
    } catch (error) {
      console.error(`Failed to parse scenario ${filePath}:`, error);
      throw error;
    }
  }

  get(id) {
    return this.scenarios.get(id);
  }

  getAll() {
    return Array.from(this.scenarios.values());
  }
}

module.exports = ScenarioRegistry;
