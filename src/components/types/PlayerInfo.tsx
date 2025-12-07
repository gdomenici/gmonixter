import PlayerHistoryEntry from "./PlayerHistoryEntry";

export interface PlayerInfo {
    name: string;
    score: number;
    color: string;
    id: number;
    avatarUrl: string;
    historyEntries: PlayerHistoryEntry[];
}