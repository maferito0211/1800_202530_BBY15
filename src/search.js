import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  startAt,
  endAt,
} from "firebase/firestore";

import { db } from "./firebaseConfig";

const MAX_RESULTS = 20;

// Utility: build a prefix range
function prefixRange(field, qLower) {
  // Firestore supports range using orderBy + startAt/endAt OR where with '\uf8ff' trick
  // We'll use orderBy for clarity and indexing.
  return {
    orderByField: field,
    start: qLower,
    end: qLower + "\uf8ff",
  };
}

export async function searchThreads(q) {
  const qLower = q.trim().toLowerCase();
  if (!qLower) return [];

  // Search title prefix
  const titleRange = prefixRange("titleLower", qLower);
  const titleQuery = query(
    collection(db, "threads"),
    orderBy(titleRange.orderByField),
    startAt(titleRange.start),
    endAt(titleRange.end),
    limit(MAX_RESULTS)
  );

  // Search content prefix (optional second pass)
  const contentRange = prefixRange("contentLower", qLower);
  const contentQuery = query(
    collection(db, "threads"),
    orderBy(contentRange.orderByField),
    startAt(contentRange.start),
    endAt(contentRange.end),
    limit(MAX_RESULTS)
  );

  const [titleSnap, contentSnap] = await Promise.all([
    getDocs(titleQuery),
    getDocs(contentQuery),
  ]);
  const results = [];

  titleSnap.forEach((doc) =>
    results.push({ id: doc.id, ...doc.data(), _match: "title" })
  );
  contentSnap.forEach((doc) =>
    results.push({ id: doc.id, ...doc.data(), _match: "content" })
  );

  //Deduplicate by id, prefer title matches over content matches
  const unique = new Map();
  for (const r of results) {
    if (!unique.has(r.id) || unique.get(r.id)._match !== "title") {
      unique.set(r.id, r);
    }
  }
  return Array.from(unique.values());
}
