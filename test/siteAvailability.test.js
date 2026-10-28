const assert = require('node:assert/strict');
const test = require('node:test');

const {
  prepareSitesForDistribution
} = require('../lib/siteAvailability');

test('distribution prioritizes uncrawled sites, oldest crawl, then newest update', () => {
  const sites = prepareSitesForDistribution([
    { judolSite: 'a-old-update.example', lastCrawl: null, lastUpdateDate: '2026-10-26' },
    { judolSite: 'z-new-update.example', lastCrawl: null, lastUpdateDate: '2026-10-28' },
    { judolSite: 'a-crawled.example', lastCrawl: '2026-10-20', lastUpdateDate: '2026-10-25' },
    { judolSite: 'z-crawled.example', lastCrawl: '2026-10-20', lastUpdateDate: '2026-10-27' },
    { judolSite: 'recent-crawl.example', lastCrawl: '2026-10-25', lastUpdateDate: '2026-10-28' }
  ]);

  assert.deepEqual(sites.map((site) => site.judolSite), [
    'z-new-update.example',
    'a-old-update.example',
    'z-crawled.example',
    'a-crawled.example',
    'recent-crawl.example'
  ]);
});

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
