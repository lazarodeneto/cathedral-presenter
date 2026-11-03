# Calendar Weekday Highlight Design

## Intent

Allow an administrator to choose one recurring weekday for the calendar to emphasize, so a church that usually holds services on Mondays can scan those dates quickly.

## Approach

Store one nullable weekday (`0` Sunday through `6` Saturday) in the existing persisted `AppSettings`. Add a compact dropdown to the calendar's right sidebar with a “None” option. Calendar cells compare their JavaScript weekday to the saved preference and receive a soft background when they match.

## Scope

- Include one selected weekday or no highlighted weekday.
- Persist the selection with the existing local workspace settings and backups.
- Keep the current-date selection styling stronger than the weekday hint.
- Add translated labels for the control and all weekday options.

## Non-goals

- Do not create recurring services automatically.
- Do not highlight more than one weekday.
- Do not change service creation, date selection, or event ordering behavior.
