import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// All tracks use REAL public YouTube video IDs so the whole catalog is playable
// through the official IFrame Player with no API key required.

type TrackSeed = {
  title: string;
  artist: string;
  yid: string;
  dur?: number;
  genre?: string;
  pop?: number;
  color?: string;
};

type AlbumSeed = {
  title: string;
  artist: string;
  year: number;
  type: "album" | "single" | "ep" | "compilation";
  color?: string;
  yids: string[];
};

const GENRES: { name: string; slug: string; color: string }[] = [
  { name: "Pop", slug: "pop", color: "#f472b6" },
  { name: "Rock", slug: "rock", color: "#f87171" },
  { name: "Hip-Hop", slug: "hip-hop", color: "#fbbf24" },
  { name: "R&B", slug: "rnb", color: "#c084fc" },
  { name: "Dance / Electronic", slug: "dance", color: "#2dd4bf" },
  { name: "Latin", slug: "latin", color: "#fb923c" },
  { name: "Indie", slug: "indie", color: "#34d399" },
  { name: "Classic Rock", slug: "classic-rock", color: "#f87171" },
  { name: "K-Pop", slug: "kpop", color: "#818cf8" },
  { name: "Queens of Pop", slug: "queens-pop", color: "#e879f9" },
];

const TRACKS: TrackSeed[] = [
  // ---- Ed Sheeran
  { title: "Shape of You", artist: "Ed Sheeran", yid: "JGwWNGJdvx8", dur: 234, genre: "Pop", pop: 97, color: "#d88a4a" },
  { title: "Perfect", artist: "Ed Sheeran", yid: "2Vv-BfVoq4g", dur: 264, genre: "Pop", pop: 93, color: "#c9b470" },
  { title: "Photograph", artist: "Ed Sheeran", yid: "nSDgHBxUbVQ", dur: 258, genre: "Pop", pop: 86, color: "#8d9bb8" },
  // ---- Adele
  { title: "Hello", artist: "Adele", yid: "YQHsXMglC9A", dur: 356, genre: "Pop", pop: 92, color: "#54413d" },
  { title: "Rolling in the Deep", artist: "Adele", yid: "rYEDA3JcQqw", dur: 228, genre: "R&B", pop: 88, color: "#3d5a5a" },
  { title: "Someone Like You", artist: "Adele", yid: "hLQl3WQQoQ0", dur: 285, genre: "R&B", pop: 85, color: "#2f3542" },
  // ---- Dua Lipa
  { title: "Levitating", artist: "Dua Lipa", yid: "TUVcZfQe-Kw", dur: 203, genre: "Dance / Electronic", pop: 91, color: "#7b5cff" },
  { title: "New Rules", artist: "Dua Lipa", yid: "k2qgadSvMNU", dur: 211, genre: "Dance / Electronic", pop: 89, color: "#b9ff63" },
  { title: "Don't Start Now", artist: "Dua Lipa", yid: "oygrmJFKYZY", dur: 183, genre: "Dance / Electronic", pop: 87, color: "#ff6bb4" },
  // ---- The Weeknd
  { title: "Blinding Lights", artist: "The Weeknd", yid: "4NRXx6U8ABQ", dur: 200, genre: "R&B", pop: 98, color: "#c9303e" },
  { title: "Starboy", artist: "The Weeknd", yid: "34Na4j8AVgA", dur: 230, genre: "R&B", pop: 90, color: "#191a33" },
  { title: "Save Your Tears", artist: "The Weeknd", yid: "Xxw1V85_Zjo", dur: 204, genre: "R&B", pop: 84, color: "#6b5f7a" },
  // ---- Harry Styles
  { title: "As It Was", artist: "Harry Styles", yid: "H5v3kku4y6Q", dur: 167, genre: "Pop", pop: 91, color: "#d6c8b8" },
  { title: "Watermelon Sugar", artist: "Harry Styles", yid: "E07s5ZYygMg", dur: 174, genre: "Pop", pop: 86, color: "#f2b8a0" },
  // ---- Olivia Rodrigo
  { title: "drivers license", artist: "Olivia Rodrigo", yid: "ZmDBbnmKpqQ", dur: 242, genre: "Pop", pop: 92, color: "#8899aa" },
  { title: "good 4 u", artist: "Olivia Rodrigo", yid: "gNi_6U5Pm_o", dur: 178, genre: "Pop", pop: 88, color: "#4293a3" },
  // ---- Billie Eilish
  { title: "bad guy", artist: "Billie Eilish", yid: "DyDfgMOUjCI", dur: 194, genre: "Pop", pop: 90, color: "#9e7c5e" },
  { title: "lovely", artist: "Billie Eilish", yid: "V1Pl8CzNzCw", dur: 220, genre: "Indie", pop: 87, color: "#8a8f9b" },
  { title: "ocean eyes", artist: "Billie Eilish", yid: "viimfQi_pUw", dur: 194, genre: "Indie", pop: 80, color: "#92bfc7" },
  // ---- Imagine Dragons
  { title: "Believer", artist: "Imagine Dragons", yid: "7wtfhZwyrcc", dur: 204, genre: "Rock", pop: 91, color: "#c44d4d" },
  { title: "Radioactive", artist: "Imagine Dragons", yid: "KTvSfeCRxe8", dur: 187, genre: "Rock", pop: 88, color: "#3c3f46" },
  { title: "Thunder", artist: "Imagine Dragons", yid: "fKopy74weus", dur: 187, genre: "Rock", pop: 84, color: "#f5b342" },
  // ---- Linkin Park
  { title: "Numb", artist: "Linkin Park", yid: "kXYiU_JCYtU", dur: 185, genre: "Rock", pop: 89, color: "#2c3138" },
  { title: "In the End", artist: "Linkin Park", yid: "eVTXPUF4Oz4", dur: 216, genre: "Rock", pop: 90, color: "#a3a29a" },
  { title: "What I've Done", artist: "Linkin Park", yid: "8sgycukafqQ", dur: 209, genre: "Rock", pop: 81, color: "#6d7d86" },
  // ---- Nirvana
  { title: "Smells Like Teen Spirit", artist: "Nirvana", yid: "hTWKbfoikeg", dur: 301, genre: "Classic Rock", pop: 93, color: "#4f7a9c" },
  { title: "Come as You Are", artist: "Nirvana", yid: "vabnZ9-ex7o", dur: 219, genre: "Classic Rock", pop: 82, color: "#5d6d82" },
  // ---- Guns N' Roses
  { title: "Sweet Child O' Mine", artist: "Guns N' Roses", yid: "1w7OgIMMRc4", dur: 356, genre: "Classic Rock", pop: 89, color: "#c23636" },
  { title: "November Rain", artist: "Guns N' Roses", yid: "8SbUC-UaAxE", dur: 536, genre: "Classic Rock", pop: 85, color: "#385b73" },
  // ---- Oasis
  { title: "Wonderwall", artist: "Oasis", yid: "bx1Bh8ZvH84", dur: 258, genre: "Indie", pop: 87, color: "#9aa3ad" },
  { title: "Don't Look Back in Anger", artist: "Oasis", yid: "r8OipzpKFjM", dur: 268, genre: "Indie", pop: 83, color: "#8d9199" },
  // ---- Eminem
  { title: "Lose Yourself", artist: "Eminem", yid: "_Yhyp-_-XgQ", dur: 326, genre: "Hip-Hop", pop: 92, color: "#5e5e5e" },
  { title: "Without Me", artist: "Eminem", yid: "YVkUvmDQ3HY", dur: 290, genre: "Hip-Hop", pop: 88, color: "#d6c7a2" },
  { title: "Rap God", artist: "Eminem", yid: "XbGs_qK2PQA", dur: 364, genre: "Hip-Hop", pop: 84, color: "#8b8378" },
  // ---- Kendrick Lamar
  { title: "HUMBLE.", artist: "Kendrick Lamar", yid: "tvTRZJ-4EyI", dur: 177, genre: "Hip-Hop", pop: 87, color: "#2b2b2b" },
  { title: "DNA.", artist: "Kendrick Lamar", yid: "NLZRYQML-H4", dur: 185, genre: "Hip-Hop", pop: 83, color: "#c33a3a" },
  // ---- Drake
  { title: "God's Plan", artist: "Drake", yid: "xPPLb8bgrQo", dur: 200, genre: "Hip-Hop", pop: 89, color: "#b98e5a" },
  { title: "One Dance", artist: "Drake", yid: "iAbnEUA0wpA", dur: 174, genre: "Hip-Hop", pop: 86, color: "#e0d5b8" },
  // ---- Travis Scott
  { title: "SICKO MODE", artist: "Travis Scott", yid: "6ONRf7h3Mdk", dur: 312, genre: "Hip-Hop", pop: 85, color: "#1d1d1d" },
  { title: "goosebumps", artist: "Travis Scott", yid: "Dst9gZkq1a8", dur: 240, genre: "Hip-Hop", pop: 81, color: "#4a4a52" },
  // ---- Funk / Dance / Worldwide hits
  { title: "Uptown Funk", artist: "Mark Ronson", yid: "OPf0YbXqDm0", dur: 270, genre: "Dance / Electronic", pop: 92, color: "#e2524a" },
  { title: "Gangnam Style", artist: "Psy", yid: "9bZkp7q19f0", dur: 253, genre: "K-Pop", pop: 90, color: "#2a3d84" },
  { title: "Despacito", artist: "Luis Fonsi", yid: "kJQP7kiw5Fk", dur: 228, genre: "Latin", pop: 95, color: "#c96f4a" },
  { title: "Closer", artist: "The Chainsmokers", yid: "PT2_F-1esPk", dur: 244, genre: "Dance / Electronic", pop: 86, color: "#9b4b8a" },
  { title: "Don't Let Me Down", artist: "The Chainsmokers", yid: "IpUX2ZqdiXM", dur: 208, genre: "Dance / Electronic", pop: 83, color: "#cf5a6b" },
  { title: "Dance Monkey", artist: "Tones and I", yid: "q0hyYWKXF0Q", dur: 210, genre: "Pop", pop: 85, color: "#d6a95c" },
  { title: "Old Town Road", artist: "Lil Nas X", yid: "r7qovpFAGrQ", dur: 157, genre: "Hip-Hop", pop: 88, color: "#503a2a" },
  { title: "Sunflower", artist: "Post Malone", yid: "ApXoWvfEYVU", dur: 158, genre: "Hip-Hop", pop: 89, color: "#f0d9a8" },
  { title: "Sugar", artist: "Maroon 5", yid: "09R8_2nJtjg", dur: 235, genre: "Pop", pop: 82, color: "#5b6b8c" },
  { title: "Girls Like You", artist: "Maroon 5", yid: "aJOTlE1K90k", dur: 235, genre: "Pop", pop: 80, color: "#d46b6b" },
  // ---- Legacy classics
  { title: "Bohemian Rhapsody", artist: "Queen", yid: "fJ9rUzIMcZQ", dur: 354, genre: "Classic Rock", pop: 94, color: "#7a7a7a" },
  { title: "Don't Stop Me Now", artist: "Queen", yid: "HgzGwKwLmgM", dur: 210, genre: "Classic Rock", pop: 88, color: "#c8c2b0" },
  { title: "Hotel California", artist: "Eagles", yid: "09839DpTctU", dur: 403, genre: "Classic Rock", pop: 90, color: "#8a6a44" },
  { title: "Don't Stop Believin'", artist: "Journey", yid: "1k8craCGpgs", dur: 251, genre: "Classic Rock", pop: 84, color: "#37475a" },
  { title: "Never Gonna Give You Up", artist: "Rick Astley", yid: "dQw4w9WgXcQ", dur: 213, genre: "Dance / Electronic", pop: 86, color: "#2f5a8c" },
  { title: "Billie Jean", artist: "Michael Jackson", yid: "Zi_XLOBDo_Y", dur: 294, genre: "R&B", pop: 95, color: "#404041" },
  { title: "Dancing Queen", artist: "ABBA", yid: "wCDIYseF10A", dur: 234, genre: "Pop", pop: 88, color: "#cfbe6a" },
  { title: "Viva la Vida", artist: "Coldplay", yid: "dvgZkm1xWPE", dur: 242, genre: "Indie", pop: 89, color: "#b5a7c2" },
  { title: "Yellow", artist: "Coldplay", yid: "yKNxeF4KMsY", dur: 269, genre: "Indie", pop: 85, color: "#3f4652" },
  { title: "Do I Wanna Know?", artist: "Arctic Monkeys", yid: "bpOSxM0rNPM", dur: 271, genre: "Indie", pop: 87, color: "#22252a" },
  // ---- Modern hits
  { title: "STAY", artist: "The Kid LAROI", yid: "kTlv5_B-8Uo", dur: 141, genre: "Pop", pop: 90, color: "#b8b4ab" },
  { title: "Peaches", artist: "Justin Bieber", yid: "tQ0yjYUFKAE", dur: 198, genre: "R&B", pop: 84, color: "#e0b3a0" },
  { title: "Havana", artist: "Camila Cabello", yid: "HCjNJDN2OPg", dur: 217, genre: "Latin", pop: 87, color: "#e2c7a6" },
  { title: "Señorita", artist: "Shawn Mendes", yid: "Pkh8UtuejGw", dur: 191, genre: "Pop", pop: 85, color: "#c99663" },
  { title: "Dynamite", artist: "BTS", yid: "gdZLi9oWNZg", dur: 194, genre: "K-Pop", pop: 94, color: "#e85d3f" },
  { title: "Butter", artist: "BTS", yid: "WMweEpGlu_U", dur: 164, genre: "K-Pop", pop: 91, color: "#f2d14e" },
  { title: "Heat Waves", artist: "Glass Animals", yid: "mRD0-GxqHVo", dur: 234, genre: "Indie", pop: 90, color: "#b4753a" },
  { title: "Dark Horse", artist: "Katy Perry", yid: "0KSOMA3QBU0", dur: 213, genre: "Pop", pop: 83, color: "#5b6b8c" },
  { title: "Blank Space", artist: "Taylor Swift", yid: "e-ORhEE9VVg", dur: 252, genre: "Pop", pop: 91, color: "#6f8cae" },
  { title: "Shake It Off", artist: "Taylor Swift", yid: "nfWlot6h_JM", dur: 219, genre: "Pop", pop: 88, color: "#ef5b7c" },
  { title: "Just the Way You Are", artist: "Bruno Mars", yid: "LjhCEhWiKXk", dur: 221, genre: "R&B", pop: 87, color: "#8f7b62" },
  { title: "Diamonds", artist: "Rihanna", yid: "lWA2pjMjpBs", dur: 222, genre: "R&B", pop: 85, color: "#4a5a6a" },
  { title: "Umbrella", artist: "Rihanna", yid: "CvBfHwUxHIk", dur: 275, genre: "R&B", pop: 84, color: "#6a6a6a" },
];

