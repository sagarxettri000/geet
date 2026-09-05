export type MusicProvider = "youtube";

export interface TrackSource {
  provider: MusicProvider;
  providerVideoId: string;
  title?: string;
  artistName?: string;
  thumbnailUrl?: string;
}

export interface Track {
  id?: string;
  title: string;
  artist: string;
  artistId?: string;
  albumId?: string;
  durationSec: number | null;
  thumbnailUrl: string | null;
  thumbnailColor?: string | null;
  popularity?: number;
  genreId?: string;
  sources: TrackSource[];
  isLiked?: boolean;
}

export interface Artist {
  id: string;
  name: string;
  imageUrl: string | null;
  thumbnailColor?: string | null;
  verified: boolean;
  bio: string | null;
  followers: number;
  monthlyListeners: number;
  isFollowing?: boolean;
}

export interface Album {
  id: string;
  title: string;
  artistId: string;
  artist: string;
  coverUrl: string | null;
  thumbnailColor?: string | null;
  year: number;
  type: "album" | "single" | "ep";
  trackCount: number;
  durationSec: number | null;
  isSaved?: boolean;
}

export interface Playlist {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  coverUrl: string | null;
  thumbnailColor?: string | null;
  trackCount: number;
  ownerId: string;
  ownerName: string;
  ownerAvatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
  isLiked?: boolean;
}

export interface PlaylistTrackEntry {
  playlistTrackId: string;
  position: number;
  addedAt: string;
  track: Track;
}

export interface Genre {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  thumbnailColor?: string | null;
  trackCount?: number;
}

export interface Mix {
  title: string;
  subtitle: string;
  tracks: Track[];
  color?: string;
}

export interface HomeSection<T> {
  key: string;
  title: string;
  subtitle?: string;
  items: T[];
}

export interface HistoryEntry {
  id: string;
  track: Track;
  playedAt: string;
  progressSec?: number | null;
  durationSec?: number | null;
  completion?: number;
}

export interface SearchResults {
  tracks: Track[];
  artists: Artist[];
  albums: Album[];
  playlists: Playlist[];
  genres: Genre[];
}

export type RepeatMode = "off" | "all" | "one";
export type PlayerStatus =
  | "idle"
  | "unstarted"
  | "loading"
  | "ready"
  | "playing"
  | "paused"
  | "ended"
  | "error";

export const defaultTrackFallback = (title: string, artist: string): Track => ({
  title,
  artist,
  durationSec: null,
  thumbnailUrl: null,
  sources: [],
});