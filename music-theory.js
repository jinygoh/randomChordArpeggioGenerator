console.log("music-theory.js loaded successfully.");

const MusicTheory = (() => {
    const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

    const SCALES = {
        MAJOR: { intervals: [0, 2, 4, 5, 7, 9, 11], name: "Major" },
        NATURAL_MINOR: { intervals: [0, 2, 3, 5, 7, 8, 10], name: "Natural Minor" },
        HARMONIC_MINOR: { intervals: [0, 2, 3, 5, 7, 8, 11], name: "Harmonic Minor" },
        MELODIC_MINOR: { intervals: [0, 2, 3, 5, 7, 9, 11], name: "Melodic Minor (Asc)" }, // Ascending form
        DORIAN: { intervals: [0, 2, 3, 5, 7, 9, 10], name: "Dorian" },
        PHYRIGIAN: { intervals: [0, 1, 3, 5, 7, 8, 10], name: "Phrygian" },
        LYDIAN: { intervals: [0, 2, 4, 6, 7, 9, 11], name: "Lydian" },
        MIXOLYDIAN: { intervals: [0, 2, 4, 5, 7, 9, 10], name: "Mixolydian" },
        LOCRIAN: { intervals: [0, 1, 3, 5, 6, 8, 10], name: "Locrian" },
        PENTATONIC_MAJOR: { intervals: [0, 2, 4, 7, 9], name: "Pentatonic Major" },
        PENTATONIC_MINOR: { intervals: [0, 3, 5, 7, 10], name: "Pentatonic Minor" },
        // Add more scales as needed: Blues, Whole Tone, Diminished, etc.
    };

    const CHORD_TYPES = {
        TRIAD_MAJOR: [0, 4, 7],
        TRIAD_MINOR: [0, 3, 7],
        TRIAD_DIMINISHED: [0, 3, 6],
        TRIAD_AUGMENTED: [0, 4, 8], // Less common diatonically but good to have
        SEVENTH_MAJ7: [0, 4, 7, 11],
        SEVENTH_MIN7: [0, 3, 7, 10],
        SEVENTH_DOM7: [0, 4, 7, 10],
        SEVENTH_DIM7: [0, 3, 6, 9],
        SEVENTH_HALF_DIM7: [0, 3, 6, 10], // m7b5
    };

    // Diatonic chords for Major scale (triads and sevenths)
    const MAJOR_SCALE_CHORDS = {
        triads: ["TRIAD_MAJOR", "TRIAD_MINOR", "TRIAD_MINOR", "TRIAD_MAJOR", "TRIAD_MAJOR", "TRIAD_MINOR", "TRIAD_DIMINISHED"],
        sevenths: ["SEVENTH_MAJ7", "SEVENTH_MIN7", "SEVENTH_MIN7", "SEVENTH_MAJ7", "SEVENTH_DOM7", "SEVENTH_MIN7", "SEVENTH_HALF_DIM7"]
    };
    // Diatonic chords for Natural Minor scale
    const NATURAL_MINOR_SCALE_CHORDS = {
        triads: ["TRIAD_MINOR", "TRIAD_DIMINISHED", "TRIAD_MAJOR", "TRIAD_MINOR", "TRIAD_MINOR", "TRIAD_MAJOR", "TRIAD_MAJOR"],
        sevenths: ["SEVENTH_MIN7", "SEVENTH_HALF_DIM7", "SEVENTH_MAJ7", "SEVENTH_MIN7", "SEVENTH_MIN7", "SEVENTH_MAJ7", "SEVENTH_DOM7"]
    };
    // TODO: Add diatonic chords for other scales (Harmonic Minor, Melodic Minor especially)
    // For Harmonic Minor, V should be Major/Dominant 7th.
    // For Melodic Minor (Asc), IV and V should be Major/Dominant 7th, ii min, vii° half-dim.

    const ROMAN_NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII"];

    // --- Helper Functions ---
    /**
     * Converts a MIDI note value (0-11 for C to B) and octave to a note name string.
     * Not directly used by Tone.js which prefers scientific notation like "C4".
     * Kept for potential utility.
     */
    function noteValueToName(noteValue, octave = 4) {
        return NOTE_NAMES[noteValue % 12] + octave;
    }

    function noteNameToValue(noteName) {
        const noteStr = noteName.slice(0, -1);
        const octave = parseInt(noteName.slice(-1));
        const noteIndex = NOTE_NAMES.indexOf(noteStr.toUpperCase());
        if (noteIndex === -1) throw new Error(`Invalid note name: ${noteStr}`);
        return noteIndex + octave * 12;
    }

    function getNoteName(midiNoteNumber) {
        if (midiNoteNumber < 0 || midiNoteNumber > 127) {
            throw new Error("MIDI note number out of range (0-127).");
        }
        const octave = Math.floor(midiNoteNumber / 12) - 1; // MIDI C4 is 60. Tone.js C4 is C4.
        const noteIndex = midiNoteNumber % 12;
        return NOTE_NAMES[noteIndex] + octave;
    }


    // --- Scale and Key Functions ---
    function getRandomKey() {
        return NOTE_NAMES[Math.floor(Math.random() * NOTE_NAMES.length)];
    }

    function getRandomScaleKey() {
        const scaleKeys = Object.keys(SCALES);
        const randomScaleName = scaleKeys[Math.floor(Math.random() * scaleKeys.length)];
        return randomScaleName;
    }

    function getScaleNotes(rootNote, scaleName, octave = 4) {
        const rootValue = NOTE_NAMES.indexOf(rootNote);
        if (rootValue === -1) throw new Error(`Invalid root note: ${rootNote}`);
        if (!SCALES[scaleName]) throw new Error(`Unknown scale: ${scaleName}`);

        const scaleIntervals = SCALES[scaleName].intervals;
        return scaleIntervals.map(interval => {
            const noteMidi = rootValue + interval + octave * 12;
            return getNoteName(noteMidi);
        });
    }

    // --- Chord Generation Functions ---
    function getChordNotes(rootNote, chordTypeKey, octave = 4) {
        const rootValue = NOTE_NAMES.indexOf(rootNote);
        if (rootValue === -1) throw new Error(`Invalid root note: ${rootNote}`);
        if (!CHORD_TYPES[chordTypeKey]) throw new Error(`Unknown chord type: ${chordTypeKey}`);

        const chordIntervals = CHORD_TYPES[chordTypeKey];
        return chordIntervals.map(interval => {
            // Ensure notes wrap around correctly within an octave for naming, but Tone.js needs absolute pitch.
            // For simplicity here, we'll generate names in a default octave, playback will handle true pitch.
            const noteMidi = rootValue + interval + octave * 12;
            return getNoteName(noteMidi);
        });
    }

    function getChordName(rootNote, chordTypeKey) {
        if (!CHORD_TYPES[chordTypeKey]) return rootNote; // Fallback

        let suffix = "";
        switch (chordTypeKey) {
            case "TRIAD_MAJOR": suffix = "maj"; break;
            case "TRIAD_MINOR": suffix = "min"; break;
            case "TRIAD_DIMINISHED": suffix = "dim"; break;
            case "TRIAD_AUGMENTED": suffix = "aug"; break;
            case "SEVENTH_MAJ7": suffix = "maj7"; break;
            case "SEVENTH_MIN7": suffix = "min7"; break;
            case "SEVENTH_DOM7": suffix = "7"; break;
            case "SEVENTH_DIM7": suffix = "dim7"; break;
            case "SEVENTH_HALF_DIM7": suffix = "m7b5"; break;
            default: break;
        }
        return rootNote + suffix;
    }

    function generateDiatonicProgression(rootKey, scaleKey, numChords = 4, useSevenths = false) {
        const rootNoteIndex = NOTE_NAMES.indexOf(rootKey);
        if (rootNoteIndex === -1) throw new Error("Invalid root key for progression.");
        if (!SCALES[scaleKey]) throw new Error("Invalid scale for progression.");

        const scaleIntervals = SCALES[scaleKey].intervals;
        let chordSet = useSevenths ? MAJOR_SCALE_CHORDS.sevenths : MAJOR_SCALE_CHORDS.triads; // Default to major
        let scaleRomanNumerals = [...ROMAN_NUMERALS];

        // Basic support for minor key chords. More complex scales would need specific definitions.
        if (scaleKey === "NATURAL_MINOR" || scaleKey === "HARMONIC_MINOR" || scaleKey === "MELODIC_MINOR") {
            chordSet = useSevenths ? NATURAL_MINOR_SCALE_CHORDS.sevenths : NATURAL_MINOR_SCALE_CHORDS.triads;
            // Adjust Roman numerals for minor quality for display (e.g., i, ii°, III, iv, v, VI, VII)
            // This is a simplification; true harmonic/melodic minor has more variation.
            scaleRomanNumerals = ROMAN_NUMERALS.map((rn, i) => {
                const type = chordSet[i];
                if (type.includes("MINOR")) return rn.toLowerCase();
                if (type.includes("DIMINISHED")) return rn.toLowerCase() + "°";
                if (type === "TRIAD_MAJOR" && (i === 2 || i === 5 || i === 6) && scaleKey !== "MAJOR") return rn; // III, VI, VII in minor
                return rn;
            });
        }
        // TODO: Add more specific chord sets for Harmonic Minor (V becomes major/dom7), etc.

        const progression = [];
        let currentDegree = 0; // Start with I (tonic)

        // Weighted probabilities for "musically pleasing" progressions (simple version)
        // From I: common moves are to IV, V, vi, ii
        // From V: common moves are to I, vi
        // From IV: common moves are to V, I, ii
        // From vi: common moves are to IV, ii, V
        // From ii: common moves are to V, vii°
        // From iii: common moves are to vi, IV
        // From vii°: common move is to I
        // This is a very simplified model. A more complex one could use Markov chains or predefined patterns.

        const nextChordProbabilities = [
            // Probabilities for next chord based on current chord's degree (0-6 for I-VII)
            // Example for I (degree 0): high prob for IV, V, vi
            [ {degree: 3, weight: 3}, {degree: 4, weight: 4}, {degree: 5, weight: 2}, {degree: 1, weight: 1} ], // From I
            [ {degree: 4, weight: 4}, {degree: 6, weight: 2}, {degree: 0, weight: 1} ],                       // From ii
            [ {degree: 5, weight: 4}, {degree: 3, weight: 2}, {degree: 0, weight: 1} ],                       // From iii
            [ {degree: 4, weight: 4}, {degree: 0, weight: 3}, {degree: 1, weight: 2}, {degree: 6, weight: 1} ], // From IV
            [ {degree: 0, weight: 5}, {degree: 5, weight: 2}, {degree: 3, weight: 1} ],                       // From V
            [ {degree: 1, weight: 3}, {degree: 3, weight: 4}, {degree: 4, weight: 2}, {degree: 0, weight: 1} ], // From vi
            [ {degree: 0, weight: 5}, {degree: 2, weight: 1} ]                                                // From vii°
        ];


        for (let i = 0; i < numChords; i++) {
            if (i > 0) { // Not the first chord (which is I)
                const possibleNext = nextChordProbabilities[currentDegree];
                const totalWeight = possibleNext.reduce((sum, opt) => sum + opt.weight, 0);
                let randomPick = Math.random() * totalWeight;
                let chosenOpt = possibleNext[possibleNext.length -1]; // Default to last if something goes wrong
                for(const opt of possibleNext) {
                    if (randomPick < opt.weight) {
                        chosenOpt = opt;
                        break;
                    }
                    randomPick -= opt.weight;
                }
                currentDegree = chosenOpt.degree;
            } else {
                 // Ensure the first chord is always I, unless it's a very short progression.
                 // For very short ones (2 chords), allow V-I or IV-I, etc.
                if (numChords > 2) {
                    currentDegree = 0; // Start on I
                } else {
                    currentDegree = Math.random() < 0.6 ? 0 : (Math.random() < 0.5 ? 3 : 4); // I, IV, or V
                }
            }

            const chordRootNoteIndex = (rootNoteIndex + scaleIntervals[currentDegree]) % 12;
            const chordRootNoteName = NOTE_NAMES[chordRootNoteIndex];
            const chordTypeKey = chordSet[currentDegree];

            const notes = getChordNotes(chordRootNoteName, chordTypeKey, 4); // Default octave 4 for now
            progression.push({
                root: chordRootNoteName,
                type: chordTypeKey,
                name: getChordName(chordRootNoteName, chordTypeKey),
                roman: scaleRomanNumerals[currentDegree],
                notes: notes, // Array of note names like ["C4", "E4", "G4"]
                degree: currentDegree // Store the degree (0-6)
            });
        }
        return progression;
    }

    // --- Arpeggio Generation ---
    const ARPEGGIO_PATTERNS = {
        UP: (chordNotes) => [...chordNotes],
        DOWN: (chordNotes) => [...chordNotes].reverse(),
        UP_DOWN: (chordNotes) => {
            if (chordNotes.length <= 1) return [...chordNotes];
            const up = chordNotes.slice(0, chordNotes.length -1);
            const down = [...chordNotes].reverse().slice(0, chordNotes.length -1);
            return [...up, ...down]; // e.g. C-E-G-B becomes C-E-G-B-G-E
                                      // A better up-down for arps is often root-3-5-octave-5-3
                                      // For now, this is simpler: C E G -> C E G E
        },
        RANDOM: (chordNotes) => {
            const shuffled = [...chordNotes];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            return shuffled;
        }
        // TODO: Add more complex patterns (e.g., specific rhythmic variations, octave jumps)
    };

    function generateArpeggio(chordNotes, patternKey = "UP") {
        if (!ARPEGGIO_PATTERNS[patternKey]) throw new Error(`Unknown arpeggio pattern: ${patternKey}`);
        return ARPEGGIO_PATTERNS[patternKey](chordNotes);
    }

    // --- Public API ---
    return {
        NOTE_NAMES,
        SCALES, // Expose for UI dropdowns
        CHORD_TYPES, // Potentially for advanced UI
        ROMAN_NUMERALS,

        getRandomKey,
        getRandomScaleKey,
        getScaleNotes,
        getNoteName, // For converting MIDI number to name (e.g. C4)
        noteNameToValue, // For converting name to MIDI number relative to C0 (e.g., C4 to 48)

        getChordNotes,
        getChordName,
        generateDiatonicProgression,

        ARPEGGIO_PATTERNS, // Expose for UI
        generateArpeggio,

        // Constants for MIDI note numbers (useful for visualizer)
        C0_MIDI: 12, // MIDI note number for C0
        C4_MIDI: 60  // MIDI note number for C4 (Middle C)
    };

})();

// Example Usage (for testing in console)
// const randomKey = MusicTheory.getRandomKey();
// const randomScale = MusicTheory.getRandomScaleKey();
// console.log(`Random Key: ${randomKey}, Random Scale: ${MusicTheory.SCALES[randomScale].name}`);
// const scaleNotes = MusicTheory.getScaleNotes(randomKey, randomScale, 4);
// console.log("Scale Notes:", scaleNotes);

// const progression = MusicTheory.generateDiatonicProgression(randomKey, randomScale, 4, true);
// console.log("Generated Progression:", progression.map(c => `${c.name} (${c.roman})`).join(' - '));
// progression.forEach(chord => {
//     console.log(`Chord ${chord.name}: ${chord.notes.join(', ')}`);
//     const arpUp = MusicTheory.generateArpeggio(chord.notes, "UP");
//     console.log(`Arp Up: ${arpUp.join(', ')}`);
//     const arpUpDown = MusicTheory.generateArpeggio(chord.notes, "UP_DOWN");
//     console.log(`Arp Up-Down: ${arpUpDown.join(', ')}`);
// });
