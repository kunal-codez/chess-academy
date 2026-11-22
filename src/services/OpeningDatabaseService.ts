import type {
  OpeningRecord,
  OpeningRecognitionResult,
  OpeningSearchQuery
} from '../types/opening.types.ts';
import openingsDataset from '../data/openings/openings.json' with { type: 'json' };

export class OpeningDatabaseService {
  private static instance: OpeningDatabaseService | null = null;

  private records: OpeningRecord[] = [];
  private idMap = new Map<string, OpeningRecord>();
  private sanMap = new Map<string, OpeningRecord>();
  private epdMap = new Map<string, OpeningRecord[]>();
  private ecoMap = new Map<string, OpeningRecord[]>();
  private familyMap = new Map<string, OpeningRecord[]>();

  constructor(customRecords?: OpeningRecord[]) {
    this.records = customRecords || (openingsDataset as OpeningRecord[]);
    this.buildIndices();
  }

  public static getInstance(): OpeningDatabaseService {
    if (!OpeningDatabaseService.instance) {
      OpeningDatabaseService.instance = new OpeningDatabaseService();
    }
    return OpeningDatabaseService.instance;
  }

  private buildIndices(): void {
    this.idMap.clear();
    this.sanMap.clear();
    this.epdMap.clear();
    this.ecoMap.clear();
    this.familyMap.clear();

    for (const record of this.records) {
      // 1. ID Index
      this.idMap.set(record.id, record);

      // 2. SAN sequence index
      const sanKey = record.movesSan.join(' ');
      this.sanMap.set(sanKey, record);

      // 3. EPD index (for transposition detection)
      if (!this.epdMap.has(record.epd)) {
        this.epdMap.set(record.epd, []);
      }
      this.epdMap.get(record.epd)!.push(record);

      // 4. ECO index
      const upperEco = record.eco.toUpperCase();
      if (!this.ecoMap.has(upperEco)) {
        this.ecoMap.set(upperEco, []);
      }
      this.ecoMap.get(upperEco)!.push(record);

      // 5. Family index
      const famKey = record.family.toLowerCase();
      if (!this.familyMap.has(famKey)) {
        this.familyMap.set(famKey, []);
      }
      this.familyMap.get(famKey)!.push(record);
    }
  }

  public getTotalCount(): number {
    return this.records.length;
  }

  public getAllRecords(): OpeningRecord[] {
    return [...this.records];
  }

  public getById(id: string): OpeningRecord | undefined {
    return this.idMap.get(id);
  }

  public getByEco(eco: string): OpeningRecord[] {
    return this.ecoMap.get(eco.toUpperCase()) || [];
  }

  public getByEcoRange(startEco: string, endEco: string): OpeningRecord[] {
    const start = startEco.toUpperCase();
    const end = endEco.toUpperCase();
    return this.records.filter((r) => r.eco >= start && r.eco <= end);
  }

  public getByFamily(family: string): OpeningRecord[] {
    const query = family.toLowerCase().trim();
    const results: OpeningRecord[] = [];
    this.familyMap.forEach((records, fam) => {
      if (fam.includes(query)) {
        results.push(...records);
      }
    });
    return results;
  }

  /**
   * Search openings by multiple criteria: text query, ECO code, family, ECO range.
   */
  public search(criteria: OpeningSearchQuery): OpeningRecord[] {
    let matches = this.records;

    // Filter by ECO code (exact or prefix)
    if (criteria.eco) {
      const targetEco = criteria.eco.toUpperCase().trim();
      matches = matches.filter((r) => r.eco.startsWith(targetEco));
    }

    // Filter by ECO range
    if (criteria.ecoRange) {
      const start = criteria.ecoRange.start.toUpperCase();
      const end = criteria.ecoRange.end.toUpperCase();
      matches = matches.filter((r) => r.eco >= start && r.eco <= end);
    }

    // Filter by Family
    if (criteria.family) {
      const famTarget = criteria.family.toLowerCase().trim();
      matches = matches.filter((r) => r.family.toLowerCase().includes(famTarget));
    }

    // Filter by text query (searches name, family, variation, and ECO)
    if (criteria.query) {
      const q = criteria.query.toLowerCase().trim();
      matches = matches.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.eco.toLowerCase().includes(q) ||
          r.family.toLowerCase().includes(q) ||
          (r.variation && r.variation.toLowerCase().includes(q)) ||
          (r.subvariation && r.subvariation.toLowerCase().includes(q))
      );
    }

