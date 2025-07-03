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

    // --- Piano Roll Rendering ---
    // Constants for piano roll grid. These need to correspond to how playback is scheduled.
    // For now, let's assume 1 measure per chord, and 16th notes as the finest resolution.
    const BEATS_PER_MEASURE = 4;
    const SUBDIVISIONS_PER_BEAT = 4; // e.g., 4 for 16th notes
    const CELLS_PER_MEASURE = BEATS_PER_MEASURE * SUBDIVISIONS_PER_BEAT; // 16 cells for a 4/4 measure if finest is 16th

    function renderPianoRoll(progression, arpeggios, arpRhythm, numChords) {
        if (!DOMElements.pianoRollDiv || !MusicTheory) {
            console.error("Piano roll div or MusicTheory not found for rendering.");
            return;
        }
        clearPianoRoll(); // Use the function defined within this scope

        if (!progression || progression.length === 0) {
            console.log("No progression to render on piano roll.");
            return;
        }

        const lowestMidiDisplay = MusicTheory.noteNameToValue(LOWEST_NOTE); // e.g., C2
        const highestMidiDisplay = MusicTheory.noteNameToValue(HIGHEST_NOTE); // e.g., B5
        const totalPitchRows = highestMidiDisplay - lowestMidiDisplay + 1;

        const totalMeasures = numChords;
        const totalGridColumns = totalMeasures * CELLS_PER_MEASURE;

        DOMElements.pianoRollDiv.style.gridTemplateColumns = `repeat(${totalGridColumns}, 1fr)`;
        const keyHeight = 20;
        const requiredHeight = totalPitchRows * keyHeight;
        DOMElements.pianoRollDiv.style.height = `${requiredHeight}px`;
        DOMElements.pianoKeyboardDiv.style.height = `${requiredHeight}px`;

        let currentMeasure = 0;

        progression.forEach((chord, chordIndex) => {
            // AppState is defined in script.js. This might be an issue if script.js hasn't run yet
            // or if AppState is not globally available when this is called.
            // For now, assuming AppState is accessible.
            const notesToRender = (arpeggios && arpeggios[chordIndex] && typeof AppState !== 'undefined' && AppState.arpPattern !== 'none')
                                  ? arpeggios[chordIndex]
                                  : chord.notes;

            const isArpeggio = (arpeggios && arpeggios[chordIndex] && typeof AppState !== 'undefined' && AppState.arpPattern !== 'none');

            let noteDurationCells;
            let numNotesInChordMeasure = notesToRender.length;

            if (isArpeggio) {
                switch (arpRhythm) {
                    case "sixteenths":
                        noteDurationCells = (numNotesInChordMeasure === 0) ? CELLS_PER_MEASURE : CELLS_PER_MEASURE / numNotesInChordMeasure;
                        break;
                    case "triplets":
                        noteDurationCells = (numNotesInChordMeasure === 0) ? CELLS_PER_MEASURE : CELLS_PER_MEASURE / numNotesInChordMeasure;
                        break;
                    case "eighths":
                    default:
                        noteDurationCells = (numNotesInChordMeasure === 0) ? CELLS_PER_MEASURE : CELLS_PER_MEASURE / numNotesInChordMeasure;
                        break;
                }
            } else {
                noteDurationCells = CELLS_PER_MEASURE;
            }
            noteDurationCells = Math.max(1, Math.floor(noteDurationCells));

            notesToRender.forEach((noteName, noteInChordIndex) => {
                const midiValue = MusicTheory.noteNameToValue(noteName);
                if (midiValue < lowestMidiDisplay || midiValue > highestMidiDisplay) return;

                const noteBlock = document.createElement('div');
                noteBlock.classList.add('note-block');
                noteBlock.textContent = noteName;

                const gridRow = totalPitchRows - (midiValue - lowestMidiDisplay);
                let gridColumnStart;
                if (isArpeggio) {
                    gridColumnStart = (currentMeasure * CELLS_PER_MEASURE) + (noteInChordIndex * noteDurationCells) + 1;
                } else {
                    gridColumnStart = (currentMeasure * CELLS_PER_MEASURE) + 1;
                }
                const gridColumnEnd = gridColumnStart + noteDurationCells;

                noteBlock.style.gridRow = `${gridRow} / span 1`;
                noteBlock.style.gridColumn = `${gridColumnStart} / ${gridColumnEnd}`;
                DOMElements.pianoRollDiv.appendChild(noteBlock);
            });
            currentMeasure++;
        });
        console.log("Piano roll rendered.");
    }

    function clearPianoRoll() {
        if (DOMElements.pianoRollDiv) {
            DOMElements.pianoRollDiv.innerHTML = '<div class="playhead"></div>'; // Keep playhead
        }
    }

    function updatePlayheadPosition(normalizedPosition) {
        if (!DOMElements.pianoRollDiv) return;
        const playhead = DOMElements.pianoRollDiv.querySelector('.playhead');
        if (playhead) {
            const rollWidth = DOMElements.pianoRollDiv.scrollWidth;
            playhead.style.left = `${normalizedPosition * rollWidth}px`;

            const rollVisibleWidth = DOMElements.pianoRollDiv.clientWidth;
            const playheadPosition = normalizedPosition * rollWidth;

            if (playheadPosition > (DOMElements.pianoRollDiv.scrollLeft + rollVisibleWidth / 2) &&
                DOMElements.pianoRollDiv.scrollLeft + rollVisibleWidth < rollWidth) {
                DOMElements.pianoRollDiv.scrollLeft = playheadPosition - rollVisibleWidth / 2;
            } else if (playheadPosition < rollVisibleWidth / 10 && DOMElements.pianoRollDiv.scrollLeft > 0 && normalizedPosition < 0.05) {
                DOMElements.pianoRollDiv.scrollLeft = 0;
            }
        }
    }

    // Public API
    return {
        init,
        DOMElements,
        updateScaleKeyDisplay,
        updateChordDisplay,
        updateNumChordsDisplay,
        updateTempoDisplay,
        updateVolumeDisplay,
        createPianoKeyboard,
        renderPianoRoll,       // Now correctly refers to the function defined above
        updatePlayheadPosition, // Now correctly refers to the function defined above
        clearPianoRoll          // Now correctly refers to the function defined above
    };
})();

document.addEventListener('DOMContentLoaded', UIController.init);

// Helper function (can be in ui-controller.js or a separate utils.js if it grows)
// This mapToRange function seems unused, but kept for now.
function mapToRange(value, inMin, inMax, outMin, outMax) {
    // Basic linear mapping
    return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
}
// --- Piano Roll Rendering --- (This section, including constants, is now moved inside the IIFE)
// const BEATS_PER_MEASURE = 4;
// const SUBDIVISIONS_PER_BEAT = 4;
// const CELLS_PER_MEASURE = BEATS_PER_MEASURE * SUBDIVISIONS_PER_BEAT;

// Definitions of UIController.renderPianoRoll, UIController.clearPianoRoll,
// and UIController.updatePlayheadPosition are removed from here as they are now part of the IIFE.
