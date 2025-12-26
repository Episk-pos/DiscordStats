import path from 'path';
import { SignalType } from '../rallyround';

// Base path for sound assets
export const SOUNDS_DIR = path.resolve(__dirname, '../../../assets/sounds');

// Sound file definitions
export const SoundFiles = {
  // Signal sounds
  'hand-raise': 'chime.mp3',
  'point-of-order': 'gavel.mp3',
  'clarification': 'notification.mp3',
  'information': 'notification.mp3',
  'question': 'notification.mp3',

  // Session sounds
  'speaker-change': 'swoosh.mp3',
  'record-start': 'record-start.mp3',
  'record-stop': 'record-stop.mp3',

  // Agenda sounds
  'agenda-complete': 'ding.mp3',
  'time-warning': 'bell.mp3',

  // Utility sounds
  'chime': 'chime.mp3',
  'gavel': 'gavel.mp3',
  'swoosh': 'swoosh.mp3',
  'ding': 'ding.mp3',
  'bell': 'bell.mp3',
  'error': 'error.mp3',
  'notification': 'notification.mp3',
} as const;

export type SoundName = keyof typeof SoundFiles;

// Map signals to sounds
export const SignalSounds: Record<SignalType, SoundName | null> = {
  hand: 'hand-raise',
  point_of_order: 'point-of-order',
  clarification: 'clarification',
  information: 'information',
  question: 'question',
  agree: null, // Silent
  disagree: null, // Silent
  away: null, // Silent
  back: null, // Silent
};

/**
 * Get the file path for a sound
 */
export function getSoundPath(sound: SoundName): string {
  const filename = SoundFiles[sound];
  return path.join(SOUNDS_DIR, filename);
}

/**
 * Get the sound for a signal (or null if silent)
 */
export function getSignalSound(signal: SignalType): SoundName | null {
  return SignalSounds[signal];
}

/**
 * Check if a sound name is valid
 */
export function isValidSound(name: string): name is SoundName {
  return name in SoundFiles;
}
