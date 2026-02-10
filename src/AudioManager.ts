import * as THREE from 'three';

export type SoundType =
  | 'kick_soft'
  | 'kick_medium'
  | 'kick_hard'
  | 'bounce'
  | 'goal'
  | 'collision'
  | 'ui_click'
  | 'ui_switch';

interface SoundPool {
  sounds: AudioBufferSourceNode[];
  maxSize: number;
  currentIndex: number;
}

interface VolumeSettings {
  master: number;
  sfx: number;
  music: number;
}

export class AudioManager {
  private static instance: AudioManager;
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;

  private soundBuffers: Map<SoundType, AudioBuffer> = new Map();
  private soundPools: Map<SoundType, SoundPool> = new Map();

  private volumes: VolumeSettings = {
    master: 0.7,
    sfx: 0.8,
    music: 0.5
  };

  private isMuted: boolean = false;
  private isInitialized: boolean = false;
  private ambientSound: AudioBufferSourceNode | null = null;
  private camera: THREE.Camera | null = null;

  private constructor() {}

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Create audio context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      // Create gain nodes for volume control
      this.masterGain = this.audioContext.createGain();
      this.sfxGain = this.audioContext.createGain();
      this.musicGain = this.audioContext.createGain();

      // Connect gain nodes
      this.sfxGain.connect(this.masterGain);
      this.musicGain.connect(this.masterGain);
      this.masterGain.connect(this.audioContext.destination);

      // Set initial volumes
      this.updateVolumes();

      // Preload all sounds
      await this.preloadSounds();

      // Initialize sound pools for frequently used sounds
      this.initializeSoundPools();

      this.isInitialized = true;
      console.log('AudioManager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize AudioManager:', error);
    }
  }

  public async ensureAudioContext(): Promise<void> {
    if (!this.audioContext) {
      await this.initialize();
    }

    // Resume audio context if suspended (for mobile autoplay restrictions)
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
      console.log('Audio context resumed');
    }
  }

  private async preloadSounds(): Promise<void> {
    if (!this.audioContext) return;

    const soundTypes: SoundType[] = [
      'kick_soft', 'kick_medium', 'kick_hard',
      'bounce', 'goal', 'collision', 'ui_click', 'ui_switch'
    ];

    for (const soundType of soundTypes) {
      const buffer = await this.synthesizeSound(soundType);
      if (buffer) {
        this.soundBuffers.set(soundType, buffer);
      }
    }
  }

  private async synthesizeSound(soundType: SoundType): Promise<AudioBuffer | null> {
    if (!this.audioContext) return null;

    const ctx = this.audioContext;
    let buffer: AudioBuffer;

    switch (soundType) {
      case 'kick_soft':
        buffer = this.createKickSound(ctx, 0.3, 150, 0.05);
        break;
      case 'kick_medium':
        buffer = this.createKickSound(ctx, 0.5, 120, 0.08);
        break;
      case 'kick_hard':
        buffer = this.createKickSound(ctx, 0.7, 90, 0.12);
        break;
      case 'bounce':
        buffer = this.createBounceSound(ctx);
        break;
      case 'goal':
        buffer = this.createGoalSound(ctx);
        break;
      case 'collision':
        buffer = this.createCollisionSound(ctx);
        break;
      case 'ui_click':
        buffer = this.createUIClickSound(ctx);
        break;
      case 'ui_switch':
        buffer = this.createUISwitchSound(ctx);
        break;
      default:
        return null;
    }

    return buffer;
  }

  private createKickSound(ctx: AudioContext, intensity: number, frequency: number, duration: number): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * duration;
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 20);
      const noise = (Math.random() * 2 - 1) * 0.3;
      const sine = Math.sin(2 * Math.PI * frequency * t * (1 - t * 5));
      data[i] = (sine * 0.7 + noise * 0.3) * envelope * intensity;
    }

    return buffer;
  }

  private createBounceSound(ctx: AudioContext): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const duration = 0.1;
    const length = sampleRate * duration;
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 30);
      const frequency = 200 - t * 150;
      const sine = Math.sin(2 * Math.PI * frequency * t);
      const noise = (Math.random() * 2 - 1) * 0.2;
      data[i] = (sine * 0.6 + noise * 0.4) * envelope * 0.4;
    }

    return buffer;
  }

  private createGoalSound(ctx: AudioContext): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const duration = 1.5;
    const length = sampleRate * duration;
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    // Triumphant ascending tone sequence
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 2) * (1 - Math.exp(-t * 20));

      // Multi-tone celebration
      const freq1 = 523 + Math.sin(t * 4) * 50; // C5 with vibrato
      const freq2 = 659; // E5
      const freq3 = 784; // G5

      const tone1 = Math.sin(2 * Math.PI * freq1 * t);
      const tone2 = Math.sin(2 * Math.PI * freq2 * t) * Math.max(0, Math.sin(t * 3));
      const tone3 = Math.sin(2 * Math.PI * freq3 * t) * Math.max(0, Math.sin(t * 2 - 0.5));

      data[i] = (tone1 * 0.4 + tone2 * 0.3 + tone3 * 0.3) * envelope * 0.6;
    }

    return buffer;
  }

  private createCollisionSound(ctx: AudioContext): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const duration = 0.08;
    const length = sampleRate * duration;
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 40);
      const noise = (Math.random() * 2 - 1);
      data[i] = noise * envelope * 0.2;
    }

    return buffer;
  }

  private createUIClickSound(ctx: AudioContext): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const duration = 0.05;
    const length = sampleRate * duration;
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 50);
      const sine = Math.sin(2 * Math.PI * 800 * t);
      data[i] = sine * envelope * 0.3;
    }

    return buffer;
  }

  private createUISwitchSound(ctx: AudioContext): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const duration = 0.1;
    const length = sampleRate * duration;
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 20);
      const freq = 600 + t * 400;
      const sine = Math.sin(2 * Math.PI * freq * t);
      data[i] = sine * envelope * 0.35;
    }

    return buffer;
  }

  private initializeSoundPools(): void {
    const pooledSounds: SoundType[] = ['kick_soft', 'kick_medium', 'kick_hard', 'bounce', 'ui_click'];

    for (const soundType of pooledSounds) {
      this.soundPools.set(soundType, {
        sounds: [],
        maxSize: 5,
        currentIndex: 0
      });
    }
  }

  public playSound(soundType: SoundType, volume: number = 1.0, position?: THREE.Vector3): void {
    if (!this.isInitialized || !this.audioContext || this.isMuted) return;

    const buffer = this.soundBuffers.get(soundType);
    if (!buffer) return;

    try {
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;

      let gainNode = this.audioContext.createGain();
      gainNode.gain.value = volume;

      // Handle 3D positional audio if position and camera are provided
      if (position && this.camera) {
        const distance = this.camera.position.distanceTo(position);
        const maxDistance = 100;
        const attenuation = Math.max(0, 1 - (distance / maxDistance));
        gainNode.gain.value *= attenuation;
      }

      source.connect(gainNode);
      gainNode.connect(this.sfxGain!);
      source.start(0);

      // Clean up after sound finishes
      source.onended = () => {
        source.disconnect();
        gainNode.disconnect();
      };
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  }

  public playKickSound(power: number, position?: THREE.Vector3): void {
    let soundType: SoundType;

    if (power < 15) {
      soundType = 'kick_soft';
    } else if (power < 25) {
      soundType = 'kick_medium';
    } else {
      soundType = 'kick_hard';
    }

    this.playSound(soundType, 0.8, position);
  }

  public async startAmbientSound(): Promise<void> {
    if (!this.isInitialized || !this.audioContext || this.ambientSound) return;

    try {
      const buffer = await this.createAmbientCrowdSound(this.audioContext);

      this.ambientSound = this.audioContext.createBufferSource();
      this.ambientSound.buffer = buffer;
      this.ambientSound.loop = true;

      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = 0.3;

      this.ambientSound.connect(gainNode);
      gainNode.connect(this.musicGain!);
      this.ambientSound.start(0);
    } catch (error) {
      console.error('Error starting ambient sound:', error);
    }
  }

  private async createAmbientCrowdSound(ctx: AudioContext): Promise<AudioBuffer> {
    const sampleRate = ctx.sampleRate;
    const duration = 4; // 4 seconds loop
    const length = sampleRate * duration;
    const buffer = ctx.createBuffer(2, length, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);

      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;

        // Multiple layers of noise for crowd murmur
        let noise = 0;
        for (let f = 0; f < 5; f++) {
          const freq = 100 + f * 50;
          const amplitude = 0.1 / (f + 1);
          noise += Math.sin(2 * Math.PI * freq * t + Math.random() * Math.PI) * amplitude;
        }

        // Add random variations
        noise += (Math.random() * 2 - 1) * 0.05;

        // Subtle envelope for variation
        const envelope = 0.8 + 0.2 * Math.sin(2 * Math.PI * t / duration);

        data[i] = noise * envelope;
      }
    }

    return buffer;
  }

  public stopAmbientSound(): void {
    if (this.ambientSound) {
      try {
        this.ambientSound.stop();
        this.ambientSound.disconnect();
      } catch (error) {
        // Ignore errors if already stopped
      }
      this.ambientSound = null;
    }
  }

  public setCamera(camera: THREE.Camera): void {
    this.camera = camera;
  }

  public setVolume(type: 'master' | 'sfx' | 'music', volume: number): void {
    this.volumes[type] = Math.max(0, Math.min(1, volume));
    this.updateVolumes();
    this.saveSettings();
  }

  public getVolume(type: 'master' | 'sfx' | 'music'): number {
    return this.volumes[type];
  }

  private updateVolumes(): void {
    if (!this.masterGain || !this.sfxGain || !this.musicGain) return;

    this.masterGain.gain.value = this.isMuted ? 0 : this.volumes.master;
    this.sfxGain.gain.value = this.volumes.sfx;
    this.musicGain.gain.value = this.volumes.music;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    this.updateVolumes();
    this.saveSettings();
    return this.isMuted;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    this.updateVolumes();
    this.saveSettings();
  }

  public isMutedState(): boolean {
    return this.isMuted;
  }

  private saveSettings(): void {
    try {
      localStorage.setItem('audioSettings', JSON.stringify({
        volumes: this.volumes,
        isMuted: this.isMuted
      }));
    } catch (error) {
      // Ignore localStorage errors
    }
  }

  public loadSettings(): void {
    try {
      const saved = localStorage.getItem('audioSettings');
      if (saved) {
        const settings = JSON.parse(saved);
        if (settings.volumes) {
          this.volumes = settings.volumes;
        }
        if (typeof settings.isMuted === 'boolean') {
          this.isMuted = settings.isMuted;
        }
        this.updateVolumes();
      }
    } catch (error) {
      // Ignore localStorage errors
    }
  }

  public cleanup(): void {
    this.stopAmbientSound();

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.soundBuffers.clear();
    this.soundPools.clear();
    this.isInitialized = false;
  }
}
