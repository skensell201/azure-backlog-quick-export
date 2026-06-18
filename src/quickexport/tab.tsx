import './tab.css';
import * as SDK from 'azure-devops-extension-sdk';
import { CommonServiceIds, ILocationService } from 'azure-devops-extension-api';
import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { NamedRef } from '../models/types';
import { RestApiClient } from '../services/ApiClient';
import { BacklogService } from '../services/BacklogService';
import { WorkItemService } from '../services/WorkItemService';
import { buildBacklogTreeExport, TreeExportDeps } from './treeExport';
import { pickDefaultLevel } from './levelSelect';
import { detectLang, strings, Strings } from './i18n';

function triggerDownload(filename: string, data: string | Blob, mime: string): void {
  const blob = typeof data === 'string' ? new Blob([data], { type: mime }) : data;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

interface AppProps {
  deps: TreeExportDeps;
  project: string;
  team: string;
  collectionUrl: string;
  levels: NamedRef[];
  defaultLevel: string;
  t: Strings;
}

function App({ deps, project, team, collectionUrl, levels, defaultLevel, t }: AppProps): JSX.Element {
  const [level, setLevel] = useState(defaultLevel);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function download(format: 'csv' | 'excel'): Promise<void> {
    setBusy(true);
    setError('');
    try {
      const payload = await buildBacklogTreeExport(deps, { project, team, level, format, collectionUrl });
      triggerDownload(payload.filename, payload.data, payload.mime);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="qe-tab">
      <h2>{t.heading}</h2>
      <p className="qe-sub">
        {t.team}: <strong>{team}</strong>
      </p>
      <label className="qe-field">
        {t.level}
        <select value={level} onChange={(e) => setLevel(e.target.value)} disabled={busy}>
          {levels.map((l) => (
            <option key={l.id} value={l.name}>
              {l.name}
            </option>
          ))}
        </select>
      </label>
      <div className="qe-buttons">
        <button className="qe-btn" disabled={busy} onClick={() => download('csv')}>
          {t.downloadCsv}
        </button>
        <button className="qe-btn" disabled={busy} onClick={() => download('excel')}>
          {t.downloadExcel}
        </button>
      </div>
      <p className="qe-hint">
        <span className="qe-hint-icon" aria-hidden="true">💡</span>
        {t.idHint}
      </p>
      {busy && <p className="qe-status">{t.exporting}</p>}
      {error && <p className="qe-error">{t.failedPrefix}{error}</p>}
    </div>
  );
}

/** Best-effort read of the currently-viewed backlog level from the tab context the host passes in. */
function preferredLevelName(ctx: unknown): string | undefined {
  const c = ctx as Record<string, { name?: string } | undefined | string> | null;
  if (!c) return undefined;
  const level = c.level as { name?: string } | undefined;
  const backlogLevel = c.backlogLevel as { name?: string } | undefined;
  return level?.name ?? backlogLevel?.name ?? (typeof c.levelName === 'string' ? c.levelName : undefined);
}

const tabState: { context: unknown } = { context: null };
let t: Strings = strings('en');

/** Reads the Azure DevOps UI culture (e.g. "ru-RU") to pick the language; falls back to English. */
function detectCulture(): void {
  try {
    t = strings(detectLang(SDK.getPageContext()?.globalization?.culture));
  } catch {
    /* keep English fallback */
  }
}

function fail(message: string): void {
  const root = document.getElementById('root');
  if (root) {
    root.textContent = message;
    root.className = 'qe-tab qe-error';
  }
}

async function start(): Promise<void> {
  await SDK.init({ loaded: false });
  SDK.register('backlogExportTab', {
    pageTitle: () => 'Export',
    updateContext: (ctx: unknown) => {
      tabState.context = ctx;
    },
    isInvisible: () => false,
    isDisabled: () => false,
  });
  await SDK.ready();
  detectCulture();

  const web = SDK.getWebContext();
  const project = web.project?.name;
  const team = web.team?.name;
  if (!project || !team) {
    fail(t.openFromBacklog);
    SDK.notifyLoadSucceeded();
    return;
  }

  const loc = await SDK.getService<ILocationService>(CommonServiceIds.LocationService);
  const baseUrl = (await loc.getServiceLocation()).replace(/\/$/, '');
  const token = await SDK.getAccessToken();
  const api = new RestApiClient(baseUrl, token);
  const backlog = new BacklogService(api);
  const workItems = new WorkItemService(api);

  let levels: NamedRef[];
  try {
    levels = await backlog.getBacklogLevels(project, team);
  } catch (e) {
    fail(`Could not load backlog levels: ${e instanceof Error ? e.message : String(e)}`);
    SDK.notifyLoadSucceeded();
    return;
  }
  if (levels.length === 0) {
    fail(t.noLevels(team));
    SDK.notifyLoadSucceeded();
    return;
  }

  // eslint-disable-next-line no-console
  console.log('[BacklogQuickExport] tabContext:', tabState.context);
  const def = pickDefaultLevel(levels, preferredLevelName(tabState.context));

  ReactDOM.render(
    <App
      deps={{ backlog, workItems }}
      project={project}
      team={team}
      collectionUrl={baseUrl}
      levels={levels}
      defaultLevel={def?.name ?? ''}
      t={t}
    />,
    document.getElementById('root')
  );
  SDK.notifyLoadSucceeded();
}

start().catch((e) => fail(`Failed to initialize: ${e instanceof Error ? e.message : String(e)}`));
