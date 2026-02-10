import * as THREE from 'three';

export interface ParticleConfig {
  lifetime: number;
  velocity: THREE.Vector3;
  velocityRandomness?: THREE.Vector3;
  gravity?: THREE.Vector3;
  startSize: number;
  endSize: number;
  startOpacity: number;
  endOpacity: number;
  color: THREE.Color;
  position: THREE.Vector3;
  positionRandomness?: THREE.Vector3;
}

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  gravity: THREE.Vector3;
  lifetime: number;
  maxLifetime: number;
  startSize: number;
  endSize: number;
  startOpacity: number;
  endOpacity: number;
  active: boolean;
}

export class ParticleSystem {
  private scene: THREE.Scene;
  private particlePool: Particle[] = [];
  private activeParticles: Particle[] = [];
  private readonly poolSize: number = 200;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initializePool();
  }

  private initializePool(): void {
    for (let i = 0; i < this.poolSize; i++) {
      const geometry = new THREE.PlaneGeometry(1, 1);
      const material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 1,
        depthWrite: false,
        side: THREE.DoubleSide
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.visible = false;
      this.scene.add(mesh);

      const particle: Particle = {
        mesh,
        velocity: new THREE.Vector3(),
        gravity: new THREE.Vector3(),
        lifetime: 0,
        maxLifetime: 1,
        startSize: 1,
        endSize: 0,
        startOpacity: 1,
        endOpacity: 0,
        active: false
      };

      this.particlePool.push(particle);
    }
  }

  public emit(config: ParticleConfig): void {
    const particle = this.getInactiveParticle();
    if (!particle) return;

    // Position
    particle.mesh.position.copy(config.position);
    if (config.positionRandomness) {
      particle.mesh.position.x += (Math.random() - 0.5) * config.positionRandomness.x;
      particle.mesh.position.y += (Math.random() - 0.5) * config.positionRandomness.y;
      particle.mesh.position.z += (Math.random() - 0.5) * config.positionRandomness.z;
    }

    // Velocity
    particle.velocity.copy(config.velocity);
    if (config.velocityRandomness) {
      particle.velocity.x += (Math.random() - 0.5) * config.velocityRandomness.x;
      particle.velocity.y += (Math.random() - 0.5) * config.velocityRandomness.y;
      particle.velocity.z += (Math.random() - 0.5) * config.velocityRandomness.z;
    }

    // Gravity
    particle.gravity.copy(config.gravity || new THREE.Vector3(0, -9.8, 0));

    // Lifetime
    particle.lifetime = 0;
    particle.maxLifetime = config.lifetime;

    // Size
    particle.startSize = config.startSize;
    particle.endSize = config.endSize;

    // Opacity
    particle.startOpacity = config.startOpacity;
    particle.endOpacity = config.endOpacity;

    // Color
    (particle.mesh.material as THREE.MeshBasicMaterial).color.copy(config.color);

    // Activate
    particle.active = true;
    particle.mesh.visible = true;
    this.activeParticles.push(particle);
  }

  public emitBurst(config: ParticleConfig, count: number): void {
    for (let i = 0; i < count; i++) {
      this.emit(config);
    }
  }

  public emitCone(
    config: ParticleConfig,
    count: number,
    coneAngle: number,
    direction: THREE.Vector3
  ): void {
    const up = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(direction, up).normalize();
    const actualUp = new THREE.Vector3().crossVectors(right, direction).normalize();

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * Math.tan(coneAngle);

      const localDir = new THREE.Vector3(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        1
      ).normalize();

      const worldDir = new THREE.Vector3()
        .addScaledVector(right, localDir.x)
        .addScaledVector(actualUp, localDir.y)
        .addScaledVector(direction, localDir.z)
        .normalize();

      const particleConfig = { ...config };
      particleConfig.velocity = worldDir.multiplyScalar(config.velocity.length());

      this.emit(particleConfig);
    }
  }

  public update(deltaTime: number): void {
    for (let i = this.activeParticles.length - 1; i >= 0; i--) {
      const particle = this.activeParticles[i];

      // Update lifetime
      particle.lifetime += deltaTime;

      if (particle.lifetime >= particle.maxLifetime) {
        this.deactivateParticle(particle, i);
        continue;
      }

      // Update velocity with gravity
      particle.velocity.x += particle.gravity.x * deltaTime;
      particle.velocity.y += particle.gravity.y * deltaTime;
      particle.velocity.z += particle.gravity.z * deltaTime;

      // Update position
      particle.mesh.position.x += particle.velocity.x * deltaTime;
      particle.mesh.position.y += particle.velocity.y * deltaTime;
      particle.mesh.position.z += particle.velocity.z * deltaTime;

      // Calculate interpolation factor
      const t = particle.lifetime / particle.maxLifetime;

      // Update size
      const size = THREE.MathUtils.lerp(particle.startSize, particle.endSize, t);
      particle.mesh.scale.set(size, size, 1);

      // Update opacity
      const opacity = THREE.MathUtils.lerp(particle.startOpacity, particle.endOpacity, t);
      (particle.mesh.material as THREE.MeshBasicMaterial).opacity = opacity;

      // Billboard effect - face camera
      if (this.scene.userData.camera) {
        particle.mesh.lookAt(this.scene.userData.camera.position);
      }
    }
  }

  private deactivateParticle(particle: Particle, index: number): void {
    particle.active = false;
    particle.mesh.visible = false;
    this.activeParticles.splice(index, 1);
  }

  private getInactiveParticle(): Particle | null {
    for (const particle of this.particlePool) {
      if (!particle.active) {
        return particle;
      }
    }
    return null;
  }

  public clear(): void {
    for (const particle of this.activeParticles) {
      particle.active = false;
      particle.mesh.visible = false;
    }
    this.activeParticles = [];
  }

  public getActiveCount(): number {
    return this.activeParticles.length;
  }
}
