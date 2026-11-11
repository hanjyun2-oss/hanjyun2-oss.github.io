(() => {
  const canvas = document.querySelector('.motion-layer');
  const context = canvas.getContext('2d');
  if (!context) return;

  // Work in the original image's coordinates. This is the same contain
  // transform as the image, including its subpixel horizontal padding.
  const imageScale = 1040 / 778;
  const imageOffset = (2704 - 2022 * imageScale) / 2;
  const center = { x: 1199, y: 551 };
  const radius = 99;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const TAU = Math.PI * 2;
  let frame = 0;
  let previousTime;
  let elapsed = 0;
  let reportTime = 0;
  let reportFrames = 0;
  let renderCost = 0;
  let request;

  // Curves follow the five existing luminous connections in the reference.
  const channels = [
    [[721, 552], [793, 611], [965, 547], [1095, 557]],
    [[940, 488], [954, 531], [1001, 545], [1095, 558]],
    [[1191, 434], [1191, 439], [1193, 446], [1194, 451]],
    [[1546, 426], [1490.229, 480.359], [1393.665, 514.285], [1304, 533.758]],
    [[1757, 398], [1675.855, 487.468], [1529.722, 542.068], [1304, 550.378]],
  ];

  function bezier(points, progress) {
    const inverse = 1 - progress;
    return {
      x: inverse ** 3 * points[0][0] + 3 * inverse ** 2 * progress * points[1][0]
        + 3 * inverse * progress ** 2 * points[2][0] + progress ** 3 * points[3][0],
      y: inverse ** 3 * points[0][1] + 3 * inverse ** 2 * progress * points[1][1]
        + 3 * inverse * progress ** 2 * points[2][1] + progress ** 3 * points[3][1],
    };
  }

  // Bake glow once, then composite inexpensive sprites instead of blurring
  // every orbit particle and globe node on every frame.
  const glowSprites = new Map();
  function light(x, y, size, opacity = 1) {
    let sprite = glowSprites.get(size);
    if (!sprite) {
      sprite = document.createElement('canvas');
      sprite.width = sprite.height = 80;
      const glow = sprite.getContext('2d');
      glow.scale(2, 2);
      glow.fillStyle = '#eaffff';
      glow.shadowColor = '#0ad6ce';
      glow.shadowBlur = 9;
      glow.beginPath();
      glow.arc(20, 20, size, 0, TAU);
      glow.fill();
      glowSprites.set(size, sprite);
    }
    context.globalAlpha = opacity;
    context.drawImage(sprite, x - 20, y - 20, 40, 40);
    context.globalAlpha = 1;
  }

  function project(latitude, longitude, rotation) {
    const azimuth = longitude + rotation;
    const x = radius * Math.cos(latitude) * Math.sin(azimuth);
    const y = radius * Math.sin(latitude);
    const z = radius * Math.cos(latitude) * Math.cos(azimuth);
    const tilt = 0.15;
    return {
      x: center.x + x,
      y: center.y + y * Math.cos(tilt) - z * Math.sin(tilt),
      depth: y * Math.sin(tilt) + z * Math.cos(tilt),
    };
  }

  function globe(seconds) {
    // Grid and four evenly spaced surface labels share the same rotation.
    const rotation = seconds * TAU / 48;
    context.save();
    context.beginPath();
    context.arc(center.x, center.y, radius, 0, TAU);
    context.clip();
    context.lineWidth = 0.7;
    for (let meridian = 0; meridian < 12; meridian++) {
      const longitude = meridian * TAU / 12;
      context.beginPath();
      let drawing = false;
      for (let sample = 0; sample <= 80; sample++) {
        const point = project(-Math.PI / 2 + sample * Math.PI / 80, longitude, rotation);
        if (point.depth < 0) { drawing = false; continue; }
        if (drawing) context.lineTo(point.x, point.y);
        else context.moveTo(point.x, point.y);
        drawing = true;
      }
      context.strokeStyle = 'rgba(244,255,255,0.65)';
      context.stroke();
    }
    for (let parallel = -3; parallel <= 3; parallel++) {
      const latitude = parallel * Math.PI / 9;
      context.beginPath();
      let drawing = false;
      for (let sample = 0; sample <= 100; sample++) {
        const point = project(latitude, sample * TAU / 100, rotation);
        if (point.depth < 0) { drawing = false; continue; }
        if (drawing) context.lineTo(point.x, point.y);
        else context.moveTo(point.x, point.y);
        drawing = true;
      }
      context.strokeStyle = 'rgba(43,210,217,0.30)';
      context.stroke();
      for (let node = 0; node < 12; node++) {
        const point = project(latitude, node * TAU / 12, rotation);
        if (point.depth > 0) light(point.x, point.y, 1.35, 0.45 + point.depth / radius * 0.45);
      }
    }
    // Put an inscription on each quarter of the equator.  Only the outward
    // facing side is rendered: this keeps the letters crisp and avoids the
    // dark mirrored "shadow" that used to appear through the back of the orb.
    const labels = [0, 0.5, 1, 1.5].map(turns => {
      const longitude = turns * Math.PI;
      return {
        point: project(0, longitude, rotation),
        facing: Math.cos(longitude + rotation),
      };
    }).filter(label => label.point.depth > 0.5)
      .sort((a, b) => a.point.depth - b.point.depth);
    for (const label of labels) {
      context.save();
      context.translate(label.point.x, label.point.y);
      // Compress the lettering as it turns toward the edge of the sphere.
      context.scale(label.facing, 1);
      context.globalAlpha = 0.94;
      context.font = '700 38px Arial, sans-serif';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillStyle = '#10475b';
      context.fillText('AOS', 0, 0);
      context.restore();
    }
    canvas.dataset.globeRotation = rotation.toFixed(4);
    context.restore();
  }

  function orbit(seconds, rx, ry, y, period, direction, opacity) {
    const phase = direction * seconds * TAU / period;
    context.save();
    context.translate(center.x, y);
    context.rotate(-0.025);
    // Short illuminated arcs move around the original elliptical rings.
    for (let satellite = 0; satellite < 2; satellite++) {
      const angle = phase + satellite * Math.PI;
      for (let trail = 0; trail < 22; trail++) {
        const a = angle - direction * trail * 0.022;
        light(rx * Math.cos(a), ry * Math.sin(a), 1.5, opacity * (1 - trail / 22));
      }
      light(rx * Math.cos(angle), ry * Math.sin(angle), 2.7, opacity);
    }
    context.restore();
  }

  // Cache curve positions and normals. Each moving ribbon is a single
  // continuous polygon rather than hundreds of separately blurred segments.
  const conduits = channels.map((channel, index) => {
    const count = index === 2 ? 48 : 240;
    const points = Array.from({ length: count + 1 }, (_, i) => bezier(channel, i / count));
    const normals = points.map((point, i) => {
      const before = points[Math.max(0, i - 1)];
      const after = points[Math.min(count, i + 1)];
      const dx = after.x - before.x;
      const dy = after.y - before.y;
      const length = Math.hypot(dx, dy) || 1;
      return { x: -dy / length, y: dx / length };
    });
    const path = new Path2D();
    path.moveTo(...channel[0]);
    path.bezierCurveTo(...channel[1], ...channel[2], ...channel[3]);
    const length = points.reduce((total, point, i) => i
      ? total + Math.hypot(point.x-points[i-1].x, point.y-points[i-1].y) : 0, 0);
    return { points, normals, path, length, waves: index === 2 ? 1 : 2 };
  });

  function ribbon(conduit, widths, color) {
    context.beginPath();
    const { points, normals } = conduit;
    for (let i = 0; i < points.length; i++) {
      const x = points[i].x + normals[i].x * widths[i];
      const y = points[i].y + normals[i].y * widths[i];
      if (i === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    for (let i = points.length - 1; i >= 0; i--) {
      context.lineTo(points[i].x - normals[i].x * widths[i],
        points[i].y - normals[i].y * widths[i]);
    }
    context.closePath();
    context.fillStyle = color;
    context.fill();
  }

  function information(seconds) {
    context.save();
    context.lineCap = 'butt';
    context.shadowColor = '#20e2d9';
    context.shadowBlur = 7;
    conduits.forEach((conduit, index) => {
      // The original hues and aligned curves stay unchanged.
      context.lineWidth = 2.1;
      context.strokeStyle = 'rgba(8,171,168,0.48)';
      context.stroke(conduit.path);
      context.shadowBlur = 0;
      context.lineWidth = 1.4;
      context.strokeStyle = 'rgba(226,255,255,0.20)';
      context.stroke(conduit.path);
      context.shadowBlur = 7;

      // Slim rounded dashes follow the curve at half the previous speed.
      const count = Math.max(1, Math.ceil(conduit.length / 52));
      for (let dash = 0; dash < count; dash++) {
        const progress = ((dash / count - seconds * 0.132 + index * 0.16) % 1 + 1) % 1;
        const point = bezier(channels[index], progress);
        const before = bezier(channels[index], Math.max(0, progress - 0.004));
        const after = bezier(channels[index], Math.min(1, progress + 0.004));
        const fade = Math.min(1, progress * 18, (1-progress) * 18);
        context.save();
        context.translate(point.x,point.y);
        context.rotate(Math.atan2(after.y-before.y,after.x-before.x));
        context.globalAlpha=fade;
        context.shadowColor='#20e2d9'; context.shadowBlur=2;
        context.lineCap='round'; context.lineWidth=2.8;
        context.strokeStyle='#19ada8';
        context.beginPath();context.moveTo(-4.5,0);context.lineTo(4.5,0);context.stroke();
        context.shadowBlur=0;context.lineWidth=1.1;
        context.strokeStyle='#58ded1';
        context.beginPath();context.moveTo(-4.2,-.45);context.lineTo(4.2,-.45);context.stroke();
        context.restore();
      }
      context.shadowBlur = 7;
    });
    context.restore();
  }

  function render(timestamp) {
    const began = performance.now();
    if (previousTime !== undefined && !reduceMotion.matches) {
      elapsed += Math.min((timestamp - previousTime) / 1000, 0.05);
    }
    previousTime = timestamp;
    const seconds = reduceMotion.matches ? 0 : elapsed * 1.265;
    // Only the animated lower-central region needs clearing.
    context.clearRect(690 * imageScale + imageOffset, 380 * imageScale,
      1095 * imageScale, 342 * imageScale);
    context.save();
    context.translate(imageOffset, 0);
    context.scale(imageScale, imageScale);
    globe(seconds);
    orbit(seconds, 159, 41, 554, 22, 1, 0.85);
    orbit(seconds, 241, 66, 627, 32, -1, 0.60);
    information(seconds);
    context.restore();
    frame++;
    reportFrames++;
    renderCost += performance.now() - began;
    if (timestamp - reportTime >= 1000) {
      canvas.dataset.frame = String(frame);
      canvas.dataset.fps = (reportFrames * 1000 / (timestamp - reportTime)).toFixed(1);
      canvas.dataset.renderMs = (renderCost / reportFrames).toFixed(2);
      reportTime = timestamp;
      reportFrames = 0;
      renderCost = 0;
    }
    // Draw on every display frame: the former 30fps threshold caused uneven
    // 33/50ms intervals on a 60Hz display. Movement is based on elapsed time.
    if (!reduceMotion.matches && !document.hidden) request = requestAnimationFrame(render);
  }

  function resume() {
    cancelAnimationFrame(request);
    previousTime = undefined;
    if (!document.hidden) request = requestAnimationFrame(render);
  }
  document.addEventListener('visibilitychange', resume);
  reduceMotion.addEventListener('change', resume);
  resume();
})();
