export class PowerMeter {
  private container: HTMLDivElement;
  private bar: HTMLDivElement;
  private indicator: HTMLDivElement;
  private isVisible: boolean = false;

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'power-meter';
    this.container.style.cssText = `
      position: fixed;
      bottom: 80px;
      right: 20px;
      width: 60px;
      height: 250px;
      background: rgba(0, 0, 0, 0.7);
      border: 3px solid rgba(255, 255, 255, 0.8);
      border-radius: 10px;
      padding: 8px;
      display: none;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
      z-index: 100;
    `;

    // Inner bar container for the fill
    const barContainer = document.createElement('div');
    barContainer.style.cssText = `
      width: 100%;
      height: 100%;
      position: relative;
      background: rgba(50, 50, 50, 0.8);
      border-radius: 5px;
      overflow: hidden;
    `;

    this.bar = document.createElement('div');
    this.bar.style.cssText = `
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 0%;
      background: linear-gradient(to top,
        #00ff00 0%,
        #00ff00 60%,
        #ffff00 60%,
        #ffff00 90%,
        #ff0000 90%,
        #ff0000 100%
      );
      transition: height 0.05s linear;
      border-radius: 5px;
      box-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
    `;

    // Power indicator overlay
    this.indicator = document.createElement('div');
    this.indicator.style.cssText = `
      position: absolute;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 14px;
      font-weight: bold;
      color: white;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
      font-family: Arial, sans-serif;
      z-index: 10;
    `;

    barContainer.appendChild(this.bar);
    this.container.appendChild(barContainer);
    this.container.appendChild(this.indicator);
    document.body.appendChild(this.container);

    this.addLabel();
  }

  private addLabel(): void {
    const label = document.createElement('div');
    label.textContent = 'POWER';
    label.style.cssText = `
      position: absolute;
      top: -25px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 12px;
      font-weight: bold;
      color: white;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
      font-family: Arial, sans-serif;
      white-space: nowrap;
    `;
    this.container.appendChild(label);
  }

  public show(): void {
    this.container.style.display = 'block';
    this.isVisible = true;
  }

  public hide(): void {
    this.container.style.display = 'none';
    this.isVisible = false;
    this.setPower(0);
  }

  public setPower(percentage: number): void {
    // Clamp between 0 and 100
    const power = Math.max(0, Math.min(100, percentage));

    this.bar.style.height = `${power}%`;
    this.indicator.textContent = `${Math.round(power)}%`;

    // Add pulsing effect at max power
    if (power >= 95) {
      this.bar.style.animation = 'pulse 0.3s ease-in-out infinite';
    } else {
      this.bar.style.animation = 'none';
    }

    // Update bar color intensity based on power
    this.updateBarColor(power);
  }

  private updateBarColor(power: number): void {
    if (power < 60) {
      // Green zone - accurate
      this.bar.style.boxShadow = '0 0 15px rgba(0, 255, 0, 0.6)';
    } else if (power < 90) {
      // Yellow zone - powerful
      this.bar.style.boxShadow = '0 0 15px rgba(255, 255, 0, 0.6)';
    } else {
      // Red zone - overpowered
      this.bar.style.boxShadow = '0 0 20px rgba(255, 0, 0, 0.8)';
    }
  }

  public getIsVisible(): boolean {
    return this.isVisible;
  }

  public addStyles(): void {
    // Add keyframe animation for pulsing effect
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0%, 100% {
          opacity: 1;
          transform: scaleX(1);
        }
        50% {
          opacity: 0.8;
          transform: scaleX(1.05);
        }
      }
    `;
    document.head.appendChild(style);
  }
}
