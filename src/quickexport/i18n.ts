export type Lang = 'ru' | 'en';

/** Picks the UI language from an Azure DevOps culture string (e.g. "ru-RU"); defaults to English. */
export function detectLang(culture: string | undefined): Lang {
  return culture && culture.toLowerCase().startsWith('ru') ? 'ru' : 'en';
}

export interface Strings {
  heading: string;
  team: string;
  level: string;
  downloadCsv: string;
  downloadExcel: string;
  exporting: string;
  idHint: string;
  failedPrefix: string;
  openFromBacklog: string;
  noLevels: (team: string) => string;
}

const EN: Strings = {
  heading: 'Export backlog',
  team: 'Team',
  level: 'Backlog level',
  downloadCsv: 'Download CSV',
  downloadExcel: 'Download Excel',
  exporting: 'Exporting…',
  idHint: 'Tip: in Excel the ID column is a clickable link that opens the work item in your browser. In CSV the link is in the URL column.',
  failedPrefix: 'Export failed: ',
  openFromBacklog: 'Open this tab from a team Backlogs page.',
  noLevels: (team) => `No backlog levels found for team "${team}".`,
};

const RU: Strings = {
  heading: 'Экспорт бэклога',
  team: 'Команда',
  level: 'Уровень бэклога',
  downloadCsv: 'Скачать CSV',
  downloadExcel: 'Скачать Excel',
  exporting: 'Экспорт…',
  idHint: 'Подсказка: в Excel колонка ID — кликабельная ссылка, открывающая рабочий элемент в браузере. В CSV ссылка находится в колонке URL.',
  failedPrefix: 'Ошибка экспорта: ',
  openFromBacklog: 'Откройте эту вкладку со страницы Backlogs команды.',
  noLevels: (team) => `Для команды «${team}» не найдено уровней бэклога.`,
};

export function strings(lang: Lang): Strings {
  return lang === 'ru' ? RU : EN;
}
