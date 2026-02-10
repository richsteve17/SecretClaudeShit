import { AudioManager } from './AudioManager';

export interface TouchInput {
  horizontal: number;
  vertical: number;
  kick: boolean;
  sprint: boolean;
  switchPlayer: boolean;
}

export class TouchController {
  private joystickBase!: HTMLElement;
  private joystickStick!: HTMLElement;
  private kickButton!: HTMLElement;
  private sprintButton!: HTMLElement;
  private switchButton!: HTMLElement;

  private joystickActive: boolean = false;
  private joystickCenter: { x: number; y: number } = { x: 0, y: 0 };
  private joystickOffset: { x: number; y: number } = { x: 0, y: 0 };
  private maxJoystickDistance: number = 50;

  private kickPressed: boolean = false;
  private sprintPressed: boolean = false;
  private switchPressed: boolean = false;
  private lastSwitchPress: number = 0;

  constructor() {
    this.createTouchControls();
    this.setupEventListeners();
  }

  private createTouchControls(): void {
    // Joystick container
    this.joystickBase = document.createElement('div');
    this.joystickBase.id = 'joystick-base';
    this.joystickBase.style.cssText = `
      position: absolute;
      bottom: 80px;
      left: 80px;
      width: 120px;
      height: 120px;
      background: rgba(255, 255, 255, 0.2);
      border: 3px solid rgba(255, 255, 255, 0.4);
      border-radius: 50%;
      touch-action: none;
      z-index: 1000;
    `;

    this.joystickStick = document.createElement('div');
    this.joystickStick.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      width: 50px;
      height: 50px;
      background: rgba(255, 255, 255, 0.6);
      border: 2px solid rgba(255, 255, 255, 0.8);
      border-radius: 50%;
      transform: translate(-50%, -50%);
      transition: transform 0.1s ease-out;
    `;
    this.joystickBase.appendChild(this.joystickStick);
    document.body.appendChild(this.joystickBase);

    // Kick button
    this.kickButton = document.createElement('div');
    this.kickButton.id = 'kick-button';
    this.kickButton.innerHTML = '⚽';
    this.kickButton.style.cssText = `
      position: absolute;
      bottom: 140px;
      right: 80px;
      width: 80px;
      height: 80px;
      background: rgba(255, 100, 100, 0.7);
      border: 3px solid rgba(255, 100, 100, 0.9);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 40px;
      touch-action: none;
      user-select: none;
      z-index: 1000;
      transition: transform 0.1s, background 0.1s;
    `;
    document.body.appendChild(this.kickButton);

    // Sprint button
    this.sprintButton = document.createElement('div');
    this.sprintButton.id = 'sprint-button';
    this.sprintButton.innerHTML = '⚡';
    this.sprintButton.style.cssText = `
      position: absolute;
      bottom: 80px;
      right: 180px;
      width: 70px;
      height: 70px;
      background: rgba(100, 200, 255, 0.7);
      border: 3px solid rgba(100, 200, 255, 0.9);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 35px;
      touch-action: none;
      user-select: none;
      z-index: 1000;
      transition: transform 0.1s, background 0.1s;
    `;
    document.body.appendChild(this.sprintButton);

    // Switch player button
    this.switchButton = document.createElement('div');
    this.switchButton.id = 'switch-button';
    this.switchButton.innerHTML = '↔️';
    this.switchButton.style.cssText = `
      position: absolute;
      top: 100px;
      right: 20px;
      width: 60px;
      height: 60px;
      background: rgba(255, 200, 100, 0.7);
      border: 3px solid rgba(255, 200, 100, 0.9);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 30px;
      touch-action: none;
      user-select: none;
      z-index: 1000;
      transition: transform 0.1s, background 0.1s;
    `;
    document.body.appendChild(this.switchButton);
  }

  private setupEventListeners(): void {
    // Joystick events
    this.joystickBase.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.joystickActive = true;
      const rect = this.joystickBase.getBoundingClientRect();
      this.joystickCenter = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
    });

    this.joystickBase.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (!this.joystickActive) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - this.joystickCenter.x;
      const deltaY = touch.clientY - this.joystickCenter.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      if (distance > this.maxJoystickDistance) {
        this.joystickOffset.x = (deltaX / distance) * this.maxJoystickDistance;
        this.joystickOffset.y = (deltaY / distance) * this.maxJoystickDistance;
      } else {
        this.joystickOffset.x = deltaX;
        this.joystickOffset.y = deltaY;
      }

      this.joystickStick.style.transform = `translate(calc(-50% + ${this.joystickOffset.x}px), calc(-50% + ${this.joystickOffset.y}px))`;
    });

    this.joystickBase.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.joystickActive = false;
      this.joystickOffset = { x: 0, y: 0 };
      this.joystickStick.style.transform = 'translate(-50%, -50%)';
    });

    // Kick button events
    this.kickButton.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.kickPressed = true;
      this.kickButton.style.transform = 'scale(0.9)';
      this.kickButton.style.background = 'rgba(255, 100, 100, 0.9)';

      // Play UI click sound
      const audioManager = AudioManager.getInstance();
      audioManager.playSound('ui_click', 0.4);
    });

    this.kickButton.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.kickPressed = false;
      this.kickButton.style.transform = 'scale(1)';
      this.kickButton.style.background = 'rgba(255, 100, 100, 0.7)';
    });

    // Sprint button events
    this.sprintButton.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.sprintPressed = true;
      this.sprintButton.style.transform = 'scale(0.9)';
      this.sprintButton.style.background = 'rgba(100, 200, 255, 0.9)';
    });

    this.sprintButton.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.sprintPressed = false;
      this.sprintButton.style.transform = 'scale(1)';
      this.sprintButton.style.background = 'rgba(100, 200, 255, 0.7)';
    });

    // Switch button events
    this.switchButton.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const now = Date.now();
      if (now - this.lastSwitchPress > 300) {
        this.switchPressed = true;
        this.lastSwitchPress = now;

        // Play UI click sound
        const audioManager = AudioManager.getInstance();
        audioManager.playSound('ui_click', 0.4);
      }
      this.switchButton.style.transform = 'scale(0.9)';
      this.switchButton.style.background = 'rgba(255, 200, 100, 0.9)';
    });

    this.switchButton.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.switchButton.style.transform = 'scale(1)';
      this.switchButton.style.background = 'rgba(255, 200, 100, 0.7)';
    });

    // Prevent default touch behavior on the document
    document.addEventListener('touchmove', (e) => {
      if ((e.target as HTMLElement).closest('#joystick-base, #kick-button, #sprint-button, #switch-button')) {
        e.preventDefault();
      }
    }, { passive: false });
  }

  public getInput(): TouchInput {
    const horizontal = this.joystickOffset.x / this.maxJoystickDistance;
    const vertical = this.joystickOffset.y / this.maxJoystickDistance;

    const result = {
      horizontal,
      vertical,
      kick: this.kickPressed,
      sprint: this.sprintPressed,
      switchPlayer: this.switchPressed
    };

    // Reset switch after reading
    if (this.switchPressed) {
      this.switchPressed = false;
    }

    return result;
  }

  public hide(): void {
    this.joystickBase.style.display = 'none';
    this.kickButton.style.display = 'none';
    this.sprintButton.style.display = 'none';
    this.switchButton.style.display = 'none';
  }

  public show(): void {
    this.joystickBase.style.display = 'block';
    this.kickButton.style.display = 'flex';
    this.sprintButton.style.display = 'flex';
    this.switchButton.style.display = 'flex';
  }
}
