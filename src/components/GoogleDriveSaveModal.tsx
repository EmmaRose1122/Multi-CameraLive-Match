import React, { useState } from 'react';
import {
  HardDrive,
  X,
  CheckCircle2,
  ExternalLink,
  UploadCloud,
  FileVideo,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { ScoreboardState } from '../types/broadcast';
import { googleDriveService } from '../services/googleDriveService';

interface GoogleDriveSaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  scoreboard: ScoreboardState;
  pendingBlob?: Blob | null;
  pendingClipName?: string;
  pendingMetadata?: any;
}

export const GoogleDriveSaveModal: React.FC<GoogleDriveSaveModalProps> = ({
  isOpen,
  onClose,
  scoreboard,
  pendingBlob,
  pendingClipName,
  pendingMetadata,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [savedUrl, setSavedUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUpload = async () => {
    setIsUploading(true);
    setErrorMsg(null);

    try {
      const matchTitle = `${scoreboard.homeTeam.name} vs ${scoreboard.awayTeam.name}`;
      const filename = pendingClipName || `MatchReplay_${Date.now()}.webm`;
      const blobToSave =
        pendingBlob ||
        new Blob(['Football match broadcast replay package'], { type: 'video/webm' });

      const res = await googleDriveService.uploadReplayClip(blobToSave, filename, {
        matchTitle,
        minute: Math.max(1, Math.floor(scoreboard.matchSeconds / 60)),
        eventType: pendingMetadata?.eventType || 'Match Highlight',
        cameraAngle: pendingMetadata?.cameraAngle || 'Multi-Cam Composite',
      });

      setUploadSuccess(true);
      setSavedUrl(res.webViewLink);
    } catch (err: any) {
      console.error('Upload to Drive error:', err);
      setErrorMsg('Failed to sync to Google Drive. Please verify permissions.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0B0D11]/90 backdrop-blur-2xl border border-white/15 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col select-none">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-white/5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <HardDrive className="w-5 h-5 text-emerald-400" />
            <h3 className="font-semibold text-white text-base tracking-tight">
              Google Drive Match Archive
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-4 text-xs">
          {uploadSuccess ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-950/80 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-900/30">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h4 className="font-bold text-white text-sm">
                Saved to Google Drive Successfully!
              </h4>
              <p className="text-white/60 text-xs max-w-xs">
                Your replay clip has been organized into your match broadcast folder:
                <br />
                <span className="text-emerald-400 font-semibold">
                  ⚽ {scoreboard.homeTeam.name} vs {scoreboard.awayTeam.name} - Match Archive
                </span>
              </p>

              {savedUrl && (
                <a
                  href={savedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-900/30 transition-colors"
                >
                  <span>Open in Google Drive</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          ) : (
            <>
              <div className="bg-black/40 backdrop-blur-md p-3.5 rounded-xl border border-white/10 flex items-center gap-3">
                <FileVideo className="w-8 h-8 text-sky-400 shrink-0" />
                <div>
                  <p className="font-bold text-white text-xs">
                    {pendingClipName || `${scoreboard.homeTeam.shortName} vs ${scoreboard.awayTeam.shortName} Replay Reel`}
                  </p>
                  <p className="text-[11px] text-white/40">
                    Match Time: {Math.floor(scoreboard.matchSeconds / 60)}' • High-Definition WebM Video
                  </p>
                </div>
              </div>

              <p className="text-white/70 leading-relaxed">
                Save match highlights, VAR replay events, and instant replays straight into your Google Drive for post-match tactical analysis and social media publishing.
              </p>

              {errorMsg && (
                <div className="p-2.5 rounded-lg bg-red-950/80 border border-red-800 text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold border border-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  id="btn-confirm-drive-upload"
                  disabled={isUploading}
                  onClick={handleUpload}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-900/30 transition-colors disabled:opacity-50"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>{isUploading ? 'Uploading...' : 'Save to Drive'}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
