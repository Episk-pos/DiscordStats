import {
  AudioPlayer,
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  NoSubscriberBehavior,
} from '@discordjs/voice';
import { getVoiceConnectionForGuild } from '../voice';
import { getSoundPath, SoundName, isValidSound } from './sounds';
import fs from 'fs';

// Store audio players per guild
const audioPlayers = new Map<string, AudioPlayer>();

// Store playback queues per guild
const playbackQueues = new Map<string, SoundName[]>();

// Store currently playing state
const isPlaying = new Map<string, boolean>();

/**
 * Get or create an audio player for a guild
 */
function getOrCreatePlayer(guildId: string): AudioPlayer {
  let player = audioPlayers.get(guildId);

  if (!player) {
    player = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Pause,
      },
    });

    // Set up player event handlers
    player.on(AudioPlayerStatus.Idle, () => {
      isPlaying.set(guildId, false);
      processQueue(guildId);
    });

    player.on('error', (error) => {
      console.error(`Audio player error for guild ${guildId}:`, error);
      isPlaying.set(guildId, false);
      processQueue(guildId);
    });

    audioPlayers.set(guildId, player);

    // Subscribe the voice connection to this player
    const connection = getVoiceConnectionForGuild(guildId);
    if (connection) {
      connection.subscribe(player);
    }
  }

  return player;
}

/**
 * Process the next sound in the queue
 */
function processQueue(guildId: string): void {
  const queue = playbackQueues.get(guildId);

  if (!queue || queue.length === 0) {
    return;
  }

  if (isPlaying.get(guildId)) {
    return;
  }

  const nextSound = queue.shift();
  if (nextSound) {
    playImmediately(guildId, nextSound);
  }
}

/**
 * Play a sound immediately (internal use)
 */
function playImmediately(guildId: string, sound: SoundName): void {
  const connection = getVoiceConnectionForGuild(guildId);

  if (!connection) {
    console.log(`No voice connection for guild ${guildId}, cannot play sound`);
    return;
  }

  const soundPath = getSoundPath(sound);

  // Check if file exists
  if (!fs.existsSync(soundPath)) {
    console.error(`Sound file not found: ${soundPath}`);
    return;
  }

  try {
    const player = getOrCreatePlayer(guildId);
    const resource = createAudioResource(soundPath);

    isPlaying.set(guildId, true);
    player.play(resource);

    // Ensure connection is subscribed
    connection.subscribe(player);

    console.log(`Playing sound: ${sound} for guild ${guildId}`);
  } catch (error) {
    console.error(`Failed to play sound ${sound}:`, error);
    isPlaying.set(guildId, false);
  }
}

/**
 * Queue a sound for playback
 */
export function queueSound(guildId: string, sound: SoundName): void {
  if (!isValidSound(sound)) {
    console.error(`Invalid sound name: ${sound}`);
    return;
  }

  let queue = playbackQueues.get(guildId);
  if (!queue) {
    queue = [];
    playbackQueues.set(guildId, queue);
  }

  queue.push(sound);
  processQueue(guildId);
}

/**
 * Play a sound (queued to prevent overlap)
 */
export function playSound(guildId: string, sound: SoundName): void {
  queueSound(guildId, sound);
}

/**
 * Play a sound for a signal
 */
export function playSignalSound(guildId: string, signal: string): void {
  const { getSignalSound } = require('./sounds');
  const sound = getSignalSound(signal);

  if (sound) {
    queueSound(guildId, sound);
  }
}

/**
 * Clear the playback queue for a guild
 */
export function clearQueue(guildId: string): void {
  playbackQueues.set(guildId, []);
}

/**
 * Stop playback and clean up for a guild
 */
export function stopPlayback(guildId: string): void {
  const player = audioPlayers.get(guildId);
  if (player) {
    player.stop();
    audioPlayers.delete(guildId);
  }
  playbackQueues.delete(guildId);
  isPlaying.delete(guildId);
}

/**
 * Check if bot is currently playing audio
 */
export function isCurrentlyPlaying(guildId: string): boolean {
  return isPlaying.get(guildId) || false;
}
