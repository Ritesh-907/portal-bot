# Implementation notes: n8n → Node.js mapping

## Portal Automation workflow

| n8n node | Node.js equivalent |
|---|---|
| Start (executeWorkflowTrigger) | `runPortalAutomation()` call from the bot's `/start` handler |
| Send OTP | `src/automation/login.js` → `sendOtp()` |
| extract Cokkie | not needed — `httpClient.js`'s cookie jar does this automatically |
| Wait | `await delay(config.otp.initialWaitMs)` |
| Get OTP (Gmail) | `src/gmail/fetchOtp.js` → `fetchOtpFromGmail()` (with retry/backoff added) |
| Parse OTP System_id | OTP regex now lives inside `fetchOtpFromGmail()` |
| Login | `src/automation/login.js` → `login()` |
| Extract Cookie | not needed — same cookie jar |
| Get Home / Get Courses / Get FullAttendance / Get Timetable | `src/automation/scrape.js` |
| Compute Next Week | `src/automation/isoWeek.js` → `getISOWeek()` |
| HTTP Request (next week timetable) | `scrape.js` → `getTimetable(client, week)` — **see bug fix below** |
| Parse Home / Parse Courses1 / Parse FullAttendance / Parse Timetable / Parse Timetable NextWeek | `src/automation/parsers.js` |
| Merge / Merge1 / Build Snapshot | plain object literal inside `runPortalAutomation()` |
| Save Snapshot (Google Sheets) | `src/store/jsonStore.js` (default) or `src/store/sheetsStore.js` |

## Telegram Bot workflow

| n8n node | Node.js equivalent |
|---|---|
| Telegram Trigger | `telegraf`'s long polling (`bot.launch()`) |
| Parse Command | inline in `commands.js` (`text = message.text.trim().toLowerCase()`) |
| Switch | if/else chain in `commands.js`, same priority order |
| Send Refreshing... / Run Portal Automation / Send Refresh Done | the `/start` branch in `commands.js` |
| Get Snapshot (Timetable) / Format Timetable / Send Timetable Reply | the `timetable` branch → `formatters/timetable.js` |
| Get Snapshot (Attendance) / Format Attendance / Send Attendance Reply | the `attendance` branch → `formatters/attendance.js` |
| Help Reply / Send Help Reply | the fallback branch → `formatters/help.js` |

## Bug found and fixed

The original workflow's `HTTP Request` node (next week's timetable) had:

```json
"bodyParameters": {
  "parameters": [
    { "name": "=week={{ $json.week }}" },
    { "name": "=Cookie: ={{ $json.cookie }}" }
  ]
}
```

Both the week value and the auth cookie were pasted into the **parameter
name** field instead of a value/header — n8n would have sent two empty-valued
body fields named `week=7` and `Cookie: =abc123...`, not an actual `week`
field or `Cookie` header. That request likely wasn't authenticating.

Fixed in `src/automation/scrape.js`: `week` is sent as a real body field, and
authentication is handled the normal way — automatically, via the shared
cookie jar — instead of a manually reconstructed header.

## Other behavior preserved exactly

- All HTML-scraping regexes are unchanged from the original Code nodes.
- The timetable natural-language matching ("today", "tomorrow", "next
  monday", etc.) is unchanged from "Format Timetable".
- Reply wording and emoji are unchanged.
