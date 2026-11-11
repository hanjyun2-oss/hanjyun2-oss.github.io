(() => {
  const fitCover = () => {
    const scale = Math.min(window.innerWidth / 2704, window.innerHeight / 1040);
    document.documentElement.style.setProperty('--cover-scale', String(scale));
  };
  fitCover();
  window.addEventListener('resize', fitCover, { passive: true });
})();

// Restore the globe's glass surface underneath its former raster title.
(() => {
  const image = document.querySelector('.cover-image');
  const canvas = document.querySelector('#globe-copy-background');
  const ctx = canvas.getContext('2d');
  const restoreGlobe = () => {
    const patch = document.createElement('canvas');
    patch.width = 154; patch.height = 46;
    const pc = patch.getContext('2d');
    pc.drawImage(image, 1123, 524, 154, 3, 0, 0, 154, 46);
    const bottom = document.createElement('canvas');
    bottom.width = 154; bottom.height = 46;
    const bc = bottom.getContext('2d');
    bc.drawImage(image, 1123, 580, 154, 3, 0, 0, 154, 46);
    bc.globalCompositeOperation = 'destination-in';
    const blend = bc.createLinearGradient(0, 0, 0, 46);
    blend.addColorStop(0, 'transparent'); blend.addColorStop(1, 'white');
    bc.fillStyle = blend; bc.fillRect(0, 0, 154, 46);
    pc.drawImage(bottom, 0, 0);
    pc.globalCompositeOperation = 'destination-in';
    const feather = pc.createLinearGradient(0, 0, 0, 46);
    feather.addColorStop(0, 'transparent'); feather.addColorStop(.08, 'white');
    feather.addColorStop(.92, 'white'); feather.addColorStop(1, 'transparent');
    pc.fillStyle = feather; pc.fillRect(0, 0, 154, 46);
    ctx.clearRect(0, 0, 2022, 778);
    ctx.drawImage(patch, 1123, 531);
  };
  if (image.complete && image.naturalWidth) restoreGlobe();
  else image.addEventListener('load', restoreGlobe, { once: true });
})();

// Replace the two raster badge captions with editable text while retaining
// the original badge surfaces and icons.
(() => {
  const image = document.querySelector('.cover-image');
  const canvas = document.querySelector('#badge-copy-background');
  const ctx = canvas.getContext('2d');
  const restoreBadges = () => {
    ctx.clearRect(0, 0, 2022, 778);
    ctx.drawImage(image, 1168, 682, 4, 30, 1171, 682, 99, 30);
    ctx.save();
    ctx.translate(1408, 662);
    ctx.rotate(-7 * Math.PI / 180);
    ctx.drawImage(image, 1403, 664, 4, 32, 0, 0, 96, 32);
    ctx.restore();
  };
  if (image.complete && image.naturalWidth) restoreBadges();
  else image.addEventListener('load', restoreBadges, { once: true });
})();

// Restore the blank card surface from the same image, then display editable
// SVG text above it. The reference image and the original icons stay intact.
(() => {
  const image = document.querySelector('.cover-image');
  const canvas = document.querySelector('#pain-copy-background');
  const ctx = canvas.getContext('2d');
  function repairCopyBackground() {
    ctx.clearRect(0, 0, 2022, 778);
    for (const y of [224, 327, 431, 535, 642]) {
      const patch = document.createElement('canvas');
      patch.width = 244; patch.height = 72;
      const pc = patch.getContext('2d');
      // Both strips are blank inside the same card. Blend them horizontally
      // to retain its vertical shading and translucent glass appearance.
      pc.drawImage(image, 147, y, 6, 72, 0, 0, 244, 72);
      const right = document.createElement('canvas');
      right.width = 244; right.height = 72;
      const rc = right.getContext('2d');
      rc.drawImage(image, 390, y, 6, 72, 0, 0, 244, 72);
      rc.globalCompositeOperation = 'destination-in';
      const blend = rc.createLinearGradient(0,0,244,0);
      blend.addColorStop(0,'rgba(255,255,255,0)');
      blend.addColorStop(1,'white');
      rc.fillStyle = blend; rc.fillRect(0,0,244,72);
      pc.drawImage(right,0,0);
      pc.globalCompositeOperation = 'destination-in';
      const fade = pc.createLinearGradient(0,0,244,0);
      fade.addColorStop(0,'rgba(255,255,255,0)');
      fade.addColorStop(.025,'white');
      fade.addColorStop(.975,'white');
      fade.addColorStop(1,'rgba(255,255,255,0)');
      pc.fillStyle=fade;pc.fillRect(0,0,244,72);
      const vertical=pc.createLinearGradient(0,0,0,72);
      vertical.addColorStop(0,'rgba(255,255,255,0)');
      vertical.addColorStop(.08,'white');
      vertical.addColorStop(.92,'white');
      vertical.addColorStop(1,'rgba(255,255,255,0)');
      pc.fillStyle=vertical;pc.fillRect(0,0,244,72);
      ctx.drawImage(patch,153,y);
    }
  }
  if (image.complete && image.naturalWidth) repairCopyBackground();
  else image.addEventListener('load', repairCopyBackground, {once:true});
})();
