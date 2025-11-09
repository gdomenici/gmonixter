export default class Song {
  videoId: string;
  rawYouTubeTitle: string;
  title?: string;
  year?: number;
  artist?: string;
  bestThumbnailUrl?: string;
  isReadyForPlayback: boolean;
  hasMetadata: boolean;

  constructor(videoId: string, rawYouTubeTitle: string) {
    this.videoId = videoId;
    this.rawYouTubeTitle = rawYouTubeTitle;
    this.isReadyForPlayback = false;
    this.hasMetadata = false;
  }

    /**
     * Cleans up the song title and artist from the raw YouTube title, and
     * subsequently fetches metadata from MusicBrainz
     * @param currentSong song to populate metadata for
     */
     async populateMetadata () {
      const rawYouTubeTitle = this.rawYouTubeTitle;
      let artist: string | null = null;
      let rest: string;
      let tempTitle: string;
  
      if (rawYouTubeTitle.includes(" - ")) {
        [artist, rest] = rawYouTubeTitle.split(" - ", 2);
      } else if (rawYouTubeTitle.includes(" | ")) {
        [artist, rest] = rawYouTubeTitle.split(" | ", 2);
      } else if (rawYouTubeTitle.includes(": ")) {
        [artist, rest] = rawYouTubeTitle.split(": ", 2);
      } else {
        rest = rawYouTubeTitle;
      }
  
      tempTitle = rest.split(" (")[0].split(" [")[0].split(" ft")[0].split(" (feat")[0].split(" FEAT.")[0].replace(/"/g, '').replace(/'/g, '');
      if (!tempTitle.trim()) {
        console.log(`Could not parse '${rawYouTubeTitle}' sensibly. Cannot retrieve metadata.`);
        this.hasMetadata = false;
        return;
      };
  
      const query = artist ? `"${tempTitle}" AND artist:"${artist}"` : `"${tempTitle}"`;
      const params = new URLSearchParams({ query, fmt: "json", limit: "10" });
      const response = await fetch(`https://musicbrainz.org/ws/2/release?${params}`);
      const data = await response.json();
      
      if (!data.releases || data.releases.length === 0) {
        console.log(`Metadata not found in MusicBrainz for ${rawYouTubeTitle}`);
        this.hasMetadata = false;
        return;
      }
  
      const release = data.releases[0];
      const releaseDate = release.date || release["release-events"]?.[0]?.date;
      this.title = release.title || tempTitle;
      this.year = releaseDate ? parseInt(releaseDate.split('-')[0]) : undefined;
      this.artist = release["artist-credit"]?.[0]?.name || artist || undefined;
      this.hasMetadata = true;
  
    };
  

}
