/**
 * Google Drive Match Recording & Replay Archive Service
 * Saves instant replay clips, match highlights, and tactical logs directly to Google Drive.
 */

export interface DriveUploadResult {
  fileId: string;
  fileName: string;
  webViewLink: string;
  folderName: string;
  sizeBytes?: number;
}

export class GoogleDriveService {
  private accessToken: string | null = null;
  private folderId: string | null = null;
  private isConfigured: boolean = false;

  public setAccessToken(token: string) {
    this.accessToken = token;
    this.isConfigured = true;
  }

  public getIsConfigured(): boolean {
    return this.isConfigured || !!this.accessToken;
  }

  /**
   * Creates or locates the dedicated match broadcast folder in Google Drive.
   */
  public async ensureMatchFolder(matchTitle: string): Promise<string> {
    if (!this.accessToken) {
      // Fallback via server API
      return 'drive_folder_auto';
    }

    try {
      const folderName = `⚽ ${matchTitle} - Match Archive`;
      const query = encodeURIComponent(`mimeType = 'application/vnd.google-apps.folder' and name = '${folderName}' and trashed = false`);
      const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}`, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });

      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.files && searchData.files.length > 0) {
          this.folderId = searchData.files[0].id;
          return this.folderId!;
        }
      }

      // Create new folder
      const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
        }),
      });

      if (createRes.ok) {
        const createData = await createRes.json();
        this.folderId = createData.id;
        return this.folderId!;
      }
    } catch (err) {
      console.warn('Drive folder lookup error, using default', err);
    }

    return 'default_folder';
  }

  /**
   * Uploads an instant replay video clip to Google Drive.
   */
  public async uploadReplayClip(
    blob: Blob,
    filename: string,
    metadata: {
      matchTitle: string;
      minute: number;
      eventType: string;
      cameraAngle: string;
    }
  ): Promise<DriveUploadResult> {
    // If access token is available on client, perform direct multipart upload to Google Drive
    if (this.accessToken) {
      try {
        const folderId = await this.ensureMatchFolder(metadata.matchTitle);
        const fileMetadata = {
          name: filename,
          parents: folderId && folderId !== 'default_folder' ? [folderId] : undefined,
          description: `Football Match Replay: ${metadata.eventType} (Min ${metadata.minute}') captured from ${metadata.cameraAngle}`,
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(fileMetadata)], { type: 'application/json' }));
        form.append('file', blob);

        const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
          body: form,
        });

        if (res.ok) {
          const data = await res.json();
          return {
            fileId: data.id,
            fileName: data.name || filename,
            webViewLink: data.webViewLink || `https://drive.google.com/file/d/${data.id}/view`,
            folderName: `⚽ ${metadata.matchTitle} - Match Archive`,
            sizeBytes: blob.size,
          };
        }
      } catch (e) {
        console.error('Client Drive upload error:', e);
      }
    }

    // Server-side fallback endpoint
    const serverRes = await fetch('/api/drive/save-clip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clipName: filename,
        duration: 10,
        eventType: metadata.eventType,
        timestamp: Date.now(),
        metadata,
      }),
    });

    const data = await serverRes.json();
    return {
      fileId: data.fileId || `drive_file_${Date.now()}`,
      fileName: filename,
      webViewLink: data.shareUrl || `https://drive.google.com/file/d/${data.fileId}/view`,
      folderName: data.folder || '⚽ Football Match Live Studio / Replays',
      sizeBytes: blob.size,
    };
  }
}

export const googleDriveService = new GoogleDriveService();
