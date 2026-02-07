import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class Ball {
  public mesh: THREE.Mesh;
  public body: CANNON.Body;

  constructor(scene: THREE.Scene, world: CANNON.World) {
    const ballGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    const ballMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.4,
      metalness: 0.1
    });
    this.mesh = new THREE.Mesh(ballGeometry, ballMaterial);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    scene.add(this.mesh);

    this.body = new CANNON.Body({
      mass: 0.45,
      shape: new CANNON.Sphere(0.5),
      position: new CANNON.Vec3(0, 1, 0),
      linearDamping: 0.3,
      angularDamping: 0.3,
      material: new CANNON.Material({
        friction: 0.3,
        restitution: 0.7
      })
    });

    world.addBody(this.body);
  }

  public update(): void {
    this.mesh.position.copy(this.body.position as any);
    this.mesh.quaternion.copy(this.body.quaternion as any);

    if (this.body.position.y < 0.5) {
      this.body.position.y = 0.5;
      this.body.velocity.y = Math.abs(this.body.velocity.y) * 0.7;
    }
  }

  public getPosition(): THREE.Vector3 {
    return new THREE.Vector3(
      this.body.position.x,
      this.body.position.y,
      this.body.position.z
    );
  }

  public setPosition(position: THREE.Vector3): void {
    this.body.position.set(position.x, position.y, position.z);
    this.mesh.position.copy(position);
  }
}
