function attachTaskDiscoveryDates(tasks, sites) {
  const normalize = value => String(value || '').trim().toLowerCase();
  const dates = new Map();
  for (const site of sites) {
    if (!site.tanggalTemuan) continue;
    for (const url of [site.judolSite, site.url]) {
      const key = normalize(url);
      if (key && !dates.has(key)) dates.set(key, site.tanggalTemuan);
    }
  }
  return tasks.map(task => ({
    ...task,
    tanggalTemuan: task.tanggalTemuan || dates.get(normalize(task.url)) || null
  }));
}

module.exports = { attachTaskDiscoveryDates };
