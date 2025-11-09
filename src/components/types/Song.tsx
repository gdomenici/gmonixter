import Release from "./Release";


export default class Song {
  videoId: string;
  rawYouTubeTitle: string;
  title?: string;
  year?: number;
  artist?: string;
  bestThumbnailUrl?: string;
  hasMetadata: boolean;
  allReleases: Release[];

  constructor(videoId: string, rawYouTubeTitle: string) {
    this.videoId = videoId;
    this.rawYouTubeTitle = rawYouTubeTitle;
    this.hasMetadata = false;
    this.allReleases = [];
  }


  /**
   * Cleans up the song title and artist from the raw YouTube title, and
   * subsequently fetches metadata from MusicBrainz
   * @param currentSong song to populate metadata for
   */
    async populateMetadata () {
    if (this.hasMetadata) {
      return;
    }

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

    tempTitle = rest.split(" (")[0].split(" [")[0].split(" ft")[0].split(" (feat")[0].split(" FEAT.")[0].replace(/"/g, '');
    if (!tempTitle.trim()) {
      console.log(`Could not parse '${rawYouTubeTitle}' sensibly. Cannot retrieve metadata.`);
      this.hasMetadata = false;
      return;
    };

    const query = artist ? `"${tempTitle}" AND artist:"${artist}"` : `"${tempTitle}"`;
    const params = new URLSearchParams({ query, fmt: "json", limit: "10" });
    const response = await fetch(`https://musicbrainz.org/ws/2/release?${params}`, {
        headers: { 'User-Agent': 'gmonixter/1.0.0 (guido.domenici@gmail.com)' }
    });
    const data = await response.json();
    
    // if (!data.releases || data.releases.length === 0) {
    //   console.log(`Metadata not found in MusicBrainz for ${rawYouTubeTitle}`);
    //   this.hasMetadata = false;
    //   return;
    // }


    // Now collect all releases, but only if they are reliable enough (higher scores)
    // Make sure they're sorted by year
    const tempReleases: Release[] =     
      data.releases
      .filter(
        (item: any) =>
          item.date && item.status === "Official" && item.score >= 85
      )
      .map((item: any) => ({
        title: item.title,
        year: new Date(item.date).getFullYear(),
        country: item.country,
        mediaFormat: item.media?.[0]?.format,
        artistCredit: item["artist-credit"]?.[0]?.name,
      }))
      .sort((a: Release, b: Release) => {
        return a.year - b.year;
      });

    if (!tempReleases || tempReleases.length === 0) {
      console.log(`Metadata not found in MusicBrainz for ${rawYouTubeTitle}`);
      this.hasMetadata = false;
      return;
    }

    const mainRelease = tempReleases[0];
    this.title = mainRelease.title || tempTitle;
    this.year = mainRelease.year;
    this.artist = mainRelease.artistCredit;
    
    this.allReleases = tempReleases;
    
    this.hasMetadata = true;

  };

}
