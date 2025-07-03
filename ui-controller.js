console.log("ui-controller.js loaded successfully.");

const UIController = (() => {
    // DOM Element References (cached for performance)
    const DOMElements = {
        keySelect: document.getElementById('keySelect'),
        scaleTypeSelect: document.getElementById('scaleTypeSelect'),
        numChordsSlider: document.getElementById('numChordsSlider'),
        numChordsValueDisplay: document.getElementById('numChordsValue'),
        use7thChordsToggle: document.getElementById('use7thChordsToggle'),
        romanNumeralDisplay: document.getElementById('romanNumeralDisplay'),
        chordNameDisplay: document.getElementById('chordNameDisplay'),
        bpmSlider: document.getElementById('bpmSlider'),
        bpmInput: document.getElementById('bpmInput'),
        volumeSlider: document.getElementById('volumeSlider'),
        volumeValueDisplay: document.getElementById('volumeValue'),
        pianoKeyboardDiv: document.getElementById('pianoKeyboard'),
        pianoRollDiv: document.getElementById('pianoRoll'),
        // Add more elements as they are interacted with by this controller
    };

    // --- Piano Keyboard Generation ---
    const LOWEST_NOTE = "C2"; // e.g., C2
    const HIGHEST_NOTE = "B5"; // e.g., B5 (Covers a good range for melodies/chords)
    const TOTAL_WHITE_KEYS_IN_OCTAVE = 7;
    const WHITE_KEY_PERCENT_HEIGHT = 100 / (MusicTheory.noteNameToValue(HIGHEST_NOTE) / 12 * TOTAL_WHITE_KEYS_IN_OCTAVE); // Approximate for now

    function createPianoKeyboard() {
        if (!DOMElements.pianoKeyboardDiv || !MusicTheory) return;
        DOMElements.pianoKeyboardDiv.innerHTML = ''; // Clear previous keys

        const lowestMidi = MusicTheory.noteNameToValue(LOWEST_NOTE);
        const highestMidi = MusicTheory.noteNameToValue(HIGHEST_NOTE);
        let currentWhiteKeyOctave = -1;
        let whiteKeyCounterInOctave = 0;

        for (let midi = lowestMidi; midi <= highestMidi; midi++) {
            const noteName = MusicTheory.getNoteName(midi); // e.g., "C4", "C#4"
            const isBlackKey = noteName.includes("#");

            const keyDiv = document.createElement('div');
            keyDiv.classList.add('piano-key');
            keyDiv.classList.add(isBlackKey ? 'black' : 'white');
            keyDiv.dataset.note = noteName;
            keyDiv.dataset.midi = midi;

            const noteLabelSpan = document.createElement('span');
            noteLabelSpan.classList.add('note-label');
            noteLabelSpan.textContent = noteName;
            keyDiv.appendChild(noteLabelSpan);

            // Set height based on whether it's white or black
            // This is a simplified approach for height. A more robust way would calculate total height
            // and distribute it, or use fixed heights.
            // For perfect alignment with a grid-based piano roll, each distinct pitch (each key)
            // should occupy the same vertical space in the keyboard visual as a row in the roll.
            // Let's assume each semitone gets an equal slice of height for now.
            // This will be refined when piano roll rows are implemented.

            DOMElements.pianoKeyboardDiv.appendChild(keyDiv);
        }
        console.log(`Piano keyboard generated from ${LOWEST_NOTE} to ${HIGHEST_NOTE}`);
    }


    function populateScaleDropdown() {
        if (!DOMElements.scaleTypeSelect || !MusicTheory || !MusicTheory.SCALES) return;
        // Clear existing options except perhaps a placeholder if desired
        // DOMElements.scaleTypeSelect.innerHTML = '';
        Object.keys(MusicTheory.SCALES).forEach(scaleKey => {
            const option = document.createElement('option');
            option.value = scaleKey;
            option.textContent = MusicTheory.SCALES[scaleKey].name;
            DOMElements.scaleTypeSelect.appendChild(option);
        });
    }

    function updateScaleKeyDisplay(key, scaleKey) {
        if (DOMElements.keySelect) DOMElements.keySelect.value = key;
        if (DOMElements.scaleTypeSelect) DOMElements.scaleTypeSelect.value = scaleKey;
    }

    function updateChordDisplay(progression) {
        if (!progression || progression.length === 0) {
            if (DOMElements.romanNumeralDisplay) DOMElements.romanNumeralDisplay.textContent = "- - - -";
            if (DOMElements.chordNameDisplay) DOMElements.chordNameDisplay.textContent = "- - - -";
            return;
        }
        const romanNumerals = progression.map(c => c.roman).join(' - ');
        const chordNames = progression.map(c => c.name).join(' - ');
        if (DOMElements.romanNumeralDisplay) DOMElements.romanNumeralDisplay.textContent = romanNumerals;
        if (DOMElements.chordNameDisplay) DOMElements.chordNameDisplay.textContent = chordNames;
    }

    function updateNumChordsDisplay(value) {
        if (DOMElements.numChordsValueDisplay) DOMElements.numChordsValueDisplay.textContent = value;
    }

    function updateTempoDisplay(bpm) {
        if (DOMElements.bpmSlider) DOMElements.bpmSlider.value = bpm;
        if (DOMElements.bpmInput) DOMElements.bpmInput.value = bpm;
    }

    function updateVolumeDisplay(db) {
        if (DOMElements.volumeSlider) DOMElements.volumeSlider.value = db;
        if (DOMElements.volumeValueDisplay) DOMElements.volumeValueDisplay.textContent = `${db} dB`;
    }

    // Initialize UI elements that need it
    function init() {
        populateScaleDropdown();
        createPianoKeyboard(); // Generate the piano keyboard on init
        // Set initial values from controls if necessary (e.g. slider display values)
        if (DOMElements.numChordsSlider) updateNumChordsDisplay(DOMElements.numChordsSlider.value);
        if (DOMElements.bpmSlider) updateTempoDisplay(DOMElements.bpmSlider.value);
        if (DOMElements.volumeSlider) updateVolumeDisplay(DOMElements.volumeSlider.value);
    }

    // Public API
    return {
        init,
        DOMElements, // Expose for script.js to easily add listeners
        updateScaleKeyDisplay,
        updateChordDisplay,
        updateNumChordsDisplay,
        updateTempoDisplay,
        updateVolumeDisplay,
        createPianoKeyboard, // Expose if needed for re-creation, though init should cover it
        renderPianoRoll,
        updatePlayheadPosition,
        clearPianoRoll
    };
})();

