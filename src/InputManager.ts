import { TouchController } from './TouchController';

export interface InputState {
  horizontal: number;
  vertical: number;
  kick: boolean;
  sprint: boolean;
  switchPlayer: boolean;
}

export class InputManager {
  private keys: { [key: string]: boolean } = {};
  private prevKeys: { [key: string]: boolean } = {};
  private touchController: TouchController | null = null;
  private isMobile: boolean;

  constructor() {
    this.isMobile = this.detectMobile();

    if (this.isMobile) {
      this.touchController = new TouchController();
    }

    window.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });
  }

  private detectMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (window.innerWidth <= 768);
  }

  public getInput(): InputState {
    if (this.isMobile && this.touchController) {
      return this.touchController.getInput();
    }

    const input: InputState = {
      horizontal: 0,
      vertical: 0,
      kick: false,
      sprint: false,
      switchPlayer: false
    };

    if (this.keys['w']) input.vertical += 1;
    if (this.keys['s']) input.vertical -= 1;
    if (this.keys['a']) input.horizontal -= 1;
    if (this.keys['d']) input.horizontal += 1;

    input.kick = this.keys[' '];
    input.sprint = this.keys['shift'];
    input.switchPlayer = this.keys['e'];

    this.prevKeys = { ...this.keys };

    return input;
  }

  public wasKeyPressed(key: string): boolean {
    return this.prevKeys[key.toLowerCase()] || false;
  }

  public getIsMobile(): boolean {
    return this.isMobile;
  }
}
