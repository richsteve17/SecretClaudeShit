import * as THREE from 'three';
import { ParticleSystem } from './ParticleSystem';

export class RunDustEffect {
  private particleSystem: ParticleSystem;
  private lastEmitTime: number = 0;
  private emitInterval: number = 0.15; // Emit every 150ms when sprinting

  constructor(particleSystem: ParticleSystem) {
    this.particleSystem = particleSystem;
  }

  public update(
    position: THREE.Vector3,
    velocity: THREE.Vector3,
    isSprinting: boolean,
    deltaTime: number
  ): void {
    if (!isSprinting) {
      return;
    }

    const speed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);

    // Only emit dust when actually moving
    if (speed < 5) {
      return;
    }

    this.lastEmitTime += deltaTime;

    if (this.lastEmitTime >= this.emitInterval) {
      this.lastEmitTime = 0;

      const dustCount = 2 + Math.floor(Math.random() * 2);

      // Dust color variations
      const colors = [
        new THREE.Color(0xB8A588), // Light tan
        new THREE.Color(0xA89968), // Dusty yellow
        new THREE.Color(0x9B8B6B), // Light brown
        new THREE.Color(0xC4B5A0)  // Pale dust
      ];

      for (let i = 0; i < dustCount; i++) {
        // Emit behind the player
        const behindOffset = new THREE.Vector3(
          -velocity.x * 0.08,
          0,
          -velocity.z * 0.08
        );

        const dustPosition = position.clone().add(behindOffset);
        dustPosition.y = 0.1; // Near ground level

        // Small random velocity
        const dustVelocity = new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          1 + Math.random() * 1.5,
          (Math.random() - 0.5) * 2
        );

        const color = colors[Math.floor(Math.random() * colors.length)];

        this.particleSystem.emit({
          position: dustPosition,
          positionRandomness: new THREE.Vector3(0.3, 0.05, 0.3),
          velocity: dustVelocity,
          velocityRandomness: new THREE.Vector3(0.5, 0.3, 0.5),
          gravity: new THREE.Vector3(0, -5, 0),
          lifetime: 0.4 + Math.random() * 0.3,
          startSize: 0.2 + Math.random() * 0.15,
          endSize: 0.4 + Math.random() * 0.2,
          startOpacity: 0.5 + Math.random() * 0.2,
          endOpacity: 0,
          color: color
        });
      }
    }
  }

  public reset(): void {
    this.lastEmitTime = 0;
  }
}
