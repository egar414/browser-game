export class Input {
  constructor(onAction) {
    this.keys = new Set(); this.onAction = onAction; this.orbit = 0; this.dragging = false;
    const captured = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'];
    window.addEventListener('keydown', e => {
      if (/INPUT|SELECT/.test(e.target.tagName)) return;
      if (captured.includes(e.code)) e.preventDefault();
      this.keys.add(e.code);
      if (!e.repeat) onAction(e.code);
    });
    window.addEventListener('keyup', e => this.keys.delete(e.code));
    window.addEventListener('blur', () => { this.clear(); onAction('Blur'); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) { this.clear(); onAction('Blur'); } });
    const canvas = document.querySelector('#game');
    canvas.addEventListener('pointerdown', e => { this.dragging = true; this.lastX = e.clientX; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', e => { if (this.dragging) { this.orbit -= (e.clientX - this.lastX) * 0.006; this.lastX = e.clientX; } });
    canvas.addEventListener('pointerup', () => { this.dragging = false; });
    canvas.addEventListener('lostpointercapture', () => { this.dragging = false; });
  }
  clear() { this.keys.clear(); this.dragging = false; }
  held(...codes) { return codes.some(c => this.keys.has(c)); }
  sample() {
    return {
      throttle: +this.held('KeyW', 'ArrowUp') - +this.held('KeyS', 'ArrowDown'),
      steer: +this.held('KeyA', 'ArrowLeft') - +this.held('KeyD', 'ArrowRight'),
      trim: +this.held('KeyQ') - +this.held('KeyE'),
      freestyle: this.held('ShiftLeft', 'ShiftRight'),
    };
  }
}
