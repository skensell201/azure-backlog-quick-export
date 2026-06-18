# Backlog Quick Export

An Azure DevOps Server 2022 (on-prem) extension that adds an **Export** tab to the product
backlog. Open a team's backlog, switch to the Export tab, pick a level, and download the
**whole backlog level** to CSV or Excel — with the work-item hierarchy and Task rollup sums,
without selecting individual items.

## Features

- **Export tab** on the product backlog page (next to *Backlog* / *Analytics*).
- Exports the entire current backlog level — no per-item selection.
- **Hierarchy preserved**: descendants are nested under their backlog item (depth-first),
  with the Title indented per level so the tree is visible in the file.
- **Native-grid columns** (minus Story Points): Order, Work Item Type, Title, State,
  Value Area, Iteration Path, Tags, Sum of Task Original Estimate, Sum of Task Completed
  Work, ID.
- **Task rollups**: `Sum of Task Original Estimate` and `Sum of Task Completed Work` are
  summed from each item's descendant Tasks.
- CSV is UTF-8 with BOM and hardened against spreadsheet formula injection; Excel is a
  real `.xlsx`.
- Pure client-side: TypeScript + React, SDK-injected token, REST `api-version=6.0`.

## How it works

The tab runs on the backlog page and reads the current project + team from the Azure DevOps
SDK (`getWebContext()`), not the URL. It resolves the chosen backlog level, fetches the
level's work items and their descendants, computes Task rollups, builds the hierarchy, and
writes a CSV/XLSX download.

```
BacklogService.getBacklogWorkItemIds (level)
  -> WorkItemService.getDescendants (recursive WIQL)
  -> WorkItemService.getFieldsBatch (chunks)
  -> computeRollups (pure) -> buildTree (pure) -> flattenTreeForExport (pure)
  -> ExportService (CSV BOM + de-formula / xlsx)
```

The pure functions carry the tests.

## Build

```bash
npm install
npm test            # jest
npm run typecheck   # tsc --noEmit
npm run build       # webpack -> dist/
npm run package     # build + tfx -> out/local.workitems-quickexport-<version>.vsix
```

`npm run package` requires the [tfx-cli](https://github.com/microsoft/tfs-cli) (installed as
a dev dependency).

## Install (Azure DevOps Server 2022)

1. Build the VSIX: `npm run package`.
2. Upload `out/local.workitems-quickexport-<version>.vsix` to your collection's **Manage
   Extensions** gallery and install it to the collection.
3. Open a team's **Boards → Backlogs** page and select the **Export** tab.

The extension requests the `vso.work`, `vso.project`, and `vso.identity` scopes.

## License

MIT — see [LICENSE](LICENSE).