const ALBUMS: AlbumSeed[] = [
  { title: "Delicate Essentials", artist: "Ed Sheeran", year: 2023, type: "compilation", color: "#c96f4a", yids: ["JGwWNGJdvx8", "2Vv-BfVoq4g", "nSDgHBxUbVQ"] },
  { title: "25 Unplugged", artist: "Adele", year: 2021, type: "album", color: "#2f3542", yids: ["YQHsXMglC9A", "rYEDA3JcQqw", "hLQl3WQQoQ0"] },
  { title: "Future Nostalgia", artist: "Dua Lipa", year: 2020, type: "album", color: "#7b5cff", yids: ["TUVcZfQe-Kw", "k2qgadSvMNU", "oygrmJFKYZY"] },
  { title: "After Hours", artist: "The Weeknd", year: 2020, type: "album", color: "#c9303e", yids: ["4NRXx6U8ABQ", "Xxw1V85_Zjo"] },
  { title: "Starboy", artist: "The Weeknd", year: 2016, type: "album", color: "#191a33", yids: ["34Na4j8AVgA"] },
  { title: "Harry's House", artist: "Harry Styles", year: 2022, type: "album", color: "#e0cfb8", yids: ["H5v3kku4y6Q", "E07s5ZYygMg"] },
  { title: "SOUR", artist: "Olivia Rodrigo", year: 2021, type: "album", color: "#8899aa", yids: ["ZmDBbnmKpqQ", "gNi_6U5Pm_o"] },
  { title: "WHEN WE ALL FALL ASLEEP", artist: "Billie Eilish", year: 2019, type: "album", color: "#9e7c5e", yids: ["DyDfgMOUjCI", "V1Pl8CzNzCw"] },
  { title: "Evolve", artist: "Imagine Dragons", year: 2017, type: "album", color: "#c44d4d", yids: ["7wtfhZwyrcc", "fKopy74weus"] },
  { title: "Meteora", artist: "Linkin Park", year: 2003, type: "album", color: "#2c3138", yids: ["kXYiU_JCYtU", "eVTXPUF4Oz4"] },
  { title: "Nevermind", artist: "Nirvana", year: 1991, type: "album", color: "#4f7a9c", yids: ["hTWKbfoikeg", "vabnZ9-ex7o"] },
  { title: "DAMN.", artist: "Kendrick Lamar", year: 2017, type: "album", color: "#2b2b2b", yids: ["tvTRZJ-4EyI", "NLZRYQML-H4"] },
  { title: "Greatest Hits", artist: "Eminem", year: 2005, type: "compilation", color: "#5e5e5e", yids: ["_Yhyp-_-XgQ", "YVkUvmDQ3HY", "XbGs_qK2PQA"] },
  { title: "Classic Cuts", artist: "Queen", year: 1981, type: "compilation", color: "#7a7a7a", yids: ["fJ9rUzIMcZQ", "HgzGwKwLmgM"] },
  { title: "Pop Vault", artist: "Taylor Swift", year: 2014, type: "album", color: "#6f8cae", yids: ["e-ORhEE9VVg", "nfWlot6h_JM"] },
  { title: "The Hits", artist: "Rihanna", year: 2010, type: "compilation", color: "#4a5a6a", yids: ["lWA2pjMjpBs", "CvBfHwUxHIk"] },
];

