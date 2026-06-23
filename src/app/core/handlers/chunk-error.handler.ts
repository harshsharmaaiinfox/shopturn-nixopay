import { ErrorHandler, Injectable } from '@angular/core';

@Injectable()
export class ChunkErrorHandler implements ErrorHandler {

  handleError(error: any): void {
    const message: string = error?.message || '';
    const isChunkError =
      message.includes('Failed to fetch dynamically imported module') ||
      message.includes('ChunkLoadError') ||
      message.includes('Loading chunk') ||
      /Loading chunk [\d]+ failed/.test(message);

    if (isChunkError) {
      // New deployment detected — old chunks are gone. Reload once to get fresh files.
      const reloadKey = 'chunk_reload_attempted';
      if (!sessionStorage.getItem(reloadKey)) {
        sessionStorage.setItem(reloadKey, '1');
        window.location.reload();
      }
    } else {
      console.error(error);
    }
  }
}
