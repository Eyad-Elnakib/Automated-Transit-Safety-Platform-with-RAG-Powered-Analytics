function toUTCDateParts(ts = new Date()) {
  const iso = ts.toISOString();
  const date = iso.slice(0, 10);
  const time = iso.slice(11, 19);
  return { iso, date, time };
}

function toFilenameTimestamp(ts = new Date()) {
  const iso = ts.toISOString();
  const date = iso.slice(0, 10); // YYYY-MM-DD
  const time = iso.slice(11, 19).replace(/:/g, '-'); // HH-mm-ss
  return `${date}_${time}`;
}

module.exports = {
  toUTCDateParts,
  toFilenameTimestamp
};

