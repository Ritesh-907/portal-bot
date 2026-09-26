function stripTags(s) {
  return s.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

// Ported from "Parse Home".
function parseHome(html) {
  function extractStat(label) {
    const re = new RegExp(`${label}\\s*</p>[\\s\\S]*?<h5>(\\d+)</h5>`);
    const m = html.match(re);
    return m ? parseInt(m[1], 10) : null;
  }

  const total = extractStat('Total');
  const present = extractStat('Present');
  const absent = extractStat('Absent');
  const dateMatch = html.match(/Today's Class\s*<small>\s*\(([^)]+)\)/);

  return {
    date: dateMatch ? dateMatch[1] : null,
    totalClasses: total,
    present,
    absent,
    percentage: total ? ((present / total) * 100).toFixed(1) : null,
  };
}

// Ported from "Parse Courses1".
function parseCourses(html) {
  if (!html) return [];

  const tableMatch = html.match(/<table id="table1"[\s\S]*?<\/table>/);
  if (!tableMatch) return [];

  const rows = [...tableMatch[0].matchAll(/<tr[^>]*class="alert alert-\w+"[^>]*>([\s\S]*?)<\/tr>/g)];
  if (rows.length === 0) return [];

  return rows.map((r) => {
    const cells = [...r[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => stripTags(c[1]));
    return {
      courseName: cells[1],
      courseCode: cells[2],
      type: cells[3],
      instructor: cells[4],
      delivered: cells[6],
      attended: cells[7],
      percentage: cells[10],
    };
  });
}

// Ported from "Parse FullAttendance".
function parseFullAttendance(html) {
  const rows = [...html.matchAll(/<th width="200px">([^<]+)<\/th>([\s\S]*?)(?=<tr>|<\/tbody>)/g)];

  return rows.map((r) => {
    const dayLabel = r[1].trim();
    const periods = [...r[2].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)]
      .map((c) => {
        const cell = c[1];
        const statusMatch = cell.match(/astatus-(\w+)[^>]*>\s*(\w)/);
        const subjectMatch = cell.match(/<strong>\s*([^<]+?)\s*<\/strong>\s*([^<]*)/);
        if (!statusMatch) return null;
        return {
          status: statusMatch[2],
          statusColor: statusMatch[1],
          subjectCode: subjectMatch ? subjectMatch[1].trim() : null,
          topic: subjectMatch ? subjectMatch[2].trim() : null,
        };
      })
      .filter(Boolean);
    return { day: dayLabel, periods };
  });
}

// Ported from "Parse Timetable" / "Parse Timetable NextWeek".
// Returns a plain array of day objects; the caller decides how to combine weeks.
function parseTimetable(html) {
  const tableMatch = html.match(/<table id="table"[\s\S]*?<\/table>/);
  if (!tableMatch) {
    throw new Error('Timetable table not found — session may be expired.');
  }

  const rowMatches = [...tableMatch[0].matchAll(/<tr>([\s\S]*?)<\/tr>/g)];
  const headerChunks = rowMatches[0][1].split(/<th[^>]*>/).slice(1);
  const periodTimes = headerChunks.map((c) => stripTags(c)).slice(1);

  const days = [];
  for (let i = 1; i < rowMatches.length; i++) {
    const rowContent = rowMatches[i][1];
    const dayLabelMatch = rowContent.match(/<th[^>]*>([^<]+)<\/th>/);
    const dayLabel = dayLabelMatch ? stripTags(dayLabelMatch[1]) : `Row ${i}`;

    if (/badgeholiday/.test(rowContent)) {
      days.push({ day: dayLabel, holiday: true, periods: [] });
      continue;
    }

    const cellMatches = [...rowContent.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)];
    const periods = cellMatches
      .map((c, idx) => {
        const cell = c[1];
        const subjectMatch = cell.match(/<p>\s*([\w]+)\s*-\s*([^<]+?)\s*<\/p>/);
        if (!subjectMatch) return null;
        const roomMatch = cell.match(/title="Room Number">([^<]+)</);
        const piMatch = cell.match(/title="PI">([^<]+)</);
        return {
          time: periodTimes[idx] || null,
          code: subjectMatch[1].trim(),
          subject: subjectMatch[2].trim(),
          room: roomMatch ? roomMatch[1].trim() : null,
          instructor: piMatch ? piMatch[1].trim() : null,
        };
      })
      .filter(Boolean);

    days.push({ day: dayLabel, holiday: false, periods });
  }

  return days;
}

module.exports = { parseHome, parseCourses, parseFullAttendance, parseTimetable, stripTags };
