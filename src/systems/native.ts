// Things that only matter in the Android app (and a few that help the web version too).
import Phaser from 'phaser';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { KeepAwake } from '@capacitor-community/keep-awake';
import { stopSpeaking } from './speech';
import { pauseAudio } from './audio';

export const isApp = Capacitor.isNativePlatform();

export function setUpDevice(game: Phaser.Game): void {
  // Leaving the app (or switching tabs) pauses the voice and music.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopSpeaking();
      pauseAudio(true);
      game.events.emit('app-hidden');
    } else {
      pauseAudio(false);
      game.events.emit('app-visible');
    }
  });
  if (!isApp) return;

  // Children listen without touching the screen, so don't let it go dark.
  void KeepAwake.keepAwake().catch(() => undefined);

  // The phone's Back button: closes the game from the title screen, opens the
  // menu during the story, and otherwise goes back to the title screen.
  void App.addListener('backButton', () => {
    if (document.querySelector('.fm-overlay')) return; // a pop-up has its own buttons
    const scene = game.scene.getScenes(true)[0];
    if (!scene || scene.scene.key === 'Title') void App.exitApp();
    else if (scene.scene.key === 'Story') game.events.emit('app-back');
    else scene.scene.start('Title');
  });
}
