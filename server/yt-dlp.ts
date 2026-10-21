import { execFile } from 'node:child_process';
import { ApiError } from './api-error.ts';

export interface YtDlpResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/** 以參數陣列執行 yt-dlp；測試時替換成假的實作 */
export type RunYtDlp = (args: string[]) => Promise<YtDlpResult>;

/** 正式使用的執行器：直接執行 yt-dlp.exe，不經過 shell */
export const runYtDlp: RunYtDlp = (args) =>
  new Promise((resolve, reject) => {
    execFile(
      'yt-dlp',
      args,
      { maxBuffer: 64 * 1024 * 1024, windowsHide: true },
      (error, stdout, stderr) => {
        if (error && typeof error.code !== 'number') return reject(error);
        resolve({ stdout, stderr, exitCode: typeof error?.code === 'number' ? error.code : 0 });
      },
    );
  });

/** 執行 yt-dlp，失敗時依 stderr 轉成對應的 ApiError */
export async function runOrThrow(run: RunYtDlp, args: string[]): Promise<YtDlpResult> {
  let result: YtDlpResult;
  try {
    result = await run(args);
  } catch (error) {
    console.error(error);
    throw new ApiError('YTDLP_FAILED', '無法執行 yt-dlp，請確認已安裝並在 PATH 中');
  }
  if (result.exitCode !== 0) throw toApiError(result.stderr);
  return result;
}

function toApiError(stderr: string) {
  // YouTube 回傳的原因含有 sign in 時，yt-dlp 會接上 --cookies 的登入提示
  if (/sign in|--cookies|members-only/i.test(stderr)) {
    return new ApiError('LOGIN_REQUIRED', '這支影片需要登入才能存取，目前不支援');
  }
  if (/video (is )?unavailable|has been removed|does not exist/i.test(stderr)) {
    return new ApiError('VIDEO_UNAVAILABLE', '找不到這支影片，可能已被刪除或網址有誤');
  }
  console.error(stderr);
  return new ApiError(
    'YTDLP_FAILED',
    'yt-dlp 執行失敗，可能是 YouTube 有所變動，請嘗試更新 yt-dlp 後再試',
  );
}
