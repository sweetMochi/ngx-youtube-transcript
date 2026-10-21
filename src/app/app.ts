import { Component, computed, inject, signal } from '@angular/core';
import { TranscriptApi, errorMessage, type VideoInfo } from './transcript-api';
import {
  TRACK_KIND_LABEL,
  copyText,
  transcriptLines,
  txtContent,
  txtFileName,
  type Cue,
} from './transcript-export';

type Loading = 'video' | 'transcript' | null;

@Component({
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  private readonly api = inject(TranscriptApi);

  protected readonly trackKindLabel = TRACK_KIND_LABEL;
  protected readonly url = signal('');
  protected readonly video = signal<VideoInfo | null>(null);
  protected readonly selectedTrackId = signal<string | null>(null);
  protected readonly cues = signal<Cue[] | null>(null);
  protected readonly loading = signal<Loading>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly includeTimestamps = signal(true);
  protected readonly copied = signal(false);

  /** 送出的網址；字幕軌改選時沿用，避免使用者已修改輸入框 */
  private submittedUrl = '';
  /** 只採用最新一次請求的結果 */
  private requestId = 0;
  private copiedTimer?: ReturnType<typeof setTimeout>;

  private readonly lineOptions = computed(() => ({
    durationSeconds: this.video()?.durationSeconds ?? null,
    includeTimestamps: this.includeTimestamps(),
  }));

  /** 畫面上一律顯示時間戳；開關只影響複製與下載 */
  protected readonly displayLines = computed(() =>
    transcriptLines(this.cues() ?? [], { ...this.lineOptions(), includeTimestamps: true }),
  );

  protected readonly selectedTrack = computed(() =>
    this.video()?.tracks.find((track) => track.id === this.selectedTrackId()),
  );

  protected async submit(event: Event) {
    event.preventDefault();
    const url = this.url().trim();
    if (!url || this.loading() === 'video') return;
    const id = ++this.requestId;
    this.submittedUrl = url;
    this.video.set(null);
    this.cues.set(null);
    this.selectedTrackId.set(null);
    this.error.set(null);
    this.loading.set('video');
    try {
      const video = await this.api.getVideo(url);
      if (id !== this.requestId) return;
      this.video.set(video);
      this.loading.set(null);
      if (video.defaultTrackId) await this.selectTrack(video.defaultTrackId);
    } catch (error) {
      if (id !== this.requestId) return;
      this.error.set(errorMessage(error));
      this.loading.set(null);
    }
  }

  protected async selectTrack(trackId: string) {
    const id = ++this.requestId;
    this.selectedTrackId.set(trackId);
    this.cues.set(null);
    this.error.set(null);
    this.loading.set('transcript');
    try {
      const cues = await this.api.getTranscript(this.submittedUrl, trackId);
      if (id !== this.requestId) return;
      this.cues.set(cues);
    } catch (error) {
      if (id !== this.requestId) return;
      this.error.set(errorMessage(error));
    } finally {
      if (id === this.requestId) this.loading.set(null);
    }
  }

  protected async copyAll() {
    await navigator.clipboard.writeText(copyText(this.cues() ?? [], this.lineOptions()));
    this.copied.set(true);
    clearTimeout(this.copiedTimer);
    this.copiedTimer = setTimeout(() => this.copied.set(false), 2000);
  }

  protected download() {
    const video = this.video();
    const track = this.selectedTrack();
    if (!video || !track) return;
    const source = { ...video, track };
    const blob = new Blob([txtContent(source, this.cues() ?? [], this.includeTimestamps())], {
      type: 'text/plain;charset=utf-8',
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = txtFileName(source);
    link.click();
    URL.revokeObjectURL(link.href);
  }
}
