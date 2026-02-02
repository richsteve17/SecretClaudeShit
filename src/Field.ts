import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class Field {
  constructor(scene: THREE.Scene, world: CANNON.World) {
    this.createGround(scene, world);
    this.createFieldMarkings(scene);
    this.createGoals(scene, world);
  }

  private createGround(scene: THREE.Scene, world: CANNON.World): void {
    const groundGeometry = new THREE.PlaneGeometry(100, 60);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x2d8c3c,
      roughness: 0.8
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const groundBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Plane()
    });
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    world.addBody(groundBody);
  }

  private createFieldMarkings(scene: THREE.Scene): void {
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });

    const outerBox = [
      new THREE.Vector3(-50, 0.1, -30),
      new THREE.Vector3(50, 0.1, -30),
      new THREE.Vector3(50, 0.1, 30),
      new THREE.Vector3(-50, 0.1, 30),
      new THREE.Vector3(-50, 0.1, -30)
    ];
    const outerGeometry = new THREE.BufferGeometry().setFromPoints(outerBox);
    const outerLine = new THREE.Line(outerGeometry, lineMaterial);
    scene.add(outerLine);

    const centerLine = [
      new THREE.Vector3(0, 0.1, -30),
      new THREE.Vector3(0, 0.1, 30)
    ];
    const centerGeometry = new THREE.BufferGeometry().setFromPoints(centerLine);
    const centerLineObj = new THREE.Line(centerGeometry, lineMaterial);
    scene.add(centerLineObj);

    const centerCircle = new THREE.RingGeometry(9.9, 10, 32);
    const circleMesh = new THREE.Mesh(centerCircle, new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide
    }));
    circleMesh.rotation.x = -Math.PI / 2;
    circleMesh.position.y = 0.1;
    scene.add(circleMesh);

    const penaltyBoxLeft = [
      new THREE.Vector3(-50, 0.1, -16),
      new THREE.Vector3(-35, 0.1, -16),
      new THREE.Vector3(-35, 0.1, 16),
      new THREE.Vector3(-50, 0.1, 16)
    ];
    const penaltyBoxLeftGeometry = new THREE.BufferGeometry().setFromPoints(penaltyBoxLeft);
    const penaltyBoxLeftLine = new THREE.Line(penaltyBoxLeftGeometry, lineMaterial);
    scene.add(penaltyBoxLeftLine);

    const penaltyBoxRight = [
      new THREE.Vector3(50, 0.1, -16),
      new THREE.Vector3(35, 0.1, -16),
      new THREE.Vector3(35, 0.1, 16),
      new THREE.Vector3(50, 0.1, 16)
    ];
    const penaltyBoxRightGeometry = new THREE.BufferGeometry().setFromPoints(penaltyBoxRight);
    const penaltyBoxRightLine = new THREE.Line(penaltyBoxRightGeometry, lineMaterial);
    scene.add(penaltyBoxRightLine);
  }

  private createGoals(scene: THREE.Scene, world: CANNON.World): void {
    this.createGoal(scene, world, -52, 0xff4444);
    this.createGoal(scene, world, 52, 0x4444ff);
  }

  private createGoal(scene: THREE.Scene, world: CANNON.World, xPos: number, color: number): void {
    const postMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const postGeometry = new THREE.CylinderGeometry(0.3, 0.3, 4, 8);

    const leftPost = new THREE.Mesh(postGeometry, postMaterial);
    leftPost.position.set(xPos, 2, -7.5);
    leftPost.castShadow = true;
    scene.add(leftPost);

    const rightPost = new THREE.Mesh(postGeometry, postMaterial);
    rightPost.position.set(xPos, 2, 7.5);
    rightPost.castShadow = true;
    scene.add(rightPost);

    const crossbarGeometry = new THREE.CylinderGeometry(0.3, 0.3, 15, 8);
    const crossbar = new THREE.Mesh(crossbarGeometry, postMaterial);
    crossbar.position.set(xPos, 4, 0);
    crossbar.rotation.z = Math.PI / 2;
    crossbar.castShadow = true;
    scene.add(crossbar);

    const netGeometry = new THREE.PlaneGeometry(15, 4);
    const netMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });
    const net = new THREE.Mesh(netGeometry, netMaterial);
    net.position.set(xPos, 2, 0);
    net.rotation.y = xPos > 0 ? Math.PI / 2 : -Math.PI / 2;
    scene.add(net);
  }
}
