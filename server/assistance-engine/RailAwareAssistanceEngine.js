const { deepFreeze } = require('../utils/deepFreeze.js');

/**
 * @module assistance-engine/RailAwareAssistanceEngine
 * @responsibility Consumer of the awareness state that deterministically generates safety guidance and emergency contact actions.
 */
class RailAwareAssistanceEngine {
  /**
   * @param {Object} config
   * @param {string|null} config.emergencyPhoneNumber - The configured emergency number, if any.
   */
  constructor(config) {
    this.emergencyPhoneNumber = config?.emergencyPhoneNumber || null;
  }

  /**
   * Generates the assistance payload based on the provided awareness state.
   * @param {Object|null} awareness - The evaluated awareness object (can be null if off-corridor).
   * @returns {Object} Immutable assistance payload.
   */
  generateAssistance(awareness) {
    const status = awareness?.status || null;
    const { title, instructions } = this._getGuidanceForStatus(status);

    const availableActions = [];
    let emergencyContact = null;

    if (this.emergencyPhoneNumber) {
      availableActions.push('DIAL_EMERGENCY');
      emergencyContact = {
        number: this.emergencyPhoneNumber,
        description: 'Emergency Services'
      };
    }

    return deepFreeze({
      emergencyContact,
      guidance: {
        title,
        instructions
      },
      availableActions
    });
  }

  /**
   * Deterministically maps an awareness status to guidance text.
   * @param {string|null} status
   * @returns {{title: string, instructions: string[]}}
   * @private
   */
  _getGuidanceForStatus(status) {
    switch (status) {
      case null:
        return {
          title: 'General Guidance',
          instructions: ['Stay clear of railway tracks.', 'Maintain situational awareness.']
        };
      case 'UNKNOWN':
        return {
          title: 'Status Unavailable',
          instructions: ['Train data is currently unavailable for this location.', 'Railway tracks should always be treated with caution.']
        };
      case 'NO_TRAINS_FOUND':
        return {
          title: 'Zero Trains Reported',
          instructions: ['No active trains detected in this area.', 'Remain alert.']
        };
      case 'DISTANT':
        return {
          title: 'Train Approaching',
          instructions: ['Train approaching in the distance.', 'Do not enter the track area.']
        };
      case 'APPROACHING_STATION':
        return {
          title: 'Train Arriving',
          instructions: ['Train is arriving.', 'Move away from the platform edge.']
        };
      case 'AT_STATION':
        return {
          title: 'Train At Station',
          instructions: ['Train is at the station.', 'Stand back from the doors.']
        };
      case 'CANCELLED':
        return {
          title: 'Train Cancelled',
          instructions: ['Scheduled train is cancelled.', 'Normal track rules apply.']
        };
      default:
        // Fallback for any unanticipated states to ensure safe degradation
        return {
          title: 'General Guidance',
          instructions: ['Stay clear of railway tracks.', 'Maintain situational awareness.']
        };
    }
  }
}

module.exports = RailAwareAssistanceEngine;
