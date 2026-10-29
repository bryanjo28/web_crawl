const assert = require('node:assert/strict');
const test = require('node:test');

const {
  prepareSitesForDistribution, buildAssignedSiteKeys, sitesAvailableOnDate
} = require('../lib/siteAvailability');

test('distribution only accepts sites flagged Judol Y, including legacy Y strings', () => {
  const sites = prepareSitesForDistribution([
    { judolSite: 'yes.example', flagJudol: true },
    { judolSite: 'legacy-yes.example', flagJudol: 'Y' },
    { judolSite: 'no.example', flagJudol: false },
    { judolSite: 'legacy-no.example', flagJudol: 'N' },
    { judolSite: 'missing.example' }
  ]);
  assert.deepEqual(sites.map(site => site.judolSite), ['legacy-yes.example', 'yes.example']);
});

test('availability counts unique URLs and excludes assignments only on the selected date', () => {
  const sites = prepareSitesForDistribution([
    { flagJudol: true, judolSite: 'A.example', tanggalTemuan: '2026-10-28' },
    { flagJudol: true, judolSite: ' a.example ', tanggalTemuan: '2026-10-27' },
    { flagJudol: true, judolSite: 'b.example' },
    { flagJudol: true, judolSite: 'crawled.example', lastCrawl: '2026-10-28' },
    { flagJudol: true, judolSite: 'inactive.example', status: false }
  ]);
  assert.equal(sites.length, 3);
  const assigned = buildAssignedSiteKeys([{ url: 'A.EXAMPLE', taskDate: '2026-10-29' }], value => value);
  assert.deepEqual(sitesAvailableOnDate(sites, assigned, '2026-10-29').map(site => site.judolSite), ['b.example', 'crawled.example']);
  assert.equal(sitesAvailableOnDate(sites, assigned, '2026-10-30').length, 3);
});

test('distribution uses newest tanggalTemuan first, regardless of last update', () => {
  const sites = prepareSitesForDistribution([
    { flagJudol: true, judolSite: 'missing.example', lastUpdateDate: '2026-12-01' },
    { flagJudol: true, judolSite: 'older.example', tanggalTemuan: '2026-10-01', lastUpdateDate: '2026-12-01' },
    { flagJudol: true, judolSite: 'newer.example', tanggalTemuan: '2026-10-10', lastUpdateDate: '2026-01-01' },
    { flagJudol: true, judolSite: 'crawled.example', tanggalTemuan: '2026-10-20', lastCrawl: '2026-10-21' }
  ]);
  assert.deepEqual(sites.map(site => site.judolSite), ['newer.example', 'older.example', 'missing.example', 'crawled.example']);
});

test('distribution uses crawled sites as fallback ordered by oldest crawl including legacy lastScan', () => {
  const sites = prepareSitesForDistribution([
    { flagJudol: true, judolSite: 'a-old-update.example', lastCrawl: null, lastUpdateDate: '2026-10-26' },
    { flagJudol: true, judolSite: 'z-new-update.example', lastCrawl: null, lastUpdateDate: '2026-10-28' },
    { flagJudol: true, judolSite: 'a-crawled.example', lastCrawl: '2026-10-20', lastUpdateDate: '2026-10-25' },
    { flagJudol: true, judolSite: 'z-crawled.example', lastCrawl: '2026-10-20', lastUpdateDate: '2026-10-27' },
    { flagJudol: true, judolSite: 'recent-crawl.example', lastCrawl: '2026-10-25', lastUpdateDate: '2026-10-28' },
    { flagJudol: true, judolSite: 'legacy-crawl.example', lastScan: '2026-10-20' },
    { flagJudol: true, judolSite: 'empty-crawl.example', lastCrawl: '', lastUpdateDate: '2026-10-25' },
    { flagJudol: true, judolSite: 'missing-crawl.example' }
  ]);

  assert.deepEqual(sites.map((site) => site.judolSite), [
    'z-new-update.example',
    'a-old-update.example',
    'empty-crawl.example',
    'missing-crawl.example',
    'z-crawled.example',
    'a-crawled.example',
    'legacy-crawl.example',
    'recent-crawl.example'
  ]);
});

test('fallback uses oldest crawl before newer discovery dates and only fills the requested remainder', () => {
  const sites = prepareSitesForDistribution([
    { judolSite: 'uncrawled-old.example', flagJudol: true, tanggalTemuan: '2026-01-01' },
    { judolSite: 'uncrawled-new.example', flagJudol: true, tanggalTemuan: '2026-10-29' },
    { judolSite: 'crawled-old.example', flagJudol: true, lastCrawl: '2026-09-01', tanggalTemuan: '2026-01-01' },
    { judolSite: 'crawled-new.example', flagJudol: true, lastCrawl: '2026-10-28', tanggalTemuan: '2026-10-29' }
  ]);
  assert.deepEqual(sites.slice(0, 3).map(site => site.judolSite), ['uncrawled-new.example', 'uncrawled-old.example', 'crawled-old.example']);
  const assigned = buildAssignedSiteKeys([{ taskDate: '2026-10-29', url: 'crawled-old.example' }], value => value);
  assert.deepEqual(sitesAvailableOnDate(sites, assigned, '2026-10-29').map(site => site.judolSite), ['uncrawled-new.example', 'uncrawled-old.example', 'crawled-new.example']);
});

test('prepareSitesForDistribution excludes inactive legacy status values', () => {
  const sites = prepareSitesForDistribution([
    { flagJudol: true, judolSite: 'active.example', status: true },
    { flagJudol: true, judolSite: 'inactive-string.example', status: 'Inactive' },
    { flagJudol: true, judolSite: 'false-string.example', status: 'false' },
    { flagJudol: true, judolSite: 'zero-string.example', status: '0' },
    { flagJudol: true, judolSite: 'false-boolean.example', status: false }
  ]);

  assert.deepEqual(
    sites.map((site) => site.judolSite),
    ['active.example']
  );
});