document.addEventListener('DOMContentLoaded', UIController.init);


// Helper function (can be in ui-controller.js or a separate utils.js if it grows)
function mapToRange(value, inMin, inMax, outMin, outMax) {
    // Basic linear mapping
    return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
}
// --- Piano Roll Rendering ---
// Constants for piano roll grid. These need to correspond to how playback is scheduled.
// For now, let's assume 1 measure per chord, and 16th notes as the finest resolution.
const BEATS_PER_MEASURE = 4;
const SUBDIVISIONS_PER_BEAT = 4; // e.g., 4 for 16th notes
const CELLS_PER_MEASURE = BEATS_PER_MEASURE * SUBDIVISIONS_PER_BEAT; // 16 cells for a 4/4 measure if finest is 16th

// This function will be part of UIController
UIController.renderPianoRoll = function(progression, arpeggios, arpRhythm, numChords) {
    if (!this.DOMElements.pianoRollDiv || !MusicTheory) {
        console.error("Piano roll div or MusicTheory not found for rendering.");
        return;
    }
    this.clearPianoRoll();

    if (!progression || progression.length === 0) {
        console.log("No progression to render on piano roll.");
        return;
    }

    const lowestMidiDisplay = MusicTheory.noteNameToValue(LOWEST_NOTE); // e.g., C2
    const highestMidiDisplay = MusicTheory.noteNameToValue(HIGHEST_NOTE); // e.g., B5
    const totalPitchRows = highestMidiDisplay - lowestMidiDisplay + 1;

    // Calculate total columns for the piano roll grid
    // Each chord currently takes 1 measure ("1n" in Tone.js scheduling)
    const totalMeasures = numChords;
    const totalGridColumns = totalMeasures * CELLS_PER_MEASURE;

    // Set CSS properties for the grid on the pianoRollDiv itself
    // This makes the pianoRollDiv a grid container for the note blocks
    this.DOMElements.pianoRollDiv.style.gridTemplateColumns = `repeat(${totalGridColumns}, 1fr)`;
    // Rows are implicitly defined by the note's pitch. The piano roll itself is a grid container.
    // Individual notes are placed onto this grid using grid-row-start and grid-column-start.

    // The height of pianoRollDiv and pianoKeyboard should be managed to show all pitchRows.
    // Each piano key (semitone) is defined to be 20px high in CSS.
    const keyHeight = 20; // Must match .piano-key.white height in style.css
    const requiredHeight = totalPitchRows * keyHeight;
    this.DOMElements.pianoRollDiv.style.height = `${requiredHeight}px`;
    this.DOMElements.pianoKeyboardDiv.style.height = `${requiredHeight}px`; // Ensure keyboard matches roll height


    let currentMeasure = 0;

    progression.forEach((chord, chordIndex) => {
        const notesToRender = (arpeggios && arpeggios[chordIndex] && AppState.arpPattern !== 'none')
                              ? arpeggios[chordIndex]
                              : chord.notes;

        const isArpeggio = (arpeggios && arpeggios[chordIndex] && AppState.arpPattern !== 'none');

        let noteDurationCells; // Duration of each note in grid cells
        let numNotesInChordMeasure = notesToRender.length;

        if (isArpeggio) {
            switch (arpRhythm) {
                case "sixteenths": // 4 notes per beat, 16 per measure
                    noteDurationCells = SUBDIVISIONS_PER_BEAT / (numNotesInChordMeasure / BEATS_PER_MEASURE) ; // if 4 arp notes in measure, each is 4 cells long
                    if (numNotesInChordMeasure === 0) noteDurationCells = CELLS_PER_MEASURE; // fallback
                    else noteDurationCells = CELLS_PER_MEASURE / numNotesInChordMeasure;
                    break;
                case "triplets": // Typically 3 notes per beat for 8th triplets, 6 per measure for quarter note chord
                                 // Or if it's one chord per measure, 12 8th triplets.
                                 // Let's assume arpNotes.length defines how many notes are in the measure.
                    if (numNotesInChordMeasure === 0) noteDurationCells = CELLS_PER_MEASURE;
                    else noteDurationCells = CELLS_PER_MEASURE / numNotesInChordMeasure;
                    // This needs to be more nuanced if true triplet feel is visualized.
                    // For now, just divide the measure.
                    break;
                case "eighths": // 2 notes per beat, 8 per measure
                default:
                    if (numNotesInChordMeasure === 0) noteDurationCells = CELLS_PER_MEASURE;
                    else noteDurationCells = CELLS_PER_MEASURE / numNotesInChordMeasure;
                    break;
            }
        } else { // Block chord
            noteDurationCells = CELLS_PER_MEASURE; // Block chord takes the whole measure
        }
        // Ensure duration is at least 1
        noteDurationCells = Math.max(1, Math.floor(noteDurationCells));


        notesToRender.forEach((noteName, noteInChordIndex) => {
            const midiValue = MusicTheory.noteNameToValue(noteName);

            if (midiValue < lowestMidiDisplay || midiValue > highestMidiDisplay) {
                // console.warn(`Note ${noteName} (MIDI: ${midiValue}) is outside display range.`);
                return; // Skip notes outside the keyboard's display range
            }

            const noteBlock = document.createElement('div');
            noteBlock.classList.add('note-block');
            noteBlock.textContent = noteName; // Optional: display note name on block

            // Calculate grid row (pitch)
            // Rows are 1-indexed from the top. Keyboard is C2(bottom) to B5(top).
            // So, highest MIDI note (B5) is row 1. Lowest MIDI note (C2) is row `totalPitchRows`.
            const gridRow = totalPitchRows - (midiValue - lowestMidiDisplay);

            // Calculate grid column (time)
            let gridColumnStart;
            if (isArpeggio) {
                gridColumnStart = (currentMeasure * CELLS_PER_MEASURE) + (noteInChordIndex * noteDurationCells) + 1;
            } else { // Block Chord
                gridColumnStart = (currentMeasure * CELLS_PER_MEASURE) + 1;
            }
            const gridColumnEnd = gridColumnStart + noteDurationCells;

            noteBlock.style.gridRow = `${gridRow} / span 1`;
            noteBlock.style.gridColumn = `${gridColumnStart} / ${gridColumnEnd}`;

            this.DOMElements.pianoRollDiv.appendChild(noteBlock);
        });
        currentMeasure++;
    });
    console.log("Piano roll rendered.");
};

