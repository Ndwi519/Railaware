/**
 * Validates the assembled geometry to ensure compliance with architectural contracts.
 *
 * @param {Array<Array<{lat: number, lng: number}>>} segments The assembled geometry
 * @returns {{isValid: boolean, errors: string[]}} Validation result
 */
function validateGeometry(segments) {
  const errors = [];

  if (!Array.isArray(segments)) {
    return { isValid: false, errors: ['Geometry must be an array of segments.'] };
  }

  for (let s = 0; s < segments.length; s++) {
    const segment = segments[s];
    if (!Array.isArray(segment)) {
      errors.push(`Segment ${s} is not an array.`);
      continue;
    }

    if (segment.length < 2) {
      errors.push(`Segment ${s} has less than 2 coordinates (cannot form a valid vector).`);
    }

    for (let i = 0; i < segment.length; i++) {
      const coord = segment[i];
      if (!coord || typeof coord.lat !== 'number' || typeof coord.lng !== 'number') {
        errors.push(`Segment ${s} contains invalid coordinate at index ${i}.`);
      } else if (i > 0) {
        const prev = segment[i - 1];
        if (prev.lat === coord.lat && prev.lng === coord.lng) {
          errors.push(`Segment ${s} contains a zero-length segment (duplicate coordinate) at index ${i}.`);
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

module.exports = {
  validateGeometry
};
