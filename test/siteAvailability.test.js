const assert = require('node:assert/strict');
const test = require('node:test');

const {
  prepareSitesForDistribution
} = require('../lib/siteAvailability');

test('prepareSitesForDistribution excludes inactive legacy status values', () => {
  const sites = prepareSitesForDistribution([
    { judolSite: 'active.example', status: true },
    { judolSite: 'inactive-string.example', status: 'Inactive' },
    { judolSite: 'false-string.example', status: 'false' },
    { judolSite: 'zero-string.example', status: '0' },
    { judolSite: 'false-boolean.example', status: false }
  ]);

  assert.deepEqual(
    sites.map((site) => site.judolSite),
    ['active.example']
  );
});
