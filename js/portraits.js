/* Holo Gambit — original stylized art, drawn entirely with canvas paths.
 *
 * Two exports:
 *   Portraits.draw(ctx, faceType, cx, cy, size, color)  — a commander portrait
 *   Sigils.draw(ctx, sigilType, cx, cy, size, color)     — a commander's grid mark
 *
 * Every glyph and face is an original primitive-drawn shape accented with the
 * commander's colour. No external image, font, or asset is used. Each drawer
 * works in a space centred at (0,0), roughly [-s/2, s/2]. */

const Portraits = (() => {

  function bg(ctx, s, color) {
    const g = ctx.createRadialGradient(0, -s * 0.05, s * 0.1, 0, 0, s * 0.62);
    g.addColorStop(0, 'rgba(255,255,255,0.10)');
    g.addColorStop(0.5, 'rgba(20,26,44,0.9)');
    g.addColorStop(1, 'rgba(6,8,18,1)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = Math.max(1.5, s * 0.02);
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.55;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function glow(ctx, x, y, r, color) {
    ctx.save();
    ctx.shadowBlur = r * 3;
    ctx.shadowColor = color;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // A glowing horizontal visor band, used by several helmets.
  function visor(ctx, s, c, y, w, h) {
    ctx.save();
    ctx.fillStyle = '#0a0e1a';
    ctx.beginPath(); ctx.ellipse(0, y, w, h, 0, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = s * 0.14; ctx.shadowColor = c;
    const g = ctx.createLinearGradient(-w, y, w, y);
    g.addColorStop(0, 'rgba(255,255,255,0.05)');
    g.addColorStop(0.5, c);
    g.addColorStop(1, 'rgba(255,255,255,0.05)');
    ctx.fillStyle = g; ctx.globalAlpha = 0.92;
    ctx.beginPath(); ctx.ellipse(0, y, w * 0.84, h * 0.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  const faces = {
    // Starborn — a clean crested aero-helm with a luminous scanning band
    starborn(ctx, s, c) {
      ctx.fillStyle = '#1c2740';
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.46);
      ctx.quadraticCurveTo(s * 0.34, -s * 0.36, s * 0.3, s * 0.04);
      ctx.quadraticCurveTo(s * 0.26, s * 0.34, 0, s * 0.42);
      ctx.quadraticCurveTo(-s * 0.26, s * 0.34, -s * 0.3, s * 0.04);
      ctx.quadraticCurveTo(-s * 0.34, -s * 0.36, 0, -s * 0.46);
      ctx.fill();
      // luminous crest fin
      ctx.save();
      ctx.shadowBlur = s * 0.14; ctx.shadowColor = c; ctx.fillStyle = c; ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.52); ctx.lineTo(s * 0.05, -s * 0.16);
      ctx.lineTo(-s * 0.05, -s * 0.16); ctx.closePath(); ctx.fill();
      ctx.restore();
      visor(ctx, s, c, s * 0.02, s * 0.24, s * 0.07);
      ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = s * 0.02;   // cheek seam
      ctx.beginPath(); ctx.moveTo(-s * 0.2, s * 0.16); ctx.lineTo(-s * 0.1, s * 0.24); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(s * 0.2, s * 0.16); ctx.lineTo(s * 0.1, s * 0.24); ctx.stroke();
    },
    // Iron Warden — a heavy horned war-helm with a brow ridge and a hard T-visor
    warden(ctx, s, c) {
      ctx.fillStyle = '#2a1414';
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.4);
      ctx.lineTo(s * 0.3, -s * 0.26);
      ctx.lineTo(s * 0.28, s * 0.28);
      ctx.lineTo(0, s * 0.44);
      ctx.lineTo(-s * 0.28, s * 0.28);
      ctx.lineTo(-s * 0.3, -s * 0.26);
      ctx.closePath(); ctx.fill();
      // horns
      ctx.fillStyle = '#4a2020';
      ctx.beginPath(); ctx.moveTo(-s * 0.28, -s * 0.24);
      ctx.quadraticCurveTo(-s * 0.5, -s * 0.4, -s * 0.42, -s * 0.06);
      ctx.quadraticCurveTo(-s * 0.36, -s * 0.2, -s * 0.26, -s * 0.12); ctx.fill();
      ctx.beginPath(); ctx.moveTo(s * 0.28, -s * 0.24);
      ctx.quadraticCurveTo(s * 0.5, -s * 0.4, s * 0.42, -s * 0.06);
      ctx.quadraticCurveTo(s * 0.36, -s * 0.2, s * 0.26, -s * 0.12); ctx.fill();
      // brow ridge
      ctx.fillStyle = '#3a1c1c';
      ctx.beginPath();
      ctx.moveTo(-s * 0.28, -s * 0.08); ctx.quadraticCurveTo(0, -s * 0.22, s * 0.28, -s * 0.08);
      ctx.lineTo(s * 0.26, 0); ctx.quadraticCurveTo(0, -s * 0.14, -s * 0.26, 0); ctx.closePath(); ctx.fill();
      // T visor
      ctx.fillStyle = '#0b0708';
      ctx.beginPath();
      ctx.moveTo(-s * 0.17, s * 0.02); ctx.lineTo(s * 0.17, s * 0.02);
      ctx.lineTo(s * 0.17, s * 0.1); ctx.lineTo(s * 0.05, s * 0.1);
      ctx.lineTo(s * 0.05, s * 0.34); ctx.lineTo(-s * 0.05, s * 0.34);
      ctx.lineTo(-s * 0.05, s * 0.1); ctx.lineTo(-s * 0.17, s * 0.1);
      ctx.closePath(); ctx.fill();
      ctx.save(); ctx.shadowBlur = s * 0.12; ctx.shadowColor = c;
      ctx.fillStyle = c; ctx.fillRect(-s * 0.16, s * 0.03, s * 0.32, s * 0.024); ctx.restore();
    },
    // Tactician — an angular gunnery/strategy droid head with a scanning optic
    tactician(ctx, s, c) {
      ctx.fillStyle = '#cdd1d8';
      ctx.beginPath();
      ctx.moveTo(-s * 0.26, -s * 0.3);
      ctx.lineTo(s * 0.26, -s * 0.3);
      ctx.lineTo(s * 0.32, -s * 0.02);
      ctx.lineTo(s * 0.24, s * 0.32);
      ctx.lineTo(-s * 0.24, s * 0.32);
      ctx.lineTo(-s * 0.32, -s * 0.02);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#8b9099'; ctx.lineWidth = s * 0.02; ctx.stroke();
      ctx.fillStyle = '#0c0e14'; ctx.fillRect(-s * 0.24, -s * 0.12, s * 0.48, s * 0.16);   // optic slot
      ctx.save();
      ctx.shadowBlur = s * 0.14; ctx.shadowColor = c; ctx.fillStyle = c;
      ctx.beginPath(); ctx.arc(s * 0.04, -s * 0.04, s * 0.05, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fillRect(-s * 0.24, -s * 0.12, s * 0.48, s * 0.03);
      ctx.fillStyle = c; ctx.globalAlpha = 0.7;                    // vent lights
      ctx.fillRect(-s * 0.18, s * 0.16, s * 0.36, s * 0.03);
      ctx.fillRect(-s * 0.12, s * 0.23, s * 0.24, s * 0.03);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#9aa0aa'; ctx.lineWidth = s * 0.015;      // antenna
      ctx.beginPath(); ctx.moveTo(-s * 0.16, -s * 0.3); ctx.lineTo(-s * 0.24, -s * 0.44); ctx.stroke();
      glow(ctx, -s * 0.24, -s * 0.44, s * 0.02, c);
    },
    // Sunwarden — a veiled face crowned with a ring of solar rays
    sunwarden(ctx, s, c) {
      // ray crown
      ctx.save();
      ctx.shadowBlur = s * 0.1; ctx.shadowColor = c; ctx.fillStyle = c; ctx.globalAlpha = 0.85;
      for (let i = 0; i < 9; i++) {
        const a = -Math.PI + (i / 8) * Math.PI;
        ctx.save(); ctx.rotate(a);
        ctx.beginPath(); ctx.moveTo(-s * 0.03, -s * 0.34); ctx.lineTo(s * 0.03, -s * 0.34);
        ctx.lineTo(0, -s * 0.5); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      ctx.restore();
      ctx.fillStyle = '#caa06a';                                  // face
      ctx.beginPath(); ctx.ellipse(0, s * 0.06, s * 0.2, s * 0.25, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#a5814d';                                  // veil across the brow
      ctx.beginPath();
      ctx.moveTo(-s * 0.2, -s * 0.02); ctx.quadraticCurveTo(0, -s * 0.16, s * 0.2, -s * 0.02);
      ctx.lineTo(s * 0.2, -s * 0.12); ctx.quadraticCurveTo(0, -s * 0.26, -s * 0.2, -s * 0.12);
      ctx.closePath(); ctx.fill();
      glow(ctx, -s * 0.08, s * 0.04, s * 0.03, c);
      glow(ctx, s * 0.08, s * 0.04, s * 0.03, c);
      ctx.strokeStyle = '#7a5a34'; ctx.lineWidth = s * 0.018; ctx.lineCap = 'round';   // veil folds
      ctx.beginPath(); ctx.moveTo(-s * 0.1, s * 0.2); ctx.lineTo(s * 0.1, s * 0.2); ctx.stroke();
    },
    // Void Serpent — a deep hood with a single narrow serpentine visor slit
    voidsnake(ctx, s, c) {
      ctx.fillStyle = '#241a38';
      ctx.beginPath();
      ctx.moveTo(-s * 0.34, s * 0.44);
      ctx.quadraticCurveTo(-s * 0.46, -s * 0.3, 0, -s * 0.46);
      ctx.quadraticCurveTo(s * 0.46, -s * 0.3, s * 0.34, s * 0.44);
      ctx.quadraticCurveTo(0, s * 0.24, -s * 0.34, s * 0.44);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#150e24';                                  // inner shadow
      ctx.beginPath();
      ctx.moveTo(-s * 0.22, s * 0.3);
      ctx.quadraticCurveTo(-s * 0.3, -s * 0.16, 0, -s * 0.3);
      ctx.quadraticCurveTo(s * 0.3, -s * 0.16, s * 0.22, s * 0.3);
      ctx.quadraticCurveTo(0, s * 0.16, -s * 0.22, s * 0.3);
      ctx.fill();
      // sinuous glowing visor
      ctx.save();
      ctx.shadowBlur = s * 0.16; ctx.shadowColor = c; ctx.strokeStyle = c;
      ctx.lineWidth = s * 0.04; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-s * 0.14, -s * 0.05);
      ctx.quadraticCurveTo(-s * 0.03, s * 0.03, s * 0.02, -s * 0.04);
      ctx.quadraticCurveTo(s * 0.08, -s * 0.08, s * 0.14, -s * 0.01);
      ctx.stroke();
      ctx.restore();
      glow(ctx, s * 0.14, -s * 0.01, s * 0.02, c);
    },
    // Bulwark — a broad rounded guardian helm with a heavy brow and twin eyes
    bulwark(ctx, s, c) {
      ctx.fillStyle = '#20342a';
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.44);
      ctx.quadraticCurveTo(s * 0.4, -s * 0.36, s * 0.36, s * 0.06);
      ctx.quadraticCurveTo(s * 0.3, s * 0.36, 0, s * 0.44);
      ctx.quadraticCurveTo(-s * 0.3, s * 0.36, -s * 0.36, s * 0.06);
      ctx.quadraticCurveTo(-s * 0.4, -s * 0.36, 0, -s * 0.44);
      ctx.fill();
      ctx.fillStyle = '#2c4a3a';                                  // reinforced brow
      ctx.beginPath();
      ctx.moveTo(-s * 0.34, -s * 0.06); ctx.quadraticCurveTo(0, -s * 0.26, s * 0.34, -s * 0.06);
      ctx.lineTo(s * 0.32, s * 0.04); ctx.quadraticCurveTo(0, -s * 0.16, -s * 0.32, s * 0.04);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#0c1810'; ctx.fillRect(-s * 0.22, s * 0.06, s * 0.44, s * 0.12);   // eye slot
      glow(ctx, -s * 0.1, s * 0.12, s * 0.032, c);
      glow(ctx, s * 0.1, s * 0.12, s * 0.032, c);
      ctx.fillStyle = '#18281e';                                  // chin guard
      ctx.beginPath(); ctx.moveTo(-s * 0.1, s * 0.28); ctx.lineTo(s * 0.1, s * 0.28);
      ctx.lineTo(0, s * 0.4); ctx.closePath(); ctx.fill();
    },
    // Duelist — a sleek fencer's mask with a swept crest and mesh cheek
    duelist(ctx, s, c) {
      ctx.fillStyle = '#301322';
      ctx.beginPath();
      ctx.moveTo(-s * 0.1, -s * 0.44);
      ctx.quadraticCurveTo(s * 0.34, -s * 0.4, s * 0.3, s * 0.1);
      ctx.quadraticCurveTo(s * 0.24, s * 0.4, -s * 0.06, s * 0.42);
      ctx.quadraticCurveTo(-s * 0.32, s * 0.4, -s * 0.3, -s * 0.06);
      ctx.quadraticCurveTo(-s * 0.28, -s * 0.4, -s * 0.1, -s * 0.44);
      ctx.closePath(); ctx.fill();
      // swept crest
      ctx.save();
      ctx.shadowBlur = s * 0.12; ctx.shadowColor = c; ctx.strokeStyle = c; ctx.lineWidth = s * 0.05; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-s * 0.12, -s * 0.44);
      ctx.quadraticCurveTo(s * 0.28, -s * 0.5, s * 0.36, -s * 0.16); ctx.stroke();
      ctx.restore();
      // mesh grille lines
      ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = s * 0.012;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath(); ctx.moveTo(-s * 0.16, s * 0.02 + i * s * 0.06); ctx.lineTo(s * 0.14, s * 0.06 + i * s * 0.06); ctx.stroke();
      }
      // angled slit eye
      ctx.save(); ctx.shadowBlur = s * 0.12; ctx.shadowColor = c; ctx.strokeStyle = c;
      ctx.lineWidth = s * 0.04; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-s * 0.16, -s * 0.12); ctx.lineTo(s * 0.02, -s * 0.06); ctx.stroke();
      ctx.restore();
    },
    // Corsair — a rakish flight helm with an angled visor and a trailing scarf
    corsair(ctx, s, c) {
      ctx.fillStyle = '#2a1c12';
      ctx.beginPath();
      ctx.moveTo(-s * 0.3, -s * 0.18);
      ctx.quadraticCurveTo(-s * 0.16, -s * 0.46, s * 0.14, -s * 0.42);
      ctx.quadraticCurveTo(s * 0.36, -s * 0.38, s * 0.32, s * 0.06);
      ctx.quadraticCurveTo(s * 0.28, s * 0.32, 0, s * 0.4);
      ctx.quadraticCurveTo(-s * 0.28, s * 0.34, -s * 0.32, s * 0.02);
      ctx.closePath(); ctx.fill();
      // scarf
      ctx.fillStyle = '#7a3320';
      ctx.beginPath(); ctx.moveTo(s * 0.16, s * 0.24);
      ctx.quadraticCurveTo(s * 0.44, s * 0.3, s * 0.4, s * 0.48);
      ctx.quadraticCurveTo(s * 0.24, s * 0.4, s * 0.1, s * 0.34); ctx.fill();
      ctx.save();
      ctx.translate(0, s * 0.02); ctx.rotate(-0.12);
      visor(ctx, s, c, 0, s * 0.24, s * 0.1);
      ctx.restore();
      ctx.strokeStyle = c; ctx.globalAlpha = 0.7; ctx.lineWidth = s * 0.022;      // helm stripe
      ctx.beginPath(); ctx.moveTo(-s * 0.24, -s * 0.14); ctx.quadraticCurveTo(0, -s * 0.34, s * 0.24, -s * 0.1); ctx.stroke();
      ctx.globalAlpha = 1;
    },
  };

  function draw(ctx, faceType, cx, cy, size, color) {
    ctx.save();
    ctx.translate(cx, cy);
    bg(ctx, size, color);
    (faces[faceType] || faces.starborn)(ctx, size, color);
    ctx.restore();
  }

  return { draw };
})();

/* ---------------------------------------------------------------------------
 * Sigils — each commander's mark on the grid, drawn instead of X and O. Every
 * glyph is an original stylized shape in the commander's colour, with a bright
 * core and a soft glow so it reads as projected light on the holotable.
 * ------------------------------------------------------------------------- */
const Sigils = (() => {

  // Stroke a path already built on ctx, glowing, then a brighter thin core.
  function ignite(ctx, s, c, lw) {
    ctx.save();
    ctx.shadowBlur = s * 0.24; ctx.shadowColor = c;
    ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.stroke();
    ctx.shadowBlur = 0; ctx.globalAlpha = 0.9;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = Math.max(1, lw * 0.34);
    ctx.stroke();
    ctx.restore();
  }
  function fillGlow(ctx, s, c) {
    ctx.save();
    ctx.shadowBlur = s * 0.22; ctx.shadowColor = c;
    ctx.fillStyle = c; ctx.fill();
    ctx.restore();
  }

  const glyphs = {
    // Starbird — an ascending winged star
    starbird(ctx, s, c) {
      const lw = s * 0.06;
      // swept wings
      ctx.beginPath();
      ctx.moveTo(-s * 0.42, s * 0.06);
      ctx.quadraticCurveTo(-s * 0.16, -s * 0.06, 0, -s * 0.34);
      ctx.quadraticCurveTo(s * 0.16, -s * 0.06, s * 0.42, s * 0.06);
      ignite(ctx, s, c, lw);
      // lower body + tail
      ctx.beginPath();
      ctx.moveTo(-s * 0.24, s * 0.1);
      ctx.quadraticCurveTo(0, s * 0.02, 0, s * 0.4);
      ctx.quadraticCurveTo(0, s * 0.02, s * 0.24, s * 0.1);
      ignite(ctx, s, c, lw);
      // star head
      ctx.beginPath(); ctx.arc(0, -s * 0.34, s * 0.06, 0, Math.PI * 2); fillGlow(ctx, s, c);
    },
    // Cog — an angular imperial gear ring
    cog(ctx, s, c) {
      const teeth = 8, ro = s * 0.4, ri = s * 0.3;
      ctx.beginPath();
      for (let i = 0; i < teeth; i++) {
        const a0 = (i / teeth) * Math.PI * 2, a1 = ((i + 0.5) / teeth) * Math.PI * 2;
        const bx = Math.cos(a0) * ro, by = Math.sin(a0) * ro;
        i === 0 ? ctx.moveTo(bx, by) : ctx.lineTo(bx, by);
        ctx.lineTo(Math.cos(a0 + 0.16) * ri, Math.sin(a0 + 0.16) * ri);
        ctx.lineTo(Math.cos(a1) * ri, Math.sin(a1) * ri);
        ctx.lineTo(Math.cos(a1 + 0.02) * ro, Math.sin(a1 + 0.02) * ro);
      }
      ctx.closePath();
      ignite(ctx, s, c, s * 0.05);
      ctx.beginPath(); ctx.arc(0, 0, s * 0.13, 0, Math.PI * 2); ignite(ctx, s, c, s * 0.05);
    },
    // Broken Ring — a ring with a gap and a crossbar
    ring(ctx, s, c) {
      ctx.beginPath(); ctx.arc(0, 0, s * 0.34, Math.PI * 0.16, Math.PI * 1.84);
      ignite(ctx, s, c, s * 0.075);
      ctx.beginPath(); ctx.moveTo(-s * 0.38, -s * 0.34); ctx.lineTo(s * 0.38, s * 0.34);
      ignite(ctx, s, c, s * 0.06);
    },
    // Sunburst — a solar disc with radiating rays
    sunburst(ctx, s, c) {
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * s * 0.24, Math.sin(a) * s * 0.24);
        ctx.lineTo(Math.cos(a) * s * 0.42, Math.sin(a) * s * 0.42);
        ignite(ctx, s, c, s * 0.045);
      }
      ctx.beginPath(); ctx.arc(0, 0, s * 0.16, 0, Math.PI * 2); ignite(ctx, s, c, s * 0.06);
    },
    // Serpent — a coiled S with a head
    serpent(ctx, s, c) {
      ctx.beginPath();
      ctx.moveTo(s * 0.3, -s * 0.32);
      ctx.bezierCurveTo(-s * 0.24, -s * 0.34, s * 0.26, s * 0.04, -s * 0.02, s * 0.06);
      ctx.bezierCurveTo(-s * 0.34, s * 0.08, -s * 0.28, s * 0.36, s * 0.02, s * 0.36);
      ignite(ctx, s, c, s * 0.07);
      // head
      ctx.beginPath(); ctx.arc(s * 0.32, -s * 0.32, s * 0.055, 0, Math.PI * 2); fillGlow(ctx, s, c);
      // tongue
      ctx.beginPath(); ctx.moveTo(s * 0.02, s * 0.36); ctx.lineTo(s * 0.14, s * 0.42);
      ignite(ctx, s, c, s * 0.03);
    },
    // Horned Helm — a helm silhouette with two horns and a visor
    helm(ctx, s, c) {
      ctx.beginPath();
      ctx.moveTo(0, s * 0.38);
      ctx.quadraticCurveTo(-s * 0.3, s * 0.24, -s * 0.28, -s * 0.12);
      ctx.quadraticCurveTo(-s * 0.24, -s * 0.36, 0, -s * 0.34);
      ctx.quadraticCurveTo(s * 0.24, -s * 0.36, s * 0.28, -s * 0.12);
      ctx.quadraticCurveTo(s * 0.3, s * 0.24, 0, s * 0.38);
      ignite(ctx, s, c, s * 0.055);
      // horns
      ctx.beginPath(); ctx.moveTo(-s * 0.26, -s * 0.2);
      ctx.quadraticCurveTo(-s * 0.46, -s * 0.34, -s * 0.4, -s * 0.02); ignite(ctx, s, c, s * 0.05);
      ctx.beginPath(); ctx.moveTo(s * 0.26, -s * 0.2);
      ctx.quadraticCurveTo(s * 0.46, -s * 0.34, s * 0.4, -s * 0.02); ignite(ctx, s, c, s * 0.05);
      // visor
      ctx.beginPath(); ctx.moveTo(-s * 0.16, -s * 0.02); ctx.lineTo(s * 0.16, -s * 0.02);
      ignite(ctx, s, c, s * 0.05);
    },
    // Crossed Sabers — two crossed blades with hilts
    sabers(ctx, s, c) {
      for (const dir of [1, -1]) {
        ctx.save(); ctx.scale(dir, 1);
        // blade
        ctx.beginPath(); ctx.moveTo(-s * 0.3, s * 0.3); ctx.lineTo(s * 0.28, -s * 0.32);
        ignite(ctx, s, c, s * 0.06);
        // hilt
        ctx.beginPath(); ctx.moveTo(-s * 0.3, s * 0.3); ctx.lineTo(-s * 0.4, s * 0.4);
        ctx.save(); ctx.shadowBlur = s * 0.14; ctx.shadowColor = c;
        ctx.strokeStyle = '#c8ccd6'; ctx.lineWidth = s * 0.075; ctx.lineCap = 'round'; ctx.stroke(); ctx.restore();
        ctx.restore();
      }
    },
    // Delta — a triangular starfighter arrowhead
    delta(ctx, s, c) {
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.4);
      ctx.lineTo(s * 0.36, s * 0.34);
      ctx.lineTo(0, s * 0.16);
      ctx.lineTo(-s * 0.36, s * 0.34);
      ctx.closePath();
      ignite(ctx, s, c, s * 0.055);
      // cockpit spine
      ctx.beginPath(); ctx.moveTo(0, -s * 0.16); ctx.lineTo(0, s * 0.08);
      ignite(ctx, s, c, s * 0.04);
    },
  };

  function draw(ctx, sigilType, cx, cy, size, color) {
    ctx.save();
    ctx.translate(cx, cy);
    (glyphs[sigilType] || glyphs.starbird)(ctx, size, color);
    ctx.restore();
  }

  return { draw, glyphs };
})();
