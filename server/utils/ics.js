function esc(text=""){ return String(text).replace(/([,;])/g, "\\$1").replace(/\n/g, "\\n"); }

function dtstampUTC(d=new Date()){
  // YYYYMMDDTHHMMSSZ
  const pad=(n)=>String(n).padStart(2,"0");
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

function dtUTC(d){
  const pad=(n)=>String(n).padStart(2,"0");
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

/**
 * Build single VEVENT (UTC) – Outlook/Google mõlemad mõistavad.
 * @param {Object} e
 * @param {string} e.uid   unique id (e.g. db id + domain)
 * @param {Date} start
 * @param {Date} end
 * @param {string} summary
 * @param {string} description
 * @param {string} location
 */
function vevent({ uid, start, end, summary, description, location }) {
  return [
    "BEGIN:VEVENT",
    `UID:${esc(uid)}`,
    `DTSTAMP:${dtstampUTC(new Date())}`,
    `DTSTART:${dtUTC(start)}`,
    `DTEND:${dtUTC(end)}`,
    `SUMMARY:${esc(summary)}`,
    description ? `DESCRIPTION:${esc(description)}` : null,
    location ? `LOCATION:${esc(location)}` : null,
    "END:VEVENT"
  ].filter(Boolean).join("\r\n");
}

function wrapCalendar(vevents, { prodId = "-//AutoService//Appointments//EN" } = {}){
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${prodId}`,
    "CALSCALE:GREGORIAN",
    ...vevents,
    "END:VCALENDAR"
  ].join("\r\n");
}

module.exports = { vevent, wrapCalendar };
