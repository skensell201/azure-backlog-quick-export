import { NamedRef } from '../models/types';

/** The id of the product (requirement) backlog level in a default process. */
const REQUIREMENT_CATEGORY = 'Microsoft.RequirementCategory';

/**
 * Picks which backlog level to pre-select for export:
 * the level matching the current view name when known, else the product
 * (requirement) backlog, else the first available level.
 */
export function pickDefaultLevel(levels: NamedRef[], preferredName?: string): NamedRef | undefined {
  if (levels.length === 0) return undefined;
  if (preferredName) {
    const match = levels.find((l) => l.name.toLowerCase() === preferredName.toLowerCase());
    if (match) return match;
  }
  return levels.find((l) => l.id === REQUIREMENT_CATEGORY) ?? levels[0];
}