UIController.clearPianoRoll = function() {
    if (this.DOMElements.pianoRollDiv) {
        this.DOMElements.pianoRollDiv.innerHTML = '<div class="playhead"></div>'; // Keep playhead
    }
};

UIController.updatePlayheadPosition = function(normalizedPosition) {
    if (!this.DOMElements.pianoRollDiv) return;
    const playhead = this.DOMElements.pianoRollDiv.querySelector('.playhead');
    if (playhead) {
        const rollWidth = this.DOMElements.pianoRollDiv.scrollWidth; // Use scrollWidth for total content width
        playhead.style.left = `${normalizedPosition * rollWidth}px`;

        // Optional: Auto-scroll piano roll
        const rollVisibleWidth = this.DOMElements.pianoRollDiv.clientWidth;
        const playheadPosition = normalizedPosition * rollWidth;

        // If playhead is past middle of visible area and there's more to scroll
        if (playheadPosition > (this.DOMElements.pianoRollDiv.scrollLeft + rollVisibleWidth / 2) &&
            this.DOMElements.pianoRollDiv.scrollLeft + rollVisibleWidth < rollWidth) {
            this.DOMElements.pianoRollDiv.scrollLeft = playheadPosition - rollVisibleWidth / 2;
        }
        // Reset scroll to beginning if playhead is near start (e.g. loop restart)
        else if (playheadPosition < rollVisibleWidth / 10 && this.DOMElements.pianoRollDiv.scrollLeft > 0 && normalizedPosition < 0.05) {
             // Add a small tolerance for normalizedPosition if it's slightly off 0 on loop
            this.DOMElements.pianoRollDiv.scrollLeft = 0;
        }
    }
};
