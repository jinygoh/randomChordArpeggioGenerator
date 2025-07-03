# Random Chord Progression & Arpeggio Generator

This web-based application allows musicians and producers to generate musically coherent ideas, including scales, chord progressions, and arpeggios. It features audio playback and MIDI/WAV export.

## How to Run

1.  **Clone the repository (or download the files):**
    ```bash
    # If you have git installed
    git clone <repository_url>
    cd <repository_directory>
    ```
    Alternatively, download the `index.html`, `style.css`, `script.js`, and `music-theory.js` files into the same directory.

2.  **Open `index.html` in your web browser:**
    *   Navigate to the directory where you saved the files.
    *   Double-click on `index.html` or right-click and choose "Open with" your preferred web browser (e.g., Chrome, Firefox, Safari, Edge).

3.  **Interact with the application:**
    *   Click the "Surprise Me!" button to generate a new musical idea. This will randomize the scale, key, tempo, chord progression, and arpeggio style.
    *   Use the controls in the left panel to customize:
        *   **1. Scale & Key**: Select the root key and scale type. Click "Randomize Scale" for a new random combination.
        *   **2. Chord Progression**: Adjust the number of chords, toggle 7th chords, and click "Generate Progression" to create a new sequence based on the selected scale/key.
        *   **3. Arpeggiation Style**: Choose a rhythmic value (Eighths, Sixteenths, Triplets) and an arpeggio pattern (Up, Down, etc., or None for block chords). Click "Generate Arpeggios" to apply the style to the current progression.
        *   **4. Export**: Export the current musical idea as a MIDI file or a WAV audio file.
    *   Use the playback controls at the top of the right panel:
        *   **Play/Stop**: Start or stop audio playback.
        *   **BPM Slider/Input**: Control the tempo in beats per minute.
        *   **Volume Slider**: Adjust the master volume.
    *   The visualizer shows a piano keyboard on the left and a piano roll on the right, displaying the notes being played. A playhead indicates the current playback position.

## Features

*   **"Surprise Me!" Button**: Instantly generates a complete musical idea (scale, key, tempo, 4-chord progression, arpeggios).
*   **Customizable Scale & Key**:
    *   Dropdowns for Key (C, C#, D, ... B).
    *   Dropdowns for Scale Type (Major, Natural Minor, Harmonic Minor, Melodic Minor, Modes, Pentatonics).
    *   "Randomize Scale" button.
*   **Intelligent Chord Progression Generation**:
    *   Slider for number of chords (2-8).
    *   "Generate Progression" button.
    *   "Use 7th Chords" toggle.
    *   Diatonic progressions with weighted probabilities for musically pleasing results.
    *   Displays Roman Numerals and Chord Names.
*   **Arpeggiation**:
    *   "Generate Arpeggios" button.
    *   Rhythm dropdown (Eighths, Sixteenths, Triplets).
    *   Pattern dropdown (Up, Down, Up-Down, Random, None for block chords).
*   **Audio Playback (Tone.js)**:
    *   Clean synthesized piano sound.
    *   Plays arpeggios if generated; otherwise, plays block chords.
    *   Seamless looping.
    *   Real-time tempo control (60-200 BPM).
    *   Master volume control.
*   **Interactive Visualization**:
    *   Vertical Piano Keyboard on the left (C2-B5 range) with note labels.
    *   Piano Roll on the right, dynamically displaying notes aligned with the keyboard.
    *   Playhead synchronized with audio playback.
    *   Auto-scrolling piano roll.
*   **File Export**:
    *   "Export MIDI" button: Generates a .mid file including tempo.
    *   "Export WAV" button: Generates a .wav audio file of one loop of the current playback.

## Project Structure

*   `index.html`: The main HTML file containing the structure of the web page.
*   `style.css`: The CSS file for styling the application.
*   `script.js`: The main JavaScript file for application logic and interactivity.
*   `music-theory.js`: JavaScript file dedicated to music theory calculations (scales, chords, etc.).
*   `README.md`: This file.

## Dependencies

*   **Tone.js**: Used for audio scheduling, synthesis, and transport control. Included via CDN.
*   **@tonejs/midi**: Used for MIDI export. Included via CDN.

No installation of these dependencies is required as they are loaded directly in the browser. Ensure you have an internet connection for them to load correctly when you first open the page.

## Development Notes (for AI Agent)

*   The application should be built using vanilla HTML, CSS, and JavaScript, without frameworks like React, Vue, or Angular.
*   UI should be dark, sleek, and intuitive.
*   CSS Flexbox and/or Grid should be used for layout.
*   Adherence to music theory principles is key for generating coherent musical ideas.
*   The visualization area requires a vertical piano keyboard aligned with a piano roll.
*   Export functionality for MIDI and WAV is required.

(This README will be updated as the project progresses.)
