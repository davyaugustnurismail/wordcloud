import type { StageEntry } from "@/components/wordcloud-stage";

const HOT = ["bahagia", "seru", "irie", "one-love", "santai", "damai", "merdeka"];

const ALL = [
  "bahagia", "seru", "irie", "one-love", "rindu", "merdeka", "santai", "gokil", "cinta", "damai", "semangat", "bebas",
  "hangat", "pecah", "asik", "syukur", "kompak", "keren", "nyaman", "ceria", "bangga", "bersama", "positif", "vibes",
  "harmoni", "cerah", "kawan", "nikmat", "riang", "lepas", "tenang", "mantap", "juara", "sahabat", "takjub", "terharu",
  "girang", "sejuk", "merinding", "puas", "gembira", "adem", "rasta", "jamming", "goyang", "respect", "groove", "senyum",
  "peace", "cahaya", "malam", "berani", "tulus", "plong", "hepi", "menyala", "luar-biasa", "meriah", "syahdu", "santuy",
  "hore", "reggae", "priangan", "manis", "lega", "haru", "wow", "mesra", "ramai", "bersinar", "legenda", "nostalgia",
  "kangen", "healing", "cuan", "sabar", "ikhlas", "mantul", "joss", "asyik",
];

function rng(seed: number): () => number {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function demoEntries(count: number, latest: string, seed: number): StageEntry[] {
  const random = rng(seed * 7919 + 13);
  const entries: StageEntry[] = [];
  for (let i = 0; i < count; i++) {
    let text = latest;
    if (i > 0) {
      text =
        random() < 0.24
          ? (HOT[Math.floor(random() * HOT.length)] ?? latest)
          : (ALL[Math.floor(random() * ALL.length)] ?? latest);
    }
    entries.push({ id: `demo-${seed}-${count - i}`, text });
  }
  return entries;
}