const ARTISTS_BIO: Record<string, { bio: string; verified: boolean; listeners: number }> = {
  "Ed Sheeran": { bio: "Grammy-winning English singer-songwriter crafting intimate pop and acoustic anthems.", verified: true, listeners: 85_000_000 },
  "Adele": { bio: "British soul-pop powerhouse known for her powerful voice and heart-wrenching ballads.", verified: true, listeners: 62_000_000 },
  "Dua Lipa": { bio: "UK pop superstar blending disco, dance and pop with a futurist edge.", verified: true, listeners: 71_000_000 },
  "The Weeknd": { bio: "Canadian artist whose cinematic R&B and synth-pop defined a generation of charts.", verified: true, listeners: 90_000_000 },
  "Harry Styles": { bio: "Award-winning solo artist known for genre-fluid pop and theatrical performances.", verified: true, listeners: 55_000_000 },
  "Olivia Rodrigo": { bio: "Singer-songwriter whose confessional alt-pop broke global records.", verified: true, listeners: 48_000_000 },
  "Billie Eilish": { bio: "Genre-defying artist and producer known for whisper-soft vocals and bold visuals.", verified: true, listeners: 68_000_000 },
  "Imagine Dragons": { bio: "Las Vegas rock band blending arena rock, pop and electronic textures.", verified: true, listeners: 58_000_000 },
  "Linkin Park": { bio: "Trailblazing rock outfit fusing nu-metal with electronic production.", verified: true, listeners: 45_000_000 },
  "Nirvana": { bio: "The band that brought grunge to the world with raw, cathartic anthems.", verified: true, listeners: 33_000_000 },
  "Guns N' Roses": { bio: "Legendary hard rock band from Los Angeles with timeless arena classics.", verified: true, listeners: 30_000_000 },
  "Oasis": { bio: "British rock icons of the Britpop era with anthemic sing-alongs.", verified: true, listeners: 28_000_000 },
  "Eminem": { bio: "One of the best-selling hip-hop artists of all time, a lyrical force.", verified: true, listeners: 84_000_000 },
  "Kendrick Lamar": { bio: "Pulitzer-winning rapper whose storytelling redefined modern hip-hop.", verified: true, listeners: 66_000_000 },
  "Drake": { bio: "Toronto rapper-singer dominating charts with melodic rap and R&B.", verified: true, listeners: 88_000_000 },
  "Travis Scott": { bio: "Houston rapper and producer behind arena-sized psychedelic trap.", verified: true, listeners: 52_000_000 },
  "Mark Ronson": { bio: "Producer and DJ behind some of the biggest pop-funk records of the decade.", verified: true, listeners: 24_000_000 },
  "Psy": { bio: "Korean pop phenomenon whose global hit broke YouTube records.", verified: true, listeners: 20_000_000 },
  "Luis Fonsi": { bio: "Puerto Rican singer behind the Latin pop phenomenon that swept the globe.", verified: true, listeners: 35_000_000 },
  "The Chainsmokers": { bio: "EDM duo known for melodic crossovers with pop and indie vocals.", verified: true, listeners: 40_000_000 },
  "Tones and I": { bio: "Australian indie-pop artist with a distinctive voice and global sing-along hit.", verified: true, listeners: 22_000_000 },
  "Lil Nas X": { bio: "Rapper and provocateur who merged country, trap and pop into record-breaking hits.", verified: true, listeners: 39_000_000 },
  "Post Malone": { bio: "Genre-blending artist mixing hip-hop, rock and pop with auto-tuned soul.", verified: true, listeners: 64_000_000 },
  "Maroon 5": { bio: "Pop-rock band with a string of slick, chart-topping radio hits.", verified: true, listeners: 44_000_000 },
  "Queen": { bio: "Rock legends known for operatic theatricality and iconic anthems.", verified: true, listeners: 41_000_000 },
  "Eagles": { bio: "American rock band whose harmonies defined the California sound.", verified: true, listeners: 27_000_000 },
  "Journey": { bio: "Classic rock giants famous for stadium-sized power ballads.", verified: true, listeners: 18_000_000 },
  "Rick Astley": { bio: "Pop singer whose 1987 smash became a timeless internet favorite.", verified: true, listeners: 17_000_000 },
  "Michael Jackson": { bio: "The King of Pop — the most influential entertainer in music history.", verified: true, listeners: 38_000_000 },
  "ABBA": { bio: "Swedish pop group behind euphoric disco classics.", verified: true, listeners: 30_000_000 },
  "Coldplay": { bio: "British band crafting soaring, stadium-filling alternative anthems.", verified: true, listeners: 76_000_000 },
  "Arctic Monkeys": { bio: "Brit-rock favorites with a slick, confident garage sensibility.", verified: true, listeners: 31_000_000 },
  "The Kid LAROI": { bio: "Australian pop-rap star blending vulnerable lyricism with melodic hooks.", verified: true, listeners: 36_000_000 },
  "Justin Bieber": { bio: "Global pop icon with an uncanny run of radio ubiquity.", verified: true, listeners: 82_000_000 },
  "Camila Cabello": { bio: "Cuban-American singer with Latin-pop smashes and soulful vocals.", verified: true, listeners: 42_000_000 },
  "Shawn Mendes": { bio: "Canadian singer-songwriter known for warm acoustic-pop romance.", verified: true, listeners: 40_000_000 },
  "BTS": { bio: "The Korean pop phenomenon redefining what a global boyband can be.", verified: true, listeners: 78_000_000 },
  "Glass Animals": { bio: "Psychedelic indie-pop quartet with smoldering, sun-drenched hits.", verified: true, listeners: 25_000_000 },
  "Katy Perry": { bio: "Pop provocateur known for colorful, larger-than-life records.", verified: true, listeners: 50_000_000 },
  "Taylor Swift": { bio: "One of the most celebrated singer-songwriters of her era.", verified: true, listeners: 96_000_000 },
  "Bruno Mars": { bio: "Showman and multi-Grammy artist reviving retro soul and funk.", verified: true, listeners: 70_000_000 },
  "Rihanna": { bio: "Barbadian pop and R&B icon with a string of inescapable hits.", verified: true, listeners: 60_000_000 },
};

