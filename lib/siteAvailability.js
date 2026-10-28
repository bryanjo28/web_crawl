function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') return defaultValue;
  if (typeof value === 'boolean') return value;

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (!normalized || normalized === '-' || normalized === 'n/a') return defaultValue;
    if (['true', '1', 'y', 'yes', 'active'].includes(normalized)) return true;
    if (['false', '0', 'n', 'no', 'inactive'].includes(normalized)) return false;
  }

  return Boolean(value);
}

function normalizeJudolSiteValue(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeSiteDocument(site) {
  const plainSite = site && typeof site.toObject === 'function' ? site.toObject() : site;
  if (!plainSite) return plainSite;

  return {
    ...plainSite,
    judolSite: plainSite.judolSite || plainSite.url || '',
    title: plainSite.title || '',
    username: plainSite.username || '',
    password: plainSite.password || '',
    flagJudol: parseBoolean(plainSite.flagJudol, false),
    status: parseBoolean(plainSite.status, true),
    assetSite: plainSite.assetSite || '',
    lastCrawl: plainSite.lastCrawl || plainSite.lastScan || null,
    lastUpdateBy: plainSite.lastUpdateBy || '',
    lastUpdateDate: plainSite.lastUpdateDate || plainSite.lastUpdate || null
  };
}

function compareSitesForDistribution(a, b) {
  const aHasLastCrawl = Boolean(a.lastCrawl);
  const bHasLastCrawl = Boolean(b.lastCrawl);

  if (aHasLastCrawl !== bHasLastCrawl) {
    return aHasLastCrawl ? 1 : -1;
  }

  const aTime = a.lastCrawl ? new Date(a.lastCrawl).getTime() : 0;
  const bTime = b.lastCrawl ? new Date(b.lastCrawl).getTime() : 0;

  if (aTime !== bTime) return aTime - bTime;

  // For equal crawl dates (including uncrawled sites), prefer the latest update.
  const aUpdate = a.lastUpdateDate ? new Date(a.lastUpdateDate).getTime() : 0;
  const bUpdate = b.lastUpdateDate ? new Date(b.lastUpdateDate).getTime() : 0;

  if (aUpdate !== bUpdate) return bUpdate - aUpdate;
  return String(a.judolSite || '').localeCompare(String(b.judolSite || ''), 'id');
}

function isSiteAvailableForDistribution(site) {
  return Boolean(normalizeJudolSiteValue(site?.judolSite)) && site?.status === true;
}

function prepareSitesForDistribution(sites = []) {
  return sites
    .map(normalizeSiteDocument)
    .filter(isSiteAvailableForDistribution)
    .sort(compareSitesForDistribution);
}

module.exports = {
  compareSitesForDistribution,
  isSiteAvailableForDistribution,
  normalizeSiteDocument,
  parseBoolean,
  prepareSitesForDistribution
};
