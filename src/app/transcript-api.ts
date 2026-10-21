import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { Cue, TrackKind } from './transcript-export';

export interface Track {
  /** `<kind>:<language>`，例如 `manual:zh-TW` */
  id: string;
  language: string;
  languageName: string;
  kind: TrackKind;
}

export interface VideoInfo {
  videoId: string;
  title: string;
  webpageUrl: string;
  durationSeconds: number | null;
  tracks: Track[];
  /** 沒有任何字幕軌時為 null */
  defaultTrackId: string | null;
}

/** 本地 API 的用戶端 */
@Injectable({ providedIn: 'root' })
export class TranscriptApi {
  private readonly http = inject(HttpClient);

  getVideo(url: string) {
    return firstValueFrom(this.http.get<VideoInfo>('/api/video', { params: { url } }));
  }

  async getTranscript(url: string, trackId: string) {
    const params = new HttpParams().set('url', url).set('track', trackId);
    const { cues } = await firstValueFrom(
      this.http.get<{ cues: Cue[] }>('/api/transcript', { params }),
    );
    return cues;
  }
}

/** 取出後端回傳的繁中錯誤訊息；連不到後端時，提示啟動方式 */
export function errorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const message = error.error?.error?.message;
    if (typeof message === 'string') return message;
  }
  return '無法連線到本地 API，請確認已用 npm start 啟動';
}
