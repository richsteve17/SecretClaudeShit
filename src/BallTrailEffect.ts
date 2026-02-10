import * as THREE from 'three';
import { ParticleSystem } from './ParticleSystem';

export class BallTrailEffect {
  private particleSystem: ParticleSystem;
  private lastEmitTime: number = 0;
  private emitInterval: number = 0.05; // Emit every 50ms

  constructor(particleSystem: ParticleSystem) {
    this.particleSystem = particleSystem;
  }

  public update(
    position: THREE.Vector3,
    velocity: THREE.Vector3,
    deltaTime: number
  ): void {
    const speed = Math.sqrt(
      velocity.x * velocity.x +
      velocity.y * velocity.y +
      velocity.z * velocity.z
    );

    // Only show trail when ball is moving fast (above threshold)
    const speedThreshold = 15;
    if (speed < speedThreshold) {
      return;
    }

    this.lastEmitTime += deltaTime;

    if (this.lastEmitTime >= this.emitInterval) {
      this.lastEmitTime = 0;

      // Calculate intensity based on speed
      const intensity = Math.min((speed - speedThreshold) / 20, 1);

      // White trail with slight color tint
      const color = new THREE.Color(0xffffff);
      color.lerp(new THREE.Color(0xccccff), 0.3);

      this.particleSystem.emit({
        position: position.clone(),
        positionRandomness: new THREE.Vector3(0.1, 0.1, 0.1),
        velocity: new THREE.Vector3(
          -velocity.x * 0.05,
          -velocity.y * 0.05,
          -velocity.z * 0.05
        ),
        velocityRandomness: new THREE.Vector3(0.5, 0.5, 0.5),
        gravity: new THREE.Vector3(0, -2, 0),
        lifetime: 0.3 + intensity * 0.2,
        startSize: 0.3 * intensity,
        endSize: 0.05,
        startOpacity: 0.6 * intensity,
        endOpacity: 0,
        color: color
      });
    }
  }

  public reset(): void {
    this.lastEmitTime = 0;
  }
}
