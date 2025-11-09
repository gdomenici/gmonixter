import Song from "./Song";

/**
 * Tracks the songs that have been played so far, and returns the next playable one
 */
class SongsPlaybackTracker  {

    songs: Song[];
    /**
     * Contains the songs played so far
     */
    songsPlayed: Set<Song>;

    constructor(songs: Song[]) {
        this.songs = songs;
        this.songsPlayed = new Set<Song>();
    }

    hasBeenPlayed(song: Song): boolean {
        return this.songsPlayed.has(song);
    }

    haveAllSongsBeenPlayed(): boolean {
        return this.songsPlayed.size === this.songs.length;
    }

    getNext(): Song | null {
        if (this.haveAllSongsBeenPlayed()) {
            return null;
        }
        
        // Return the first song that is ready for playback, and that hasn't been
        // played already
        const songToReturn = this.songs.find(oneSong => oneSong.isReadyForPlayback && !this.hasBeenPlayed(oneSong));
        
    }

}

export default SongsPlaybackTracker;