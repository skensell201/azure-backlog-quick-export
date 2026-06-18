import { pickDefaultLevel } from '../levelSelect';
import { NamedRef } from '../../models/types';

const LEVELS: NamedRef[] = [
  { id: 'Microsoft.EpicCategory', name: 'Epics' },
  { id: 'Microsoft.FeatureCategory', name: 'Features' },
  { id: 'Microsoft.RequirementCategory', name: 'Stories' },
];

describe('pickDefaultLevel', () => {
  it('returns the level matching the preferred name (case-insensitive)', () => {
    expect(pickDefaultLevel(LEVELS, 'epics')).toEqual({ id: 'Microsoft.EpicCategory', name: 'Epics' });
  });

  it('falls back to the requirement (product) backlog when preferred is unknown', () => {
    expect(pickDefaultLevel(LEVELS, 'Nope')).toEqual({ id: 'Microsoft.RequirementCategory', name: 'Stories' });
  });

  it('uses the requirement backlog when no preferred name is given', () => {
    expect(pickDefaultLevel(LEVELS)).toEqual({ id: 'Microsoft.RequirementCategory', name: 'Stories' });
  });

  it('falls back to the first level when there is no requirement category', () => {
    const portfolio: NamedRef[] = [
      { id: 'Custom.EpicCategory', name: 'Initiatives' },
      { id: 'Custom.FeatureCategory', name: 'Features' },
    ];
    expect(pickDefaultLevel(portfolio)).toEqual({ id: 'Custom.EpicCategory', name: 'Initiatives' });
  });

  it('returns undefined for an empty level list', () => {
    expect(pickDefaultLevel([])).toBeUndefined();
  });
});
