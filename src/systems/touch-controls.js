export function isTouchDevice(){return navigator.maxTouchPoints>0||window.matchMedia('(pointer: coarse)').matches;}
export class TouchControls {
  constructor(input){
    this.input=input;document.body.classList.toggle('touch-device',isTouchDevice());
    const root=document.createElement('div');root.className='touch-controls';root.setAttribute('aria-label','Touch driving controls');
    root.innerHTML=`
      <div class="rotate-hint" role="dialog" aria-label="Landscape riding"><div><span class="rotate-phone">↻</span><strong>Turn your phone sideways</strong><p>More water in view. Room for both thumbs.</p><button id="landscape-fullscreen">LANDSCAPE FULL SCREEN</button><button id="keep-portrait">Continue in portrait</button></div></div>
      <div class="touch-tools"><button id="touch-fullscreen" aria-label="Landscape full screen">FULL</button><button data-code="KeyT" data-tap aria-label="Change riding mode">MODE</button><button data-code="KeyC" data-tap aria-label="Change camera">VIEW</button><button data-code="KeyR" data-tap aria-label="Recover craft">RESET</button><button data-code="KeyH" data-tap aria-label="Show controls">HELP</button></div>
      <div class="touch-steering"><button data-code="KeyA" aria-label="Steer left">◀</button><button data-code="KeyD" aria-label="Steer right">▶</button><small>STEER</small></div>
      <div class="touch-tricks"><button data-code="KeyZ" aria-label="Hold Hangman in air">HANG</button><button data-code="KeyX" aria-label="Hold No-hander in air">NO HANDS</button><button data-code="KeyV" aria-label="Hold Superman in air">SUPER</button></div>
      <div class="touch-trim"><button data-code="KeyE" aria-label="Trim bow down">BOW −</button><button data-code="ShiftLeft" data-toggle aria-label="Toggle bow lift and slide" aria-pressed="false">LIFT</button><button data-code="KeyQ" aria-label="Trim bow up">BOW +</button></div>
      <div class="touch-throttle"><button data-code="KeyS" aria-label="Brake and reverse">BRAKE<br><small>REVERSE</small></button><button class="touch-go" data-code="KeyW" aria-label="Accelerate">GO</button></div>`;
    document.querySelector('#hud').appendChild(root);this.root=root;
    const paint=()=>root.querySelectorAll('[data-code]').forEach(b=>{const active=input.held(b.dataset.code);b.classList.toggle('pressed',active);if(b.hasAttribute('data-toggle'))b.setAttribute('aria-pressed',String(active));});
    input.onClear=paint;
    for(const button of root.querySelectorAll('button[data-code]')){
      button.addEventListener('pointerdown',e=>{
        if(e.pointerType==='mouse'&&e.button!==0)return;e.preventDefault();e.stopPropagation();button.setPointerCapture(e.pointerId);
        const code=button.dataset.code;
        if(button.hasAttribute('data-toggle'))input.toggleTouch(code);
        else if(button.hasAttribute('data-tap'))input.onAction(code);
        else input.touchStart(e.pointerId,code);
        paint();
      });
      const release=e=>{input.touchEnd(e.pointerId);paint();};
      for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,release);
      button.addEventListener('contextmenu',e=>e.preventDefault());
      button.addEventListener('click',e=>{if(e.detail===0){if(button.hasAttribute('data-toggle'))input.toggleTouch(button.dataset.code);else if(button.hasAttribute('data-tap'))input.onAction(button.dataset.code);paint();}});
    }
    const fullScreen=async()=>{
      input.clear();
      try{if(!document.fullscreenElement&&document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();}catch{/* Browser may require standalone installation; the rotate prompt remains available. */}
      try{await screen.orientation?.lock?.('landscape');}catch{/* iOS/Safari may require physical rotation. */}
    };
    root.querySelector('#landscape-fullscreen').addEventListener('click',fullScreen);
    root.querySelector('#touch-fullscreen').addEventListener('click',fullScreen);
    root.querySelector('#keep-portrait').addEventListener('click',()=>{document.body.classList.add('portrait-allowed');input.clear();});
    // Rotation or a resized browser must never leave an invisible held pedal.
    window.addEventListener('resize',()=>{if(isTouchDevice())input.clear();});
  }
}
