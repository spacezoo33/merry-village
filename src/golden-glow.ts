/** Same bounded golden halo/rays for the 3D star texture and exported lamp photo. */
export function drawGoldenGlow(c: CanvasRenderingContext2D, x: number, y: number, radius: number, level: number) {
  if (level <= 0) return;
  c.save();
  c.globalAlpha = Math.min(1, level);
  c.globalCompositeOperation = "lighter";
  const halo = c.createRadialGradient(x, y, 0, x, y, radius);
  halo.addColorStop(0, "#fffdf4");
  halo.addColorStop(.1, "#fff6d8ed");
  halo.addColorStop(.25, "#ffd07188");
  halo.addColorStop(.6, "#ffb43e22");
  halo.addColorStop(1, "#ffb43e00");
  c.fillStyle = halo;
  c.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  for (let ray = 0; ray < 12; ray++) {
    const angle = ray * Math.PI / 6, length = radius * (ray % 3 === 0 ? .97 : ray % 2 ? .55 : .73);
    c.save(); c.translate(x, y); c.rotate(angle);
    const gradient = c.createLinearGradient(0, 0, length, 0);
    gradient.addColorStop(0, "#fffef7");
    gradient.addColorStop(.18, "#fff1bde6");
    gradient.addColorStop(.55, "#ffcc6977");
    gradient.addColorStop(1, "#ffbe4700");
    c.fillStyle = gradient;
    c.beginPath(); c.moveTo(0, -radius * .035);
    c.quadraticCurveTo(length * .3, -radius * .009, length, 0);
    c.quadraticCurveTo(length * .3, radius * .009, 0, radius * .035);
    c.fill(); c.restore();
  }
  c.restore();
}