function ytThumb(yid: string): string {
  return `https://i.ytimg.com/vi/${yid}/hqdefault.jpg`;
}

async function main() {
  console.log("Seeding GEET catalog…");

  // -------- Users
  const demoPassword = await bcrypt.hash("GeetDemo123!", 10);
  const demo = await prisma.user.upsert({
    where: { email: "demo@geet.app" },
    update: {},
    create: {
      email: "demo@geet.app",
      name: "Demo Listener",
      password: demoPassword,
      role: "user",
      profile: {
        create: {
          displayName: "Demo Listener",
          bio: "Exploring the infinite library of sound.",
          favoriteArtists: JSON.stringify(["The Weeknd", "Dua Lipa", "Coldplay"]),
        },
      },
      preferences: { create: { theme: "dark", volume: 80 } },
    },
  });

  const adminPassword = await bcrypt.hash("GeetAdmin123!", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@geet.app" },
    update: {},
    create: {
      email: "admin@geet.app",
      name: "GEET Admin",
      password: adminPassword,
      role: "admin",
      profile: { create: { displayName: "GEET Admin" } },
    },
  });
  console.log(`Users: demo@geet.app / GeetDemo123!  |  admin@geet.app / GeetAdmin123!`);

  // -------- Genres
  const genres = new Map<string, string>();
  for (const g of GENRES) {
    const row = await prisma.genre.upsert({
      where: { slug: g.slug },
      update: {},
      create: { name: g.name, slug: g.slug, thumbnailColor: g.color },
    });
    genres.set(g.name, row.id);
  }

  // -------- Artists
  const artists = new Map<string, string>();
  for (const t of TRACKS) {
    if (artists.has(t.artist)) continue;
    const meta = ARTISTS_BIO[t.artist] ?? {
      bio: null,
      verified: true,
      listeners: 20_000_000,
    };
    const artist = await prisma.artist.upsert({
      where: { id: `${slugify(t.artist)}` },
      update: {},
      create: {
        id: `${slugify(t.artist)}`,
        name: t.artist,
        normalizedName: slugify(t.artist),
        verified: meta.verified,
        bio: meta.bio,
        monthlyListeners: meta.listeners,
        followers: Math.round(meta.listeners * 0.4),
        thumbnailColor: t.color ?? null,
      },
    });
    artists.set(t.artist, artist.id);
  }

  // -------- Tracks + sources
  const trackIds = new Map<string, string>();
  for (const s of TRACKS) {
    const existing = await prisma.trackSource.findUnique({
      where: { provider_providerVideoId: { provider: "youtube", providerVideoId: s.yid } },
      include: { track: true },
    });
    if (existing) {
      trackIds.set(s.yid, existing.trackId);
      continue;
    }
    const track = await prisma.track.create({
      data: {
        title: s.title,
        artistName: s.artist,
        artistId: artists.get(s.artist),
        durationSec: s.dur ?? null,
        thumbnailUrl: ytThumb(s.yid),
        thumbnailColor: s.color ?? null,
        popularity: s.pop ?? 60,
        genreId: s.genre ? genres.get(s.genre) : null,
        sources: {
          create: {
            provider: "youtube",
            providerVideoId: s.yid,
            title: s.title,
            artistName: s.artist,
            thumbnailUrl: ytThumb(s.yid),
            metadata: JSON.stringify({ seeded: true }),
          },
        },
      },
    });
    trackIds.set(s.yid, track.id);
  }

  // -------- Albums
  for (const a of ALBUMS) {
    const artistId = artists.get(a.artist)!;
    const album = await prisma.album.create({
      data: {
        title: a.title,
        artistId,
        artistName: a.artist,
        coverUrl: a.yids[0] ? ytThumb(a.yids[0]) : null,
        thumbnailColor: a.color ?? null,
        year: a.year,
        type: a.type,
        tracks: {
          create: a.yids
            .map((yid, idx) => ({
              position: idx,
              trackId: trackIds.get(yid)!,
            }))
            .filter((x) => Boolean(x.trackId)),
        },
      },
    });
  }

  // -------- Featured hero content
  const heroYids = ["4NRXx6U8ABQ", "JGwWNGJdvx8", "7wtfhZwyrcc", "gdZLi9oWNZg"];
  let heroPosition = 0;
  for (const yid of heroYids) {
    const track = await prisma.track.findUnique({
      where: { id: trackIds.get(yid)! },
      include: { artist: true },
    });
    if (!track) continue;
    await prisma.featuredContent.upsert({
      where: { id: `hero-${yid}` },
      update: { active: true },
      create: {
        id: `hero-${yid}`,
        section: "hero",
        title: `${track.title} · ${track.artistName}`,
        subtitle: "Featured · Trending worldwide",
        artworkUrl: track.thumbnailUrl,
        trackId: track.id,
        position: heroPosition++,
      },
    });
  }

  // -------- Starter playlists for the demo user
  const chill = await prisma.playlist.upsert({
    where: { id: "pl-chill" },
    update: {},
    create: {
      id: "pl-chill",
      userId: demo.id,
      name: "Chill Focus",
      description: "Low-key tracks to help you disappear into work.",
      isPublic: true,
      thumbnailColor: "#2dd4bf",
    },
  });
  const workout = await prisma.playlist.upsert({
    where: { id: "pl-workout" },
    update: {},
    create: {
      id: "pl-workout",
      userId: demo.id,
      name: "Workout Fuel",
      description: "High energy, zero breaks.",
      isPublic: true,
      thumbnailColor: "#f87171",
    },
  });
  const lateNight = await prisma.playlist.upsert({
    where: { id: "pl-late" },
    update: {},
    create: {
      id: "pl-late",
      userId: demo.id,
      name: "Late Night Drives",
      description: "Neon-lit roads and slow-burning songs.",
      isPublic: true,
      thumbnailColor: "#818cf8",
    },
  });

  await seedPlaylist(prisma, chill.id, [
    "2Vv-BfVoq4g", "ZmDBbnmKpqQ", "viimfQi_pUw", "yKNxeF4KMsY", "mRD0-GxqHVo", "hLQl3WQQoQ0",
  ]);
  await seedPlaylist(prisma, workout.id, [
    "JGwWNGJdvx8", "7wtfhZwyrcc", "OPf0YbXqDm0", "4NRXx6U8ABQ", "kJQP7kiw5Fk", "kTlv5_B-8Uo", "tvTRZJ-4EyI",
  ]);
  await seedPlaylist(prisma, lateNight.id, [
    "4NRXx6U8ABQ", "34Na4j8AVgA", "V1Pl8CzNzCw", "dQw4w9WgXcQ", "Xxw1V85_Zjo", "bpOSxM0rNPM",
  ]);

  // Demo user follows some artists
  for (const artistName of ["The Weeknd", "Dua Lipa", "Coldplay", "BTS", "Eminem"]) {
    await prisma.followedArtist.upsert({
      where: { userId_artistId: { userId: demo.id, artistId: artists.get(artistName)! } },
      update: {},
      create: { userId: demo.id, artistId: artists.get(artistName)! },
    });
  }

  // Demo user likes some tracks + has recent history
  for (const yid of ["4NRXx6U8ABQ", "TUVcZfQe-Kw", "fJ9rUzIMcZQ", "V1Pl8CzNzCw", "kJQP7kiw5Fk"]) {
    await prisma.likedTrack.upsert({
      where: { userId_trackId: { userId: demo.id, trackId: trackIds.get(yid)! } },
      update: {},
      create: { userId: demo.id, trackId: trackIds.get(yid)! },
    });
  }

  const played = [
    { yid: "4NRXx6U8ABQ", minsAgo: 12 },
    { yid: "JGwWNGJdvx8", minsAgo: 45 },
    { yid: "TUVcZfQe-Kw", minsAgo: 130 },
    { yid: "gdZLi9oWNZg", minsAgo: 300 },
    { yid: "7wtfhZwyrcc", minsAgo: 700 },
    { yid: "dvgZkm1xWPE", minsAgo: 1500 },
  ];
  let idx = 0;
  for (const p of played) {
    await prisma.recentlyPlayed.create({
      data: {
        userId: demo.id,
        trackId: trackIds.get(p.yid)!,
        playedAt: new Date(Date.now() - p.minsAgo * 60_000 + idx),
      },
    });
    await prisma.listeningHistory.create({
      data: {
        userId: demo.id,
        trackId: trackIds.get(p.yid)!,
        source: "recommended",
        playedAt: new Date(Date.now() - p.minsAgo * 60_000 + idx),
        completion: 70 + (idx % 30),
      },
    });
    idx++;
  }

  console.log(`Catalog seeded: ${TRACKS.length} tracks, ${artists.size} artists, ${ALBUMS.length} albums.`);
  console.log(`Demo data ready. Sign in with: demo@geet.app / GeetDemo123!`);
}

async function seedPlaylist(
  prisma: PrismaClient,
  playlistId: string,
  yids: string[]
) {
  let position = 0;
  for (const yid of yids) {
    const track = await prisma.trackSource.findUnique({
      where: { provider_providerVideoId: { provider: "youtube", providerVideoId: yid } },
    });
    if (!track) continue;
    const exists = await prisma.playlistTrack.findUnique({
      where: { playlistId_trackId: { playlistId, trackId: track.trackId } },
    });
    if (!exists) {
      await prisma.playlistTrack.create({
        data: { playlistId, trackId: track.trackId, position: position++ },
      });
    } else {
      position++;
    }
  }
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());