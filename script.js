console.log("script.js loaded successfully.");

// Ensure Tone.js and other libraries are loaded
if (typeof Tone === 'undefined') {
    console.error("Tone.js failed to load. Check the CDN link in index.html.");
}
if (typeof Midi === 'undefined') {
    console.error("@tonejs/midi failed to load. Check the CDN link in index.html.");
}
if (typeof MusicTheory === 'undefined') {
    console.error("MusicTheory module failed to load. Check music-theory.js.");
}
if (typeof UIController === 'undefined') {
    console.error("UIController module failed to load. Check ui-controller.js.");
}

// Application State (a simple example, can be expanded)
const AppState = {
    currentKey: "C",
    currentScale: "MAJOR",
    currentProgression: [],
    currentArpeggios: null, // Will store arpeggiated notes for each chord
    currentTempo: 120,
    use7thChords: false,
    numChords: 4,
    arpPattern: "none",
    arpRhythm: "eighths"
};

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References from UIController ---
    const DOM = UIController.DOMElements;

    // --- Event Listeners ---

    // Section 1: Scale & Key
    DOM.keySelect?.addEventListener('change', (e) => {
        AppState.currentKey = e.target.value;
        console.log("Key changed to:", AppState.currentKey);
        // Optionally, regenerate progression or update something else
    });

    DOM.scaleTypeSelect?.addEventListener('change', (e) => {
        AppState.currentScale = e.target.value;
        console.log("Scale type changed to:", AppState.currentScale);
        // Optionally, regenerate progression
        regenerateProgressionAndUpdateDisplay();
    });

    const randomizeScaleBtn = document.getElementById('randomizeScaleBtn');
    randomizeScaleBtn?.addEventListener('click', () => {
        AppState.currentKey = MusicTheory.getRandomKey();
        AppState.currentScale = MusicTheory.getRandomScaleKey();
        UIController.updateScaleKeyDisplay(AppState.currentKey, AppState.currentScale);
        console.log("Randomized Scale/Key:", AppState.currentKey, AppState.currentScale);
        regenerateProgressionAndUpdateDisplay(); // Also update progression
    });

    // Section 2: Chord Progression
    DOM.numChordsSlider?.addEventListener('input', (e) => {
        AppState.numChords = parseInt(e.target.value);
        UIController.updateNumChordsDisplay(AppState.numChords);
    });
    DOM.numChordsSlider?.addEventListener('change', () => { // After user releases slider
        regenerateProgressionAndUpdateDisplay();
    });


    DOM.use7thChordsToggle?.addEventListener('change', (e) => {
        AppState.use7thChords = e.target.checked;
        console.log("Use 7th Chords:", AppState.use7thChords);
        regenerateProgressionAndUpdateDisplay();
    });

    const generateProgressionBtn = document.getElementById('generateProgressionBtn');
    generateProgressionBtn?.addEventListener('click', () => {
        regenerateProgressionAndUpdateDisplay();
    });

    // Section 3: Arpeggiation (Listeners will be added later when functionality is built)
    const arpeggioRhythmSelect = document.getElementById('arpeggioRhythmSelect');
    arpeggioRhythmSelect?.addEventListener('change', (e) => {
        AppState.arpRhythm = e.target.value;
        console.log("Arp rhythm: ", AppState.arpRhythm);
        // TODO: Regenerate arpeggios if/when they exist
        // if (AppState.arpPattern !== 'none') generateAndStoreArpeggiosAndUpdateVisuals();
    });

    const arpeggioPatternSelect = document.getElementById('arpeggioPatternSelect');
    arpeggioPatternSelect?.addEventListener('change', (e) => {
        AppState.arpPattern = e.target.value;
        console.log("Arp pattern: ", AppState.arpPattern);
         // TODO: Regenerate arpeggios if/when they exist, or apply to current progression
        // if (AppState.arpPattern !== 'none') generateAndStoreArpeggiosAndUpdateVisuals();
        // else clearArpeggiosAndUpdateVisuals(); // If "None" is selected
    });

    const generateArpeggiosBtn = document.getElementById('generateArpeggiosBtn');
    generateArpeggiosBtn?.addEventListener('click', () => {
        console.log("Generate Arpeggios button clicked.");
        if (AppState.currentProgression.length > 0 && AppState.arpPattern !== "none") {
            generateAndStoreArpeggios(); // This updates AppState.currentArpeggios
            schedulePlayback();
            UIController.renderPianoRoll(AppState.currentProgression, AppState.currentArpeggios, AppState.arpRhythm, AppState.numChords);
            console.log("Arpeggios generated and visuals updated.");
        } else if (AppState.arpPattern === "none") {
            AppState.currentArpeggios = null;
            schedulePlayback();
            UIController.renderPianoRoll(AppState.currentProgression, null, AppState.arpRhythm, AppState.numChords); // Render with no arpeggios
            console.log("Arpeggio pattern set to None. Visuals updated for block chords.");
        }
    });

    // Playback Controls
    const playStopBtn = document.getElementById('playStopBtn');
    playStopBtn?.addEventListener('click', async () => {
        if (typeof Tone === 'undefined') return;
        await Tone.start(); // Start audio context if not already started
        if (Tone.Transport.state === "started") {
            Tone.Transport.stop();
            playStopBtn.textContent = "Play";
        } else {
            Tone.Transport.start();
            playStopBtn.textContent = "Stop";
        }
    });

    DOM.bpmSlider?.addEventListener('input', (e) => {
        AppState.currentTempo = parseInt(e.target.value);
        UIController.updateTempoDisplay(AppState.currentTempo);
        if (typeof Tone !== 'undefined') Tone.Transport.bpm.value = AppState.currentTempo;
    });
    DOM.bpmInput?.addEventListener('change', (e) => { // Use change for text input to avoid issues on every keystroke
        let newTempo = parseInt(e.target.value);
        if (isNaN(newTempo)) newTempo = 60;
        if (newTempo < 60) newTempo = 60;
        if (newTempo > 200) newTempo = 200;
        AppState.currentTempo = newTempo;
        UIController.updateTempoDisplay(AppState.currentTempo);
        if (typeof Tone !== 'undefined') Tone.Transport.bpm.value = AppState.currentTempo;
    });

    DOM.volumeSlider?.addEventListener('input', (e) => {
        const volumeDB = parseFloat(e.target.value);
        UIController.updateVolumeDisplay(volumeDB);
        if (typeof Tone !== 'undefined') Tone.Destination.volume.value = volumeDB;
    });


    // --- Audio Engine Setup ---
    let synth; // Synth will be initialized in initializeApp
    let currentPlaybackSequence; // To store the Tone.Sequence or Tone.Part

    function initializeAudioEngine() {
        if (typeof Tone === 'undefined') return;
        synth = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: "triangle8" }, // A slightly softer, cleaner sound than default sine
            envelope: {
                attack: 0.02,
                decay: 0.1,
                sustain: 0.3,
                release: 0.5 // Slightly longer release for piano-like feel
            },
            volume: -6 // Initial volume set on synth, Tone.Destination also used
        }).toDestination();

        Tone.Destination.volume.value = AppState.volumeDB || -6; // Default if not set
        UIController.updateVolumeDisplay(Tone.Destination.volume.value);

        Tone.Transport.bpm.value = AppState.currentTempo;
        Tone.Transport.loop = true;
        // Loop duration will be set by schedulePlayback based on progression length
    }

    function schedulePlayback() {
        if (typeof Tone === 'undefined' || !synth) return;
        if (AppState.currentProgression.length === 0) {
            console.log("No progression to schedule.");
            if(currentPlaybackSequence) currentPlaybackSequence.dispose();
            Tone.Transport.cancel(); // Clear any previous events
            return;
        }

        if (currentPlaybackSequence) {
            currentPlaybackSequence.dispose(); // Dispose previous sequence
            Tone.Transport.cancel(); // Clear any previous events
        }

        const events = [];
        let totalDuration = 0;
        const chordDuration = "1n"; // Each chord lasts for one measure (whole note) by default

        if (AppState.currentArpeggios && AppState.arpPattern !== 'none') {
            // Play Arpeggios
            console.log("Scheduling arpeggios");
            AppState.currentArpeggios.forEach((arpNotes, chordIndex) => {
                const startTime = chordIndex * Tone.Time(chordDuration).toSeconds();
                let noteInterval;

                switch(AppState.arpRhythm) {
                    case "sixteenths": noteInterval = Tone.Time(chordDuration).toSeconds() / (arpNotes.length || 4); break; // Divide measure by number of arp notes or default
                    case "triplets": noteInterval = Tone.Time(chordDuration).toSeconds() / (arpNotes.length || 3); break; // 8th note triplets in a measure
                    case "eighths":
                    default: noteInterval = Tone.Time(chordDuration).toSeconds() / (arpNotes.length || 2); break;
                }
                 // Ensure noteInterval is not too small or zero if arpNotes is empty
                if (noteInterval <= 0) noteInterval = Tone.Time("8n").toSeconds();


                arpNotes.forEach((note, noteIndex) => {
                    events.push({
                        time: startTime + noteIndex * noteInterval,
                        note: note,
                        duration: Tone.Time(noteInterval * 0.9).toNotation() // Slightly shorter to avoid overlap
                    });
                });
                totalDuration = (chordIndex + 1) * Tone.Time(chordDuration).toSeconds();
            });
        } else {
            // Play Block Chords
            console.log("Scheduling block chords");
            AppState.currentProgression.forEach((chord, index) => {
                events.push({
                    time: index * Tone.Time(chordDuration).toSeconds(),
                    notes: chord.notes, // PolySynth can take an array for chords
                    duration: Tone.Time(chordDuration).toNotation()
                });
                totalDuration = (index + 1) * Tone.Time(chordDuration).toSeconds();
            });
        }

        currentPlaybackSequence = new Tone.Part((time, value) => {
            if (value.notes) { // Block chord
                synth.triggerAttackRelease(value.notes, value.duration, time);
            } else { // Arpeggio note
                synth.triggerAttackRelease(value.note, value.duration, time);
            }
        }, events).start(0);

        Tone.Transport.loopEnd = totalDuration;
        console.log("Playback scheduled. Loop end:", totalDuration);
    }


    // --- Core Logic Functions ---
    function regenerateProgressionAndUpdateDisplay() {
        try {
            AppState.currentProgression = MusicTheory.generateDiatonicProgression(
                AppState.currentKey,
                AppState.currentScale,
                AppState.numChords,
                AppState.use7thChords
            );
            UIController.updateChordDisplay(AppState.currentProgression);
            console.log("New Progression:", AppState.currentProgression);

            // If arpeggios are active, regenerate them for the new progression
            if (AppState.arpPattern !== "none") {
                generateAndStoreArpeggios();
            } else {
                AppState.currentArpeggios = null; // Ensure arpeggios are cleared if pattern is "none"
            }
            schedulePlayback(); // Reschedule with new progression (and possibly new arpeggios)
            // TODO: Update visualizer
        } catch (error) {
            console.error("Error generating progression:", error);
            UIController.updateChordDisplay([]); // Clear display on error
            if(currentPlaybackSequence) currentPlaybackSequence.dispose(); // Stop playback on error
            Tone.Transport.cancel();
        }
    }

    function generateAndStoreArpeggios() {
        if (!AppState.currentProgression || AppState.currentProgression.length === 0 || AppState.arpPattern === "none") {
            AppState.currentArpeggios = null;
            return;
        }
        try {
            AppState.currentArpeggios = AppState.currentProgression.map(chord => {
                // Ensure chord.notes exists and is an array.
                // The notes from MusicTheory.getChordNotes are like "C4", "E4", "G4"
                if (!chord.notes || !Array.isArray(chord.notes)) {
                    console.warn("Chord has no notes for arpeggiation:", chord);
                    return [];
                }
                return MusicTheory.generateArpeggio(chord.notes, AppState.arpPattern.toUpperCase());
            });
            console.log("Generated Arpeggios:", AppState.currentArpeggios);
        } catch (error) {
            console.error("Error generating arpeggios:", error);
            AppState.currentArpeggios = null;
        }
    }


    // --- Initialization ---
    function initializeApp() {
        initializeAudioEngine(); // Initialize synth and Tone.Transport settings

        // Set initial UI state from AppState
        UIController.updateScaleKeyDisplay(AppState.currentKey, AppState.currentScale);
        UIController.updateNumChordsDisplay(AppState.numChords);
        if(DOM.numChordsSlider) DOM.numChordsSlider.value = AppState.numChords;
        if(DOM.use7thChordsToggle) DOM.use7thChordsToggle.checked = AppState.use7thChords;
        if(DOM.bpmSlider) DOM.bpmSlider.value = AppState.currentTempo;
        if(DOM.bpmInput) DOM.bpmInput.value = AppState.currentTempo;
        // Initial volume is set in initializeAudioEngine from AppState or default

        // Generate initial progression and schedule it
        regenerateProgressionAndUpdateDisplay(); // This now also calls schedulePlayback

        console.log("Application Initialized with Audio Engine.");

        const surpriseMeBtn = document.getElementById('surpriseMeBtn');
        surpriseMeBtn?.addEventListener('click', surpriseMe);
    }

    // --- "Surprise Me!" Function ---
    async function surpriseMe() {
        if (typeof Tone !== 'undefined') await Tone.start(); // Ensure audio context is running

        // 1. Randomize Scale & Key
        AppState.currentKey = MusicTheory.getRandomKey();
        AppState.currentScale = MusicTheory.getRandomScaleKey();
        UIController.updateScaleKeyDisplay(AppState.currentKey, AppState.currentScale);
        console.log("Surprise Me - Key/Scale:", AppState.currentKey, AppState.currentScale);

        // 2. Randomize Tempo (e.g., 70-140 BPM)
        AppState.currentTempo = Math.floor(Math.random() * (140 - 70 + 1)) + 70;
        UIController.updateTempoDisplay(AppState.currentTempo);
        if (typeof Tone !== 'undefined') Tone.Transport.bpm.value = AppState.currentTempo;
        console.log("Surprise Me - Tempo:", AppState.currentTempo);

        // 3. Randomize Chord Progression Parameters
        AppState.numChords = Math.floor(Math.random() * (8 - 2 + 1)) + 2; // 2 to 8 chords
        AppState.use7thChords = Math.random() < 0.5; // 50% chance of using 7th chords
        UIController.updateNumChordsDisplay(AppState.numChords);
        if(DOM.numChordsSlider) DOM.numChordsSlider.value = AppState.numChords;
        if(DOM.use7thChordsToggle) DOM.use7thChordsToggle.checked = AppState.use7thChords;
        console.log("Surprise Me - Num Chords:", AppState.numChords, "Use 7ths:", AppState.use7thChords);

        // Regenerate progression (this also calls generateAndStoreArpeggios if needed, and schedulePlayback)
        // regenerateProgressionAndUpdateDisplay();
        // No, call directly, then arp, then schedule

        try {
            AppState.currentProgression = MusicTheory.generateDiatonicProgression(
                AppState.currentKey,
                AppState.currentScale,
                AppState.numChords,
                AppState.use7thChords
            );
            UIController.updateChordDisplay(AppState.currentProgression);
            console.log("Surprise Me - New Progression:", AppState.currentProgression);

            // 4. Randomize Arpeggio Pattern & Rhythm
            const arpPatterns = Object.keys(MusicTheory.ARPEGGIO_PATTERNS); // ["UP", "DOWN", ...]
            const arpPatternKeysForSelect = ["none", ...arpPatterns.map(p => p.toLowerCase())];
            AppState.arpPattern = arpPatternKeysForSelect[Math.floor(Math.random() * arpPatternKeysForSelect.length)];

            const arpRhythms = ["eighths", "sixteenths", "triplets"];
            AppState.arpRhythm = arpRhythms[Math.floor(Math.random() * arpRhythms.length)];

            // Update Arpeggio UI
            const arpeggioPatternSelect = document.getElementById('arpeggioPatternSelect');
            const arpeggioRhythmSelect = document.getElementById('arpeggioRhythmSelect');
            if(arpeggioPatternSelect) arpeggioPatternSelect.value = AppState.arpPattern;
            if(arpeggioRhythmSelect) arpeggioRhythmSelect.value = AppState.arpRhythm;
            console.log("Surprise Me - Arp Pattern:", AppState.arpPattern, "Arp Rhythm:", AppState.arpRhythm);

            if (AppState.arpPattern !== "none") {
                generateAndStoreArpeggios();
            } else {
                AppState.currentArpeggios = null;
            }

            // 5. Reschedule Playback & Update Visuals
            schedulePlayback();
            UIController.renderPianoRoll(AppState.currentProgression, AppState.currentArpeggios, AppState.arpRhythm, AppState.numChords);


            console.log("Surprise Me! complete.");

        } catch (error) {
            console.error("Error during Surprise Me! generation:", error);
            UIController.updateChordDisplay([]);
            UIController.clearPianoRoll();
            if(currentPlaybackSequence) currentPlaybackSequence.dispose();
            Tone.Transport.cancel();
        }
    }

    // --- Playhead Animation ---
    function animatePlayhead() {
        if (typeof Tone !== 'undefined' && Tone.Transport.state === "started") {
            UIController.updatePlayheadPosition(Tone.Transport.progress);
        }
        requestAnimationFrame(animatePlayhead);
    }


    initializeApp();
    requestAnimationFrame(animatePlayhead); // Start playhead animation loop

    // --- Export Functionality ---
    const exportMidiBtn = document.getElementById('exportMidiBtn');
    exportMidiBtn?.addEventListener('click', () => {
        if (typeof Midi === 'undefined') {
            console.error("@tonejs/midi library is not loaded.");
            alert("Error: MIDI export library not loaded.");
            return;
        }
        if (AppState.currentProgression.length === 0) {
            alert("Please generate a progression first.");
            return;
        }

        try {
            const midi = new Midi.Midi();
            const track = midi.addTrack();

            // Set tempo
            midi.header.setTempo(AppState.currentTempo);
            console.log("MIDI Tempo set to:", AppState.currentTempo);

            const chordDurationSec = Tone.Time("1n").toSeconds(); // Duration of one chord/measure in seconds

            if (AppState.currentArpeggios && AppState.arpPattern !== 'none') {
                // Export Arpeggios
                AppState.currentArpeggios.forEach((arpNotes, chordIndex) => {
                    const chordStartTimeSec = chordIndex * chordDurationSec;
                    let noteIntervalSec;

                    switch(AppState.arpRhythm) {
                        case "sixteenths": noteIntervalSec = chordDurationSec / (arpNotes.length || 4); break;
                        case "triplets": noteIntervalSec = chordDurationSec / (arpNotes.length || 3); break;
                        case "eighths":
                        default: noteIntervalSec = chordDurationSec / (arpNotes.length || 2); break;
                    }
                    if (noteIntervalSec <= 0) noteIntervalSec = Tone.Time("8n").toSeconds();

                    arpNotes.forEach((noteName, noteIndex) => {
                        track.addNote({
                            name: noteName,
                            time: chordStartTimeSec + noteIndex * noteIntervalSec,
                            duration: noteIntervalSec * 0.9, // Slightly shorter for clarity in MIDI
                            velocity: 0.8 // Default velocity
                        });
                    });
                });
            } else {
                // Export Block Chords
                AppState.currentProgression.forEach((chord, chordIndex) => {
                    const chordStartTimeSec = chordIndex * chordDurationSec;
                    chord.notes.forEach(noteName => {
                        track.addNote({
                            name: noteName,
                            time: chordStartTimeSec,
                            duration: chordDurationSec,
                            velocity: 0.8
                        });
                    });
                });
            }

            const midiFileName = `chord-progression-${AppState.currentKey.replace("#","sharp")}-${AppState.currentScale.toLowerCase()}.mid`;
            // Trigger download
            const blob = new Blob([midi.toArray()], { type: "audio/midi" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = midiFileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            console.log("MIDI file generated and download triggered:", midiFileName);

        } catch (error) {
            console.error("Error exporting MIDI:", error);
            alert("An error occurred while exporting MIDI.");
        }
    });

    const exportWavBtn = document.getElementById('exportWavBtn');
    exportWavBtn?.addEventListener('click', async () => {
        if (typeof Tone === 'undefined' || typeof Tone.Offline !== 'function') {
            console.error("Tone.js or Tone.Offline is not available.");
            alert("Error: Audio export library not available.");
            return;
        }
        if (AppState.currentProgression.length === 0) {
            alert("Please generate a progression first.");
            return;
        }

        // Indicate rendering started (optional, could update a status message)
        exportWavBtn.textContent = "Rendering...";
        exportWavBtn.disabled = true;

        try {
            const loopDurationSecs = Tone.Transport.loopEnd;
            if (loopDurationSecs <= 0) {
                alert("Cannot export empty or zero-duration audio.");
                return;
            }

            console.log(`Starting WAV export. Duration: ${loopDurationSecs}s, Tempo: ${AppState.currentTempo} BPM`);

            const buffer = await Tone.Offline(async (offlineTransport) => {
                // Create a synth for the offline context
                const offlineSynth = new Tone.PolySynth(Tone.Synth, {
                    oscillator: { type: "triangle8" },
                    envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 0.5 },
                    volume: -6 // Match the main synth's initial volume setting
                }).toDestination(); // Connect to offline context's destination

                // Configure offlineTransport
                offlineTransport.bpm.value = AppState.currentTempo;
                // No need to set loop for offline rendering of a specific duration

                // --- Re-schedule notes for offline rendering ---
                const events = [];
                const chordDuration = "1n"; // Each chord lasts for one measure

                if (AppState.currentArpeggios && AppState.arpPattern !== 'none') {
                    AppState.currentArpeggios.forEach((arpNotes, chordIndex) => {
                        const startTime = chordIndex * Tone.Time(chordDuration).toSeconds();
                        let noteInterval;
                        switch(AppState.arpRhythm) {
                            case "sixteenths": noteInterval = Tone.Time(chordDuration).toSeconds() / (arpNotes.length || 4); break;
                            case "triplets": noteInterval = Tone.Time(chordDuration).toSeconds() / (arpNotes.length || 3); break;
                            case "eighths": default: noteInterval = Tone.Time(chordDuration).toSeconds() / (arpNotes.length || 2); break;
                        }
                        if (noteInterval <= 0) noteInterval = Tone.Time("8n").toSeconds();
                        arpNotes.forEach((note, noteIndex) => {
                            events.push({ time: startTime + noteIndex * noteInterval, note: note, duration: Tone.Time(noteInterval * 0.9).toNotation() });
                        });
                    });
                } else {
                    AppState.currentProgression.forEach((chord, index) => {
                        events.push({ time: index * Tone.Time(chordDuration).toSeconds(), notes: chord.notes, duration: Tone.Time(chordDuration).toNotation() });
                    });
                }

                new Tone.Part((time, value) => {
                    if (value.notes) offlineSynth.triggerAttackRelease(value.notes, value.duration, time);
                    else offlineSynth.triggerAttackRelease(value.note, value.duration, time);
                }, events).start(0);
                // --- End of re-scheduling ---

                offlineTransport.start();
            }, loopDurationSecs); // Render for the calculated loop duration

            const wavData = audioBufferToWav(buffer);
            const blob = new Blob([wavData], { type: "audio/wav" });
            const wavFileName = `chord-progression-${AppState.currentKey.replace("#","sharp")}-${AppState.currentScale.toLowerCase()}.wav`;
            const url = URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.href = url;
            a.download = wavFileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            console.log("WAV file generated and download triggered:", wavFileName);

        } catch (error) {
            console.error("Error exporting WAV:", error);
            alert("An error occurred while exporting WAV.");
        } finally {
            exportWavBtn.textContent = "Export WAV";
            exportWavBtn.disabled = false;
        }
    });

});


// Helper function to convert AudioBuffer to WAV
// Source: https://russellgood.com/how-to-convert-audiobuffer-to-audio-file/
// (Adapted slightly)
function audioBufferToWav(buffer) {
    let numOfChan = buffer.numberOfChannels,
        btwLength = buffer.length * numOfChan * 2 + 44,
        btwArrBuff = new ArrayBuffer(btwLength),
        btwView = new DataView(btwArrBuff),
        btwChnls = [],
        btwIndex,
        btwSample,
        btwOffset = 0,
        btwPos = 0;
    setUint32(0x46464952); // "RIFF"
    setUint32(btwLength - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"
    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16); // length = 16
    setUint16(1); // PCM (uncompressed)
    setUint16(numOfChan);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
    setUint16(numOfChan * 2); // block-align
    setUint16(16); // 16-bit
    setUint32(0x61746164); // "data" - chunk
    setUint32(buffer.length * numOfChan * 2); // chunk length

    for (btwIndex = 0; btwIndex < buffer.numberOfChannels; btwIndex++)
        btwChnls.push(buffer.getChannelData(btwIndex));

    while (btwPos < buffer.length) {
        for (btwIndex = 0; btwIndex < numOfChan; btwIndex++) {
            // loop through channels
            btwSample = Math.max(-1, Math.min(1, btwChnls[btwIndex][btwPos])); // clamp
            btwSample = (0.5 + btwSample < 0 ? btwSample * 32768 : btwSample * 32767) | 0; // scale to 16-bit signed int
            btwView.setInt16(btwOffset, btwSample, true); // write 16-bit sample
            btwOffset += 2;
        }
        btwPos++; // next frame
    }

    return btwArrBuff;

    function setUint16(data) {
        btwView.setUint16(btwPos, data, true);
        btwPos += 2;
    }

    function setUint32(data) {
        btwView.setUint32(btwPos, data, true);
        btwPos += 4;
    }
}
