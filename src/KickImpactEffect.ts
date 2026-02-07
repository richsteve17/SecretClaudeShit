import * as THREE from 'three';
import { ParticleSystem } from './ParticleSystem';

export class KickImpactEffect {
  private particleSystem: ParticleSystem;

  constructor(particleSystem: ParticleSystem) {
    this.particleSystem = particleSystem;
  }

  public trigger(position: THREE.Vector3, direction: THREE.Vector3): void {
    const particleCount = 8;

    // Grass/dust color variations
    const colors = [
      new THREE.Color(0x8B7355), // Brown dust
      new THREE.Color(0x6B8E23), // Olive green
      new THREE.Color(0x9B8B6B), // Light brown
      new THREE.Color(0x556B2F)  // Dark olive
    ];

    for (let i = 0; i < particleCount; i++) {
      const spreadAngle = (Math.random() - 0.5) * Math.PI * 0.5;
      const speed = 3 + Math.random() * 2;

      const angle = Math.atan2(direction.z, direction.x) + spreadAngle;
      const velocity = new THREE.Vector3(
        Math.cos(angle) * speed,
        2 + Math.random() * 2,
        Math.sin(angle) * speed
      );

      const color = colors[Math.floor(Math.random() * colors.length)];

      this.particleSystem.emit({
        position: position.clone(),
        positionRandomness: new THREE.Vector3(0.3, 0.1, 0.3),
        velocity: velocity,
        velocityRandomness: new THREE.Vector3(1, 1, 1),
        gravity: new THREE.Vector3(0, -12, 0),
        lifetime: 0.4 + Math.random() * 0.3,
        startSize: 0.3 + Math.random() * 0.2,
        endSize: 0.05,
        startOpacity: 0.8,
        endOpacity: 0,
        color: color
      });
    }
  }
}
