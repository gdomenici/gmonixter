export default class PlayerHistoryEntry {

    songIndex: number;
    secondsTaken: number;
    guessedTitle: boolean; 
    guessedArtist: boolean; 
    guessedYearDistance: number;

    constructor(
        songIndex: number, 
        secondsTaken: number, 
        guessedTitle: boolean, 
        guessedArtist: boolean, 
        guessedYearDistance: number
    ) {
        this.songIndex = songIndex;
        this.secondsTaken = secondsTaken;
        this.guessedTitle = guessedTitle;
        this.guessedArtist = guessedArtist;
        this.guessedYearDistance = guessedYearDistance;        
    }

    get score(): number {
        let total = 0;
        total += this.secondsTaken < 11? 11 - this.secondsTaken : 0; // bonus for guessing within 10 seconds
        total += this.guessedTitle ? 1 : 0; // 1 point for guessing the title
        total += this.guessedArtist ? 2 : 0; // 2 points for guessing the artist
        total += this.guessedYearDistance < 4? 4 - this.guessedYearDistance: 0; // bonus for guessing year within 3 years
        return total;
    }

}