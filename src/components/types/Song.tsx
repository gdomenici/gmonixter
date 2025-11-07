export default interface Song {
  rawYouTubeTitle: string;
  videoId: string;
  title?: string;
  year?: number;
  artist?: string;
  bestThumbnailUrl: string;
  isReadyForPlayback: boolean;
}
