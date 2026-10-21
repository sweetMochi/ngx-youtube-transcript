export interface Cue {
  startMs: number;
  text: string;
}

export interface LineOptions {
  /** 影片長度，可能為空值 */
  durationSeconds: number | null;
  includeTimestamps: boolean;
}

/** 畫面、複製與下載共用的逐字稿行 */
export function transcriptLines(cues: Cue[], options: LineOptions): string[] {
  if (!options.includeTimestamps) return cues.map((cue) => cue.text);
  const lengthSeconds = options.durationSeconds ?? (cues.at(-1)?.startMs ?? 0) / 1000;
  const withHours = lengthSeconds >= 3600;
  return cues.map((cue) => `[${formatTimestamp(cue.startMs, withHours)}] ${cue.text}`);
}

function formatTimestamp(ms: number, withHours: boolean) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const seconds = totalSeconds % 60;
  const parts = withHours ? [hours, minutes, seconds] : [minutes, seconds];
  return parts.map((n) => String(n).padStart(2, '0')).join(':');
}

/** 「複製全部」的內容：只有字幕，不含檔頭 */
export function copyText(cues: Cue[], options: LineOptions): string {
  return transcriptLines(cues, options).join('\n');
}

export type TrackKind = 'manual' | 'auto';

/** 輸出 txt 需要的影片與字幕軌資訊 */
export interface TranscriptSource {
  videoId: string;
  title: string;
  webpageUrl: string;
  durationSeconds: number | null;
  track: { language: string; kind: TrackKind };
}

export const TRACK_KIND_LABEL: Record<TrackKind, string> = {
  manual: '人工字幕',
  auto: '自動字幕',
};

/** 字幕軌選單需要的字幕軌資訊 */
export interface TrackOption {
  id: string;
  language: string;
  languageName: string;
  kind: TrackKind;
}

/** 字幕軌選單的選項文字（以 track id 對應）：「<語言名稱>・<種類>」，與其他字幕軌相同時才在語言名稱後補上（<語言代碼>） */
export function trackOptionLabels(tracks: TrackOption[]): Record<string, string> {
  const plain = tracks.map((track) => `${track.languageName}・${TRACK_KIND_LABEL[track.kind]}`);
  return Object.fromEntries(
    tracks.map((track, i) => {
      const duplicated = plain.indexOf(plain[i]) !== plain.lastIndexOf(plain[i]);
      const label = duplicated
        ? `${track.languageName}（${track.language}）・${TRACK_KIND_LABEL[track.kind]}`
        : plain[i];
      return [track.id, label];
    }),
  );
}

/** txt 檔內容：標題、網址、字幕軌三行檔頭，空一行後接字幕；LF 換行 */
export function txtContent(source: TranscriptSource, cues: Cue[], includeTimestamps: boolean) {
  const header = [
    source.title,
    source.webpageUrl,
    `${source.track.language}・${TRACK_KIND_LABEL[source.track.kind]}`,
  ];
  const lines = transcriptLines(cues, {
    durationSeconds: source.durationSeconds,
    includeTimestamps,
  });
  return [...header, '', ...lines, ''].join('\n');
}

const MAX_TITLE_LENGTH = 150;

/** `<標題> [<videoId>].<語言>.txt`，標題中 Windows 不允許的字元與控制字元換成 _ */
export function txtFileName(source: TranscriptSource) {
  const safe = source.title.replace(/[\\/:*?"<>|\u0000-\u001f\u007f]/g, '_');
  const title = Array.from(safe)
    .slice(0, MAX_TITLE_LENGTH)
    .join('')
    .replace(/[\s.]+$/, '');
  return `${title} [${source.videoId}].${source.track.language}.txt`;
}
