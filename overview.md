# Backlog Quick Export

Add an **Export** tab to the product backlog that downloads the current backlog level — with hierarchy and Task rollups — to CSV or Excel in one click.

## What it does
- Adds an **Export** tab on the product backlog
- Downloads the whole current backlog level, preserving parent/child **hierarchy**
- Includes computed **Task rollup** sums
- One-click export to **CSV** or **Excel**

## Where to find it
- **Boards → Backlogs →** open a backlog **→ Export** tab

## Compatibility
- Azure DevOps Server **2022** and **2020** (on-premises) — built and tested
- Loads on application version **17.0+** (`Microsoft.TeamFoundation.Server [17.0,)`), including Azure DevOps Server 2019
- Pure client-side (REST `api-version=6.0`, SDK-injected token); no server components

## Author
By **iksoftware**.
