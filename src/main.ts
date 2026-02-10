import { Game } from './Game';
import { AudioManager } from './AudioManager';

// Initialize audio controls and game settings
function initializeAudioControls(game: Game) {
  const audioManager = AudioManager.getInstance();
  const muteButton = document.getElementById('mute-button');
  const settingsButton = document.getElementById('settings-button');
  const audioSettings = document.getElementById('audio-settings');

  const masterVolumeSlider = document.getElementById('master-volume') as HTMLInputElement;
  const sfxVolumeSlider = document.getElementById('sfx-volume') as HTMLInputElement;
  const musicVolumeSlider = document.getElementById('music-volume') as HTMLInputElement;
  const difficultySelect = document.getElementById('ai-difficulty') as HTMLSelectElement;

  const masterValueDisplay = document.getElementById('master-value');
  const sfxValueDisplay = document.getElementById('sfx-value');
  const musicValueDisplay = document.getElementById('music-value');

  // Load saved settings and update UI
  if (masterVolumeSlider && sfxVolumeSlider && musicVolumeSlider) {
    masterVolumeSlider.value = String(audioManager.getVolume('master') * 100);
    sfxVolumeSlider.value = String(audioManager.getVolume('sfx') * 100);
    musicVolumeSlider.value = String(audioManager.getVolume('music') * 100);

    if (masterValueDisplay) masterValueDisplay.textContent = `${Math.round(audioManager.getVolume('master') * 100)}%`;
    if (sfxValueDisplay) sfxValueDisplay.textContent = `${Math.round(audioManager.getVolume('sfx') * 100)}%`;
    if (musicValueDisplay) musicValueDisplay.textContent = `${Math.round(audioManager.getVolume('music') * 100)}%`;
  }

  // Update mute button icon
  function updateMuteButtonIcon() {
    if (muteButton) {
      if (audioManager.isMutedState()) {
        muteButton.textContent = '🔇';
        muteButton.classList.add('muted');
      } else {
        muteButton.textContent = '🔊';
        muteButton.classList.remove('muted');
      }
    }
  }

  updateMuteButtonIcon();

  // Mute button click handler
  if (muteButton) {
    muteButton.addEventListener('click', () => {
      audioManager.toggleMute();
      updateMuteButtonIcon();
      audioManager.playSound('ui_click', 0.4);
    });
  }

  // Settings button click handler
  if (settingsButton && audioSettings) {
    settingsButton.addEventListener('click', () => {
      audioSettings.classList.toggle('visible');
      audioManager.playSound('ui_click', 0.4);
    });
  }

  // Volume sliders
  if (masterVolumeSlider && masterValueDisplay) {
    masterVolumeSlider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value) / 100;
      audioManager.setVolume('master', value);
      masterValueDisplay.textContent = `${Math.round(value * 100)}%`;
    });
  }

  if (sfxVolumeSlider && sfxValueDisplay) {
    sfxVolumeSlider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value) / 100;
      audioManager.setVolume('sfx', value);
      sfxValueDisplay.textContent = `${Math.round(value * 100)}%`;
    });
  }

  if (musicVolumeSlider && musicValueDisplay) {
    musicVolumeSlider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value) / 100;
      audioManager.setVolume('music', value);
      musicValueDisplay.textContent = `${Math.round(value * 100)}%`;
    });
  }

  // AI Difficulty selector
  if (difficultySelect) {
    difficultySelect.addEventListener('change', (e) => {
      const difficulty = (e.target as HTMLSelectElement).value as 'easy' | 'medium' | 'hard';
      game.setAIDifficulty(difficulty);
      audioManager.playSound('ui_click', 0.4);
    });
  }

  // Close settings when clicking outside
  document.addEventListener('click', (e) => {
    if (audioSettings && settingsButton) {
      const target = e.target as HTMLElement;
      if (!audioSettings.contains(target) && !settingsButton.contains(target)) {
        audioSettings.classList.remove('visible');
      }
    }
  });
}

// Start the game
const game = new Game();
game.start();

// Initialize audio controls after a short delay to ensure DOM is ready
setTimeout(() => {
  initializeAudioControls(game);
}, 100);