    // Pagination / Slicing
    const offset = criteria.offset || 0;
    const limit = criteria.limit !== undefined ? criteria.limit : matches.length;
    return matches.slice(offset, offset + limit);
  }

  /**
   * Recognizes opening from a played sequence of SAN moves and/or current position EPD.
   * Identifies longest matching line, transpositions, and continuation candidates.
   */
  public recognize(movesSan: string[], currentEpd?: string): OpeningRecognitionResult {
    if (movesSan.length === 0) {
      return {
        matched: false,
        isExactMatch: false,
        isPrefixMatch: false,
        matchedPly: 0
      };
    }

    const currentKey = movesSan.join(' ');

    // 1. Check Exact Move Sequence Match
    const exactMatch = this.sanMap.get(currentKey);
    if (exactMatch) {
      // Find candidate lines branching from this exact position
      const candidates = this.findContinuations(movesSan);
      return {
        matched: true,
        isExactMatch: true,
        isPrefixMatch: false,
        opening: exactMatch,
        family: exactMatch.family,
        matchedPly: movesSan.length,
        transposition: false,
        candidateOpenings: candidates
      };
    }

    // 2. Longest Prefix Match (User played beyond a known opening line)
    // Step backwards through moves to find the deepest recognized opening variation
    let longestPrefixMatch: OpeningRecord | null = null;
    let longestPrefixPly = 0;

    for (let i = movesSan.length - 1; i >= 1; i--) {
      const prefixKey = movesSan.slice(0, i).join(' ');
      const prefixMatch = this.sanMap.get(prefixKey);
      if (prefixMatch) {
        longestPrefixMatch = prefixMatch;
        longestPrefixPly = i;
        break;
      }
    }

    // 3. Transposition Matching via EPD (Normalized FEN)
    // If the move order diverged but reached a recognised opening position
    if (currentEpd) {
      const epdMatches = this.epdMap.get(currentEpd);
      if (epdMatches && epdMatches.length > 0) {
        const transposed = epdMatches[0];
        const candidates = this.findContinuations(movesSan);
        return {
          matched: true,
          isExactMatch: movesSan.length === transposed.plyCount,
          isPrefixMatch: movesSan.length > transposed.plyCount,
          opening: transposed,
          family: transposed.family,
          matchedPly: movesSan.length,
          transposition: true,
          candidateOpenings: candidates
        };
      }
    }

    // If a prefix was found, verify it represents a genuine opening match rather than an early single-ply divergence
    if (longestPrefixMatch) {
      // If only a single half-move (ply 1) matched but game has diverged 4+ plies into unclassified moves,
      // it is considered an unclassified / unknown position.
      if (longestPrefixPly === 1 && movesSan.length >= 4) {
        return {
          matched: false,
          isExactMatch: false,
          isPrefixMatch: false,
          matchedPly: 0
        };
      }

      const candidates = this.findContinuations(movesSan);
      return {
        matched: true,
        isExactMatch: false,
        isPrefixMatch: true,
        opening: longestPrefixMatch,
        family: longestPrefixMatch.family,
        matchedPly: longestPrefixPly,
        transposition: false,
        candidateOpenings: candidates
      };
    }

    // No opening matched
    return {
      matched: false,
      isExactMatch: false,
      isPrefixMatch: false,
      matchedPly: 0
    };
  }

  /**
   * Finds candidate openings that continue from the given move prefix.
   */
  public findContinuations(movesSan: string[], limit = 6): OpeningRecord[] {
    const key = movesSan.join(' ');
    const candidates: OpeningRecord[] = [];

    for (const record of this.records) {
      const recordKey = record.movesSan.join(' ');
      if (recordKey.startsWith(key) && recordKey !== key) {
        candidates.push(record);
        if (candidates.length >= limit) break;
      }
    }

    return candidates;
  }
}

export const openingDatabase = OpeningDatabaseService.getInstance();
