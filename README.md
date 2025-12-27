# Stats
Brafa stats

## Updates

- **2025-12-27:** Fixed an issue where the match date was not displaying correctly in player detail view. The root cause was that the `time` field from the match JSON data was not being propagated to the player's match history. This has been corrected, and the date is now displayed using the `time` field.
- **2025-12-27:** Implemented Spanish date formatting (DD/MM/YYYY HH:MM AM/PM) for match dates in the player detail view.
- **2025-12-27:** Changed KPI in player cards on the initial screen from "Faltas" (Fouls) to "PPG" (Puntos por Partido - Points Per Game).
