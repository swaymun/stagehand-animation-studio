import {
  activeScene,
  evaluateFrame,
  heldCel,
  type AnimationCel,
  type AnimationTrack,
  type Asset,
  type AudioCue,
  type Character,
  type EvaluatedFrame,
  type MouthShape,
  type SfxCue,
  type SfxRecipe,
  type StagehandProject,
} from './stagehand-model';

export type ImageMap = Map<string, CanvasImageSource>;

export type RenderOptions = {
  selectedTrackId?: string;
  onionSkin?: boolean;
  onionOpacity?: number;
  guides?: boolean;
};

const TAU = Math.PI * 2;

function rounded(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

function seeded(seed: number) {
  let state = Math.max(1, seed | 0);
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function fillCover(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  width: number,
  height: number,
) {
  const sourceWidth =
    image instanceof HTMLImageElement
      ? image.naturalWidth
      : image instanceof HTMLCanvasElement
        ? image.width
        : width;
  const sourceHeight =
    image instanceof HTMLImageElement
      ? image.naturalHeight
      : image instanceof HTMLCanvasElement
        ? image.height
        : height;
  const scale = Math.max(width / sourceWidth, height / sourceHeight);
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;
  ctx.drawImage(
    image,
    (width - drawWidth) / 2,
    (height - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );
}

function drawBrickBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  mode: string,
  palette: EvaluatedFrame['palette'],
) {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(
    0,
    mode.includes('arena') || mode.includes('launch') ? '#172230' : '#dceaf1',
  );
  gradient.addColorStop(
    1,
    mode.includes('arena') || mode.includes('launch') ? '#30485b' : palette[0],
  );
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  const unit = Math.max(22, width / 32);
  ctx.globalAlpha = 0.26;
  ctx.strokeStyle = mode.includes('arena') ? '#7592a4' : '#6f8792';
  ctx.lineWidth = 1;
  for (let y = 0; y < height; y += unit * 0.7) {
    for (
      let x = (Math.round(y / unit) % 2) * (unit / 2);
      x < width;
      x += unit
    ) {
      ctx.strokeRect(x, y, unit, unit * 0.7);
      ctx.beginPath();
      ctx.ellipse(x + unit / 2, y + 4, unit * 0.22, unit * 0.08, 0, 0, TAU);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = mode.includes('launch') ? '#202b34' : '#7c563f';
  ctx.fillRect(0, height * 0.78, width, height * 0.22);
  if (mode.includes('bedroom')) {
    ctx.fillStyle = '#f4d464';
    rounded(ctx, width * 0.12, height * 0.49, width * 0.34, height * 0.2, 8);
    ctx.fill();
    ctx.fillStyle = '#f8f1dd';
    ctx.fillRect(width * 0.13, height * 0.5, width * 0.12, height * 0.08);
    ctx.fillStyle = '#de4b43';
    rounded(ctx, width * 0.72, height * 0.29, width * 0.1, height * 0.16, 9);
    ctx.fill();
    ctx.fillStyle = '#fff4d8';
    ctx.font = `700 ${Math.max(18, width * 0.025)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('03:00', width * 0.77, height * 0.39);
  } else if (mode.includes('lab')) {
    ctx.fillStyle = '#213443';
    rounded(ctx, width * 0.1, height * 0.19, width * 0.35, height * 0.28, 10);
    ctx.fill();
    ctx.fillStyle = '#69d2dd';
    ctx.fillRect(width * 0.12, height * 0.22, width * 0.31, height * 0.19);
    ctx.fillStyle = '#654935';
    ctx.fillRect(width * 0.08, height * 0.66, width * 0.78, height * 0.08);
  } else if (mode.includes('arena')) {
    ctx.strokeStyle = '#ef5d4d';
    ctx.lineWidth = width * 0.006;
    ctx.setLineDash([12, 8]);
    ctx.strokeRect(width * 0.18, height * 0.2, width * 0.64, height * 0.48);
    ctx.setLineDash([]);
    ctx.fillStyle = '#ef5d4d';
    ctx.font = `800 ${Math.max(22, width * 0.035)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('TYPE ERROR', width / 2, height * 0.17);
  } else {
    ctx.fillStyle = '#344d5c';
    ctx.fillRect(width * 0.62, height * 0.18, width * 0.2, height * 0.48);
    ctx.fillStyle = '#77d4df';
    ctx.beginPath();
    ctx.arc(width * 0.72, height * 0.18, width * 0.07, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = '#f3cb4f';
    ctx.lineWidth = width * 0.006;
    ctx.beginPath();
    ctx.moveTo(width * 0.72, height * 0.19);
    ctx.lineTo(width * 0.72, height * 0.02);
    ctx.stroke();
  }
}

function drawOfficeBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  mode: string,
  palette: EvaluatedFrame['palette'],
) {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, mode.includes('frame') ? '#e9dfcf' : '#1d2831');
  gradient.addColorStop(1, mode.includes('frame') ? '#c7d9d5' : '#364451');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  if (mode.includes('scope')) {
    ctx.save();
    ctx.translate(width / 2, height * 0.44);
    const colors = ['#77b7d1', '#cf6845', '#ad77c7', '#f0cf67'];
    for (let index = 0; index < 24; index += 1) {
      const angle = index * 0.62;
      const radius = width * (0.06 + index * 0.012);
      ctx.save();
      ctx.translate(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.52);
      ctx.rotate(angle + 0.4);
      ctx.fillStyle = colors[index % colors.length];
      ctx.globalAlpha = 0.32 + (index % 4) * 0.12;
      rounded(
        ctx,
        -width * 0.035,
        -height * 0.018,
        width * 0.07,
        height * 0.036,
        4,
      );
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  } else {
    ctx.fillStyle = mode.includes('frame') ? '#f8f2e7' : '#111a20';
    rounded(ctx, width * 0.11, height * 0.12, width * 0.27, height * 0.33, 8);
    ctx.fill();
    ctx.fillStyle = mode.includes('frame') ? '#2f7f83' : '#79c7d5';
    ctx.fillRect(width * 0.13, height * 0.15, width * 0.23, height * 0.22);
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = '#eef8f8';
    for (let y = 0; y < 5; y += 1) {
      ctx.fillRect(
        width * 0.15,
        height * (0.18 + y * 0.035),
        width * (0.12 + (y % 2) * 0.06),
        4,
      );
    }
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = mode.includes('frame') ? '#7d6048' : '#141d22';
  ctx.fillRect(0, height * 0.78, width, height * 0.22);
  ctx.fillStyle = mode.includes('frame') ? '#9c7756' : '#725a47';
  ctx.fillRect(width * 0.08, height * 0.67, width * 0.82, height * 0.07);
  if (mode.includes('rig')) {
    ctx.strokeStyle = '#ef5f4b';
    ctx.lineWidth = width * 0.004;
    ctx.setLineDash([7, 6]);
    ctx.strokeRect(width * 0.48, height * 0.2, width * 0.24, height * 0.36);
    ctx.setLineDash([]);
    ctx.fillStyle = '#ef5f4b';
    ctx.font = `800 ${Math.max(16, width * 0.02)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('VALID ✓', width * 0.6, height * 0.27);
  }
  if (mode.includes('launch')) {
    ctx.fillStyle = '#68c3a3';
    rounded(ctx, width * 0.44, height * 0.18, width * 0.34, height * 0.2, 9);
    ctx.fill();
    ctx.fillStyle = '#13362e';
    ctx.font = `800 ${Math.max(18, width * 0.026)}px sans-serif`;
    ctx.fillText('DEPLOYED', width * 0.61, height * 0.3);
  }
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = palette[2];
  ctx.fillRect(0, 0, width, height);
  ctx.globalAlpha = 1;
}

function drawUnderseaBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  mode: string,
  palette: EvaluatedFrame['palette'],
) {
  const water = ctx.createLinearGradient(0, 0, 0, height);
  water.addColorStop(0, '#4ccde2');
  water.addColorStop(0.65, '#79d8df');
  water.addColorStop(1, '#e8cf78');
  ctx.fillStyle = water;
  ctx.fillRect(0, 0, width, height);
  ctx.globalAlpha = 0.16;
  ctx.strokeStyle = '#fdf8d8';
  ctx.lineWidth = width * 0.008;
  for (let i = 0; i < 8; i += 1) {
    ctx.beginPath();
    ctx.arc(
      width * (0.1 + i * 0.13),
      height * (0.12 + (i % 3) * 0.1),
      width * 0.035,
      0,
      TAU,
    );
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#dbbd67';
  ctx.fillRect(0, height * 0.8, width, height * 0.2);
  ctx.fillStyle = '#68ad79';
  for (let i = 0; i < 9; i += 1) {
    ctx.beginPath();
    ctx.ellipse(
      width * (0.05 + i * 0.12),
      height * 0.82,
      width * 0.03,
      height * (0.08 + (i % 2) * 0.03),
      i % 2 ? -0.3 : 0.3,
      0,
      TAU,
    );
    ctx.fill();
  }
  if (mode.includes('bedroom')) {
    ctx.fillStyle = '#f7d168';
    rounded(ctx, width * 0.13, height * 0.51, width * 0.49, height * 0.22, 26);
    ctx.fill();
    ctx.fillStyle = '#fff8df';
    ctx.fillRect(width * 0.15, height * 0.53, width * 0.16, height * 0.09);
    ctx.fillStyle = '#8d61b2';
    ctx.beginPath();
    ctx.arc(width * 0.81, height * 0.49, width * 0.11, 0, TAU);
    ctx.fill();
  } else if (mode.includes('street')) {
    const houses = [
      [0.12, '#f27f97', 0.18],
      [0.37, '#8f6bc2', 0.14],
      [0.71, '#f1c552', 0.2],
    ] as const;
    for (const [x, color, size] of houses) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(
        width * x,
        height * 0.61,
        width * size * 0.45,
        height * size,
        0,
        0,
        TAU,
      );
      ctx.fill();
      ctx.fillStyle = '#dff7f4';
      ctx.beginPath();
      ctx.arc(width * x, height * 0.61, width * 0.022, 0, TAU);
      ctx.fill();
    }
  } else {
    ctx.fillStyle = mode.includes('backroom') ? '#324a58' : '#f4d995';
    rounded(ctx, width * 0.07, height * 0.18, width * 0.86, height * 0.55, 24);
    ctx.fill();
    ctx.fillStyle = mode.includes('backroom') ? '#20313a' : '#8d5c42';
    ctx.fillRect(width * 0.08, height * 0.58, width * 0.84, height * 0.13);
    ctx.strokeStyle = palette[1];
    ctx.lineWidth = width * 0.01;
    ctx.beginPath();
    ctx.arc(width * 0.5, height * 0.28, width * 0.11, Math.PI, 0);
    ctx.stroke();
  }
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  frame: EvaluatedFrame,
  images: ImageMap,
) {
  const image = frame.backgroundAssetId
    ? images.get(frame.backgroundAssetId)
    : undefined;
  if (image) {
    fillCover(ctx, image, width, height);
    return;
  }
  if (frame.background.startsWith('brick-'))
    drawBrickBackground(ctx, width, height, frame.background, frame.palette);
  else if (
    frame.background.includes('office') ||
    frame.background.includes('rig-') ||
    frame.background.includes('scope-') ||
    frame.background.includes('frame-') ||
    frame.background.includes('launch-room')
  )
    drawOfficeBackground(ctx, width, height, frame.background, frame.palette);
  else if (
    frame.background.includes('undersea') ||
    frame.background.includes('diner') ||
    frame.background.includes('coral')
  )
    drawUnderseaBackground(ctx, width, height, frame.background, frame.palette);
  else {
    ctx.fillStyle = '#eef2f0';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#c5cfcc';
    ctx.setLineDash([8, 8]);
    ctx.strokeRect(width * 0.08, height * 0.1, width * 0.84, height * 0.75);
    ctx.setLineDash([]);
  }
}

function poseAmount(drawing: string, token: string) {
  return drawing.includes(token) ? 1 : 0;
}

function drawMouth(
  ctx: CanvasRenderingContext2D,
  shape: MouthShape,
  x: number,
  y: number,
  size: number,
  color = '#201d1e',
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.5, size * 0.08);
  ctx.lineCap = 'round';
  if (shape === 'X' || shape === 'B') {
    ctx.beginPath();
    ctx.moveTo(-size * 0.38, 0);
    ctx.quadraticCurveTo(
      0,
      size * (shape === 'B' ? 0.14 : 0.05),
      size * 0.38,
      0,
    );
    ctx.stroke();
  } else if (shape === 'A') {
    rounded(
      ctx,
      -size * 0.33,
      -size * 0.1,
      size * 0.66,
      size * 0.2,
      size * 0.09,
    );
    ctx.fill();
  } else if (shape === 'E' || shape === 'F') {
    ctx.beginPath();
    ctx.ellipse(
      0,
      0,
      size * (shape === 'F' ? 0.22 : 0.3),
      size * (shape === 'F' ? 0.33 : 0.25),
      0,
      0,
      TAU,
    );
    ctx.fill();
  } else if (shape === 'G') {
    ctx.beginPath();
    ctx.moveTo(-size * 0.34, -size * 0.1);
    ctx.lineTo(size * 0.34, -size * 0.1);
    ctx.lineTo(size * 0.22, size * 0.18);
    ctx.lineTo(-size * 0.26, size * 0.12);
    ctx.closePath();
    ctx.fill();
  } else if (shape === 'H') {
    ctx.beginPath();
    ctx.moveTo(-size * 0.3, -size * 0.05);
    ctx.quadraticCurveTo(0, size * 0.42, size * 0.3, -size * 0.05);
    ctx.stroke();
    ctx.fillStyle = '#e98286';
    ctx.beginPath();
    ctx.ellipse(0, size * 0.2, size * 0.16, size * 0.1, 0, 0, TAU);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.ellipse(
      0,
      0,
      size * 0.38,
      size * (shape === 'D' ? 0.38 : 0.24),
      0,
      0,
      TAU,
    );
    ctx.fill();
    ctx.fillStyle = '#f4d7cf';
    ctx.fillRect(-size * 0.28, -size * 0.19, size * 0.56, size * 0.08);
  }
  ctx.restore();
}

function drawBrickCharacter(
  ctx: CanvasRenderingContext2D,
  character: Character,
  drawing: string,
  mouth: MouthShape,
  tint?: string,
) {
  const primary = tint ?? character.primary;
  const secondary = tint ?? character.secondary;
  const panic = poseAmount(drawing, 'panic') || poseAmount(drawing, 'horror');
  const run = poseAmount(drawing, 'run');
  const victory = poseAmount(drawing, 'victory');
  const crushed = poseAmount(drawing, 'crushed') || poseAmount(drawing, 'duck');
  ctx.strokeStyle = '#282527';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.fillStyle = primary;
  rounded(ctx, -32, crushed ? -58 : -94, 64, 52, 11);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = character.skin ?? '#f2c94c';
  rounded(ctx, -28, crushed ? -88 : -130, 56, 42, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#332722';
  ctx.beginPath();
  ctx.arc(-11, crushed ? -70 : -112, 3.2, 0, TAU);
  ctx.arc(11, crushed ? -70 : -112, 3.2, 0, TAU);
  ctx.fill();
  drawMouth(ctx, mouth, 0, crushed ? -61 : -101, 17);
  ctx.strokeStyle = secondary;
  ctx.lineWidth = 12;
  const armY = crushed ? -45 : -80;
  ctx.beginPath();
  ctx.moveTo(-28, armY);
  ctx.lineTo(-48, armY + (victory || panic ? -28 : run ? 18 : 28));
  ctx.moveTo(28, armY);
  ctx.lineTo(48, armY + (victory || panic ? -28 : run ? -16 : 28));
  ctx.stroke();
  ctx.strokeStyle = '#25313d';
  ctx.lineWidth = 13;
  ctx.beginPath();
  ctx.moveTo(-15, crushed ? -8 : -42);
  ctx.lineTo(-22 + (run ? -18 : 0), 0);
  ctx.moveTo(15, crushed ? -8 : -42);
  ctx.lineTo(22 + (run ? 18 : 0), 0);
  ctx.stroke();
  if (panic) {
    ctx.strokeStyle = '#282527';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, crushed ? -102 : -145, 16, Math.PI * 0.2, Math.PI * 0.8);
    ctx.stroke();
  }
}

function drawBugCharacter(
  ctx: CanvasRenderingContext2D,
  character: Character,
  drawing: string,
  mouth: MouthShape,
  tint?: string,
) {
  if (drawing === 'single-brick') {
    ctx.fillStyle = tint ?? character.primary;
    rounded(ctx, -28, -20, 56, 32, 5);
    ctx.fill();
    ctx.fillStyle = '#ffab9d';
    ctx.beginPath();
    ctx.ellipse(-14, -20, 8, 4, 0, 0, TAU);
    ctx.ellipse(14, -20, 8, 4, 0, 0, TAU);
    ctx.fill();
    return;
  }
  const exploded = drawing === 'explode';
  ctx.fillStyle = tint ?? character.primary;
  ctx.strokeStyle = tint ?? '#451b22';
  ctx.lineWidth = 5;
  for (let index = 0; index < 7; index += 1) {
    const angle = index * 0.9;
    const radius = exploded ? 28 + index * 5 : 8 + index * 2;
    const x = Math.cos(angle) * radius;
    const y = -70 + Math.sin(angle) * radius;
    rounded(ctx, x - 22, y - 17, 44, 34, 6);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = '#1d1820';
  ctx.beginPath();
  ctx.arc(-16, -92, 5, 0, TAU);
  ctx.arc(16, -92, 5, 0, TAU);
  ctx.fill();
  drawMouth(ctx, mouth, 0, -70, 22);
}

function drawBird(
  ctx: CanvasRenderingContext2D,
  character: Character,
  drawing: string,
  mouth: MouthShape,
  tint?: string,
) {
  const primary = tint ?? character.primary;
  const secondary = tint ?? character.secondary;
  const high = drawing.includes('idea') || drawing.includes('high-five');
  const low = drawing.includes('buried');
  ctx.strokeStyle = '#252b2f';
  ctx.lineWidth = 5;
  ctx.fillStyle = primary;
  ctx.beginPath();
  ctx.ellipse(0, low ? -45 : -72, 34, low ? 35 : 52, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, low ? -84 : -126, 33, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = secondary;
  ctx.beginPath();
  ctx.moveTo(-5, low ? -83 : -125);
  ctx.lineTo(42, low ? -73 : -115);
  ctx.lineTo(-4, low ? -67 : -109);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#20252a';
  ctx.beginPath();
  ctx.arc(-10, low ? -92 : -134, 3.5, 0, TAU);
  ctx.fill();
  drawMouth(ctx, mouth, 16, low ? -79 : -121, 15);
  ctx.strokeStyle = primary;
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(-25, low ? -58 : -82);
  ctx.lineTo(-52, high ? -116 : low ? -30 : -45);
  ctx.moveTo(25, low ? -58 : -82);
  ctx.lineTo(52, high ? -116 : low ? -30 : -45);
  ctx.stroke();
  ctx.strokeStyle = '#c5aa73';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(-12, low ? -15 : -25);
  ctx.lineTo(-18, 0);
  ctx.moveTo(12, low ? -15 : -25);
  ctx.lineTo(18, 0);
  ctx.stroke();
}

function drawPanda(
  ctx: CanvasRenderingContext2D,
  character: Character,
  drawing: string,
  mouth: MouthShape,
  tint?: string,
) {
  const primary = tint ?? character.primary;
  const secondary = tint ?? character.secondary;
  const high =
    drawing.includes('point') ||
    drawing.includes('high-five') ||
    drawing.includes('delighted');
  ctx.strokeStyle = '#2b2828';
  ctx.lineWidth = 5;
  ctx.fillStyle = primary;
  ctx.beginPath();
  ctx.ellipse(0, -67, 38, 54, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, -123, 37, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(-25, -150, 12, 0, TAU);
  ctx.arc(25, -150, 12, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = secondary;
  ctx.beginPath();
  ctx.ellipse(0, -116, 23, 19, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#242021';
  ctx.beginPath();
  ctx.arc(-13, -130, 4, 0, TAU);
  ctx.arc(13, -130, 4, 0, TAU);
  ctx.fill();
  drawMouth(ctx, mouth, 0, -112, 17);
  ctx.strokeStyle = primary;
  ctx.lineWidth = 15;
  ctx.beginPath();
  ctx.moveTo(-28, -80);
  ctx.lineTo(-52, high ? -118 : -45);
  ctx.moveTo(28, -80);
  ctx.lineTo(52, high ? -118 : -45);
  ctx.stroke();
  ctx.strokeStyle = primary;
  ctx.lineWidth = 20;
  ctx.beginPath();
  ctx.arc(37, -48, 43, -1.2, 1.1);
  ctx.stroke();
}

function drawClock(
  ctx: CanvasRenderingContext2D,
  character: Character,
  drawing: string,
  mouth: MouthShape,
  tint?: string,
) {
  ctx.fillStyle = tint ?? character.primary;
  ctx.strokeStyle = '#26282a';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(0, -82, 49, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fbf6df';
  ctx.beginPath();
  ctx.arc(0, -82, 38, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#26282a';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, -82);
  ctx.lineTo(drawing.includes('smile') ? 18 : -7, -103);
  ctx.moveTo(0, -82);
  ctx.lineTo(23, -73);
  ctx.stroke();
  drawMouth(ctx, mouth, 0, -61, 14);
  ctx.strokeStyle = tint ?? character.primary;
  ctx.lineWidth = 15;
  ctx.beginPath();
  ctx.moveTo(-26, -42);
  ctx.lineTo(-38, 0);
  ctx.moveTo(26, -42);
  ctx.lineTo(38, 0);
  ctx.stroke();
}

function drawHumanCutout(
  ctx: CanvasRenderingContext2D,
  character: Character,
  drawing: string,
  mouth: MouthShape,
  tint?: string,
) {
  const skin = tint ?? character.skin ?? '#9a6449';
  const lean =
    drawing.includes('walk') ||
    drawing.includes('search') ||
    drawing.includes('bite');
  const high =
    drawing.includes('sit') ||
    drawing.includes('present') ||
    drawing.includes('bliss');
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 17;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, high ? -155 : -144);
  ctx.lineTo(lean ? 7 : 0, -88);
  ctx.lineTo(-29, -39);
  ctx.moveTo(lean ? 7 : 0, -88);
  ctx.lineTo(34, -39);
  ctx.moveTo(0, -91);
  ctx.lineTo(-17, 0);
  ctx.moveTo(0, -91);
  ctx.lineTo(21, 0);
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(0, high ? -164 : -153, 43, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = character.secondary;
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(0, high ? -151 : -139);
  ctx.lineTo(lean ? 7 : 0, -88);
  ctx.lineTo(-29, -39);
  ctx.moveTo(lean ? 7 : 0, -88);
  ctx.lineTo(34, -39);
  ctx.moveTo(0, -91);
  ctx.lineTo(-17, 0);
  ctx.moveTo(0, -91);
  ctx.lineTo(21, 0);
  ctx.stroke();
  const face = ctx.createRadialGradient(
    -12,
    high ? -176 : -165,
    5,
    0,
    high ? -164 : -153,
    42,
  );
  face.addColorStop(0, '#d5a17f');
  face.addColorStop(1, skin);
  ctx.fillStyle = face;
  ctx.beginPath();
  ctx.arc(0, high ? -164 : -153, 36, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#332923';
  ctx.beginPath();
  ctx.arc(-12, high ? -170 : -159, 3, 0, TAU);
  ctx.arc(12, high ? -170 : -159, 3, 0, TAU);
  ctx.fill();
  drawMouth(ctx, mouth, 0, high ? -150 : -139, 18);
  ctx.fillStyle = '#2b211d';
  ctx.beginPath();
  ctx.arc(0, high ? -181 : -170, 31, Math.PI, TAU);
  ctx.fill();
}

function drawCashier(
  ctx: CanvasRenderingContext2D,
  character: Character,
  drawing: string,
  mouth: MouthShape,
  tint?: string,
) {
  const primary = tint ?? character.primary;
  ctx.fillStyle = primary;
  ctx.strokeStyle = '#6c3652';
  ctx.lineWidth = 5;
  ctx.beginPath();
  for (let index = 0; index < 8; index += 1) {
    const angle = index * (TAU / 8) - Math.PI / 2;
    const radius = index % 2 ? 47 : 62;
    const x = Math.cos(angle) * radius;
    const y = -88 + Math.sin(angle) * radius;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#f4d36e';
  rounded(ctx, -37, -58, 74, 62, 18);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#2b2530';
  ctx.beginPath();
  ctx.arc(-13, -98, 4, 0, TAU);
  ctx.arc(13, -98, 4, 0, TAU);
  ctx.fill();
  drawMouth(ctx, mouth, 0, -79, 19);
  if (drawing.includes('delighted') || drawing.includes('proud')) {
    ctx.strokeStyle = '#fff5c9';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, -78, 24, 0.18, Math.PI - 0.18);
    ctx.stroke();
  }
}

function drawCharacter(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  character: Character,
  celValue: AnimationCel,
  mouth: MouthShape,
  images: ImageMap,
  tint?: string,
) {
  const image = celValue.assetId ? images.get(celValue.assetId) : undefined;
  const { transform } = celValue;
  ctx.save();
  ctx.translate((transform.x / 100) * width, (transform.y / 100) * height);
  ctx.rotate((transform.rotation * Math.PI) / 180);
  ctx.scale(
    transform.flipX ? -transform.scale : transform.scale,
    transform.scale,
  );
  ctx.globalAlpha *= transform.opacity;
  if (image) {
    const sourceWidth =
      image instanceof HTMLImageElement ? image.naturalWidth : 512;
    const sourceHeight =
      image instanceof HTMLImageElement ? image.naturalHeight : 512;
    const mouthFrame: Partial<Record<MouthShape, number>> = {
      A: 1,
      B: 1,
      C: 1,
      D: 2,
      E: 3,
      F: 3,
      G: 2,
      H: 1,
    };
    const assetFrame = mouthFrame[mouth] ?? celValue.assetFrame;
    const columns = assetFrame === undefined ? 1 : 4;
    const sourceCellWidth = sourceWidth / columns;
    const sourceX =
      Math.max(0, Math.min(columns - 1, assetFrame ?? 0)) * sourceCellWidth;
    const drawHeight = height * 0.46;
    const drawWidth = drawHeight * (sourceCellWidth / sourceHeight);
    ctx.filter = tint
      ? tint === '#db4b58'
        ? 'sepia(1) saturate(8) hue-rotate(320deg)'
        : 'sepia(1) saturate(7) hue-rotate(75deg)'
      : 'none';
    ctx.drawImage(
      image,
      sourceX,
      0,
      sourceCellWidth,
      sourceHeight,
      -drawWidth / 2,
      -drawHeight,
      drawWidth,
      drawHeight,
    );
    ctx.filter = 'none';
  } else {
    const baseScale = Math.min(width / 960, height / 540);
    ctx.scale(baseScale, baseScale);
    switch (character.design) {
      case 'brick-coder':
        drawBrickCharacter(ctx, character, celValue.drawing, mouth, tint);
        break;
      case 'brick-bug':
        drawBugCharacter(ctx, character, celValue.drawing, mouth, tint);
        break;
      case 'night-heron':
        drawBird(ctx, character, celValue.drawing, mouth, tint);
        break;
      case 'red-panda':
        drawPanda(ctx, character, celValue.drawing, mouth, tint);
        break;
      case 'clock-boss':
        drawClock(ctx, character, celValue.drawing, mouth, tint);
        break;
      case 'coral-cashier':
        drawCashier(ctx, character, celValue.drawing, mouth, tint);
        break;
      default:
        drawHumanCutout(ctx, character, celValue.drawing, mouth, tint);
    }
  }
  ctx.restore();
}

function drawProp(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  trackValue: AnimationTrack,
  celValue: AnimationCel,
  images: ImageMap,
  tint?: string,
) {
  const image = celValue.assetId ? images.get(celValue.assetId) : undefined;
  const { transform } = celValue;
  ctx.save();
  ctx.translate((transform.x / 100) * width, (transform.y / 100) * height);
  ctx.rotate((transform.rotation * Math.PI) / 180);
  ctx.scale(
    transform.flipX ? -transform.scale : transform.scale,
    transform.scale,
  );
  ctx.globalAlpha *= transform.opacity;
  if (image) {
    const sourceWidth =
      image instanceof HTMLImageElement ? image.naturalWidth : 512;
    const sourceHeight =
      image instanceof HTMLImageElement ? image.naturalHeight : 512;
    const drawHeight = height * 0.3;
    const drawWidth = drawHeight * (sourceWidth / sourceHeight);
    ctx.drawImage(
      image,
      -drawWidth / 2,
      -drawHeight / 2,
      drawWidth,
      drawHeight,
    );
    ctx.restore();
    return;
  }
  const scale = Math.min(width / 960, height / 540);
  ctx.scale(scale, scale);
  ctx.strokeStyle = tint ?? '#2a2b2d';
  ctx.lineWidth = 4;
  const drawing = celValue.drawing;
  if (trackValue.targetId === 'feature-stack') {
    const count =
      drawing === 'one-brick'
        ? 1
        : drawing === 'three-bricks'
          ? 3
          : drawing === 'six-bricks'
            ? 6
            : 9;
    const colors = ['#e84c3d', '#f2c94c', '#3568b8', '#63b88e'];
    for (let i = 0; i < count; i += 1) {
      ctx.fillStyle = tint ?? colors[i % colors.length];
      rounded(ctx, -45 + (i % 2) * 8, -18 - i * 22, 90, 24, 4);
      ctx.fill();
      ctx.stroke();
    }
  } else if (trackValue.targetId === 'feature-rocket') {
    ctx.fillStyle = tint ?? '#79d2df';
    rounded(ctx, -29, -86, 58, 118, 25);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#f2c94c';
    ctx.beginPath();
    ctx.moveTo(-18, 32);
    ctx.lineTo(0, 86);
    ctx.lineTo(18, 32);
    ctx.fill();
  } else if (trackValue.targetId === 'detached-limb') {
    ctx.strokeStyle = tint ?? '#3b6f95';
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.moveTo(-35, 0);
    ctx.lineTo(34, 0);
    ctx.stroke();
    ctx.fillStyle = tint ?? '#d8e9ef';
    ctx.beginPath();
    ctx.arc(42, 0, 13, 0, TAU);
    ctx.fill();
  } else if (trackValue.targetId === 'tool-cards') {
    const count = drawing === 'eight' ? 4 : drawing === 'twenty' ? 8 : 14;
    const random = seeded(count * 19);
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * TAU;
      const radius = 50 + random() * 85;
      ctx.save();
      ctx.translate(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.55);
      ctx.rotate(angle + 0.5);
      ctx.fillStyle = tint ?? ['#77b7d1', '#cf6845', '#ad77c7'][i % 3];
      rounded(ctx, -32, -13, 64, 26, 4);
      ctx.fill();
      ctx.restore();
    }
  } else if (trackValue.targetId === 'jellyfish') {
    ctx.fillStyle = tint ?? '#ff8ca2';
    ctx.beginPath();
    ctx.arc(0, -12, 36, Math.PI, 0);
    ctx.lineTo(36, 10);
    ctx.quadraticCurveTo(20, 30, 4, 10);
    ctx.quadraticCurveTo(-15, 34, -36, 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = tint ?? '#874b88';
    ctx.lineWidth = 5;
    for (const x of [-20, 0, 20]) {
      ctx.beginPath();
      ctx.moveTo(x, 8);
      ctx.quadraticCurveTo(x + 13, 35, x - 4, 58);
      ctx.stroke();
    }
  } else if (trackValue.targetId === 'wallet') {
    ctx.fillStyle = tint ?? '#23508b';
    rounded(ctx, -48, -34, 96, 68, 9);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#f1cf56';
    ctx.fillRect(-34, -20, 68, 25);
    ctx.fillStyle = '#1e3960';
    ctx.font = '800 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(drawing === 'empty' ? '0 CLAMS' : 'METRO', 0, -3);
  } else if (trackValue.targetId === 'menu-board') {
    ctx.fillStyle = tint ?? '#f5d36e';
    rounded(ctx, -55, -64, 110, 128, 12);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#8a5d3b';
    ctx.lineWidth = 6;
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.moveTo(-34, -34 + i * 30);
      ctx.lineTo(34, -34 + i * 30);
      ctx.stroke();
    }
  } else if (trackValue.targetId === 'krabby-patty') {
    ctx.fillStyle = tint ?? '#e6a743';
    ctx.beginPath();
    ctx.ellipse(0, -25, 52, 23, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#5b8e4a';
    ctx.fillRect(-49, -13, 98, 10);
    ctx.fillStyle = '#733d2e';
    rounded(ctx, -47, -4, 94, 20, 8);
    ctx.fill();
    ctx.fillStyle = '#e6a743';
    ctx.beginPath();
    ctx.ellipse(0, 17, 50, 18, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawOnionSkin(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  project: StagehandProject,
  frameValue: EvaluatedFrame,
  images: ImageMap,
  options: RenderOptions,
) {
  if (!options.onionSkin || !options.selectedTrackId) return;
  const scene = project.scenes.find((item) => item.id === frameValue.sceneId);
  const selectedTrack = scene?.tracks.find(
    (item) => item.id === options.selectedTrackId,
  );
  if (!scene || !selectedTrack || selectedTrack.kind === 'camera') return;
  const current = heldCel(selectedTrack, frameValue.frame);
  const currentIndex = current
    ? selectedTrack.cels.findIndex((item) => item.id === current.id)
    : -1;
  const neighbors = [
    {
      cel: currentIndex > 0 ? selectedTrack.cels[currentIndex - 1] : null,
      tint: '#db4b58',
    },
    {
      cel:
        currentIndex >= 0
          ? (selectedTrack.cels[currentIndex + 1] ?? null)
          : (selectedTrack.cels[0] ?? null),
      tint: '#36a96a',
    },
  ];
  ctx.save();
  ctx.globalAlpha = options.onionOpacity ?? 0.22;
  for (const neighbor of neighbors) {
    if (!neighbor.cel) continue;
    if (selectedTrack.kind === 'character') {
      const character = scene.characters.find(
        (item) => item.id === selectedTrack.targetId,
      );
      if (character)
        drawCharacter(
          ctx,
          width,
          height,
          character,
          neighbor.cel,
          'X',
          images,
          neighbor.tint,
        );
    } else {
      drawProp(
        ctx,
        width,
        height,
        selectedTrack,
        neighbor.cel,
        images,
        neighbor.tint,
      );
    }
  }
  ctx.restore();
}

function drawCaption(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  frame: EvaluatedFrame,
) {
  if (!frame.caption) return;
  const maxWidth = width * 0.74;
  const boxHeight = Math.max(68, height * 0.12);
  const x = (width - maxWidth) / 2;
  const y = height - boxHeight - height * 0.055;
  ctx.fillStyle = 'rgba(30, 31, 33, 0.92)';
  rounded(ctx, x, y, maxWidth, boxHeight, Math.max(8, width * 0.009));
  ctx.fill();
  ctx.fillStyle = frame.palette[2];
  ctx.fillRect(
    x,
    y + boxHeight - Math.max(4, height * 0.007),
    maxWidth,
    Math.max(4, height * 0.007),
  );
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = frame.palette[1];
  ctx.font = `800 ${Math.max(13, width * 0.014)}px sans-serif`;
  const speakerWidth = Math.min(
    maxWidth * 0.24,
    ctx.measureText(frame.caption.speaker.toUpperCase()).width + width * 0.028,
  );
  ctx.fillText(
    frame.caption.speaker.toUpperCase(),
    x + width * 0.02,
    y + boxHeight / 2,
  );
  ctx.fillStyle = '#fffaf1';
  ctx.font = `700 ${Math.max(16, width * 0.019)}px sans-serif`;
  const text = frame.caption.text;
  const available = maxWidth - speakerWidth - width * 0.04;
  if (ctx.measureText(text).width <= available) {
    ctx.fillText(text, x + speakerWidth, y + boxHeight / 2);
  } else {
    const words = text.split(' ');
    let first = '';
    let second = '';
    for (const word of words) {
      if (!second && ctx.measureText(`${first} ${word}`).width < available)
        first += `${first ? ' ' : ''}${word}`;
      else second += `${second ? ' ' : ''}${word}`;
    }
    ctx.fillText(first, x + speakerWidth, y + boxHeight * 0.38);
    ctx.fillText(second, x + speakerWidth, y + boxHeight * 0.67);
  }
}

export function drawStagehandFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  project: StagehandProject,
  frameValue = evaluateFrame(project),
  images: ImageMap = new Map(),
  options: RenderOptions = {},
) {
  ctx.save();
  ctx.clearRect(0, 0, width, height);
  drawBackground(ctx, width, height, frameValue, images);
  const camera = frameValue.camera?.transform;
  if (camera) {
    ctx.translate(width / 2, height / 2);
    ctx.rotate((camera.rotation * Math.PI) / 180);
    ctx.scale(camera.scale, camera.scale);
    ctx.translate(
      -width / 2 + (camera.x / 100) * width,
      -height / 2 + (camera.y / 100) * height,
    );
  }
  drawOnionSkin(ctx, width, height, project, frameValue, images, options);
  for (const item of frameValue.props) {
    if (item.cel) drawProp(ctx, width, height, item.track, item.cel, images);
  }
  for (const item of frameValue.characters) {
    if (item.cel)
      drawCharacter(
        ctx,
        width,
        height,
        item.character,
        item.cel,
        item.mouth,
        images,
      );
  }
  ctx.restore();
  drawCaption(ctx, width, height, frameValue);
  if (options.guides) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,.48)';
    ctx.lineWidth = 1;
    ctx.setLineDash([7, 7]);
    ctx.strokeRect(width * 0.06, height * 0.06, width * 0.88, height * 0.82);
    ctx.setLineDash([]);
    ctx.restore();
  }
}

export async function buildImageMap(assets: Asset[]): Promise<ImageMap> {
  const map: ImageMap = new Map();
  if (typeof Image === 'undefined') return map;
  await Promise.all(
    assets
      .filter((asset) => asset.dataUrl && asset.kind !== 'audio')
      .map(
        (asset) =>
          new Promise<void>((resolve) => {
            const image = new Image();
            image.onload = () => {
              map.set(asset.id, image);
              resolve();
            };
            image.onerror = () => resolve();
            image.src = asset.dataUrl ?? '';
          }),
      ),
  );
  return map;
}

function noiseBuffer(context: AudioContext, seconds: number, seed: number) {
  const frames = Math.max(1, Math.ceil(context.sampleRate * seconds));
  const buffer = context.createBuffer(1, frames, context.sampleRate);
  const data = buffer.getChannelData(0);
  const random = seeded(seed);
  for (let index = 0; index < frames; index += 1)
    data[index] = random() * 2 - 1;
  return buffer;
}

function connectEnvelope(
  context: AudioContext,
  target: AudioNode,
  at: number,
  duration: number,
  volume: number,
) {
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(
    Math.max(0.0002, volume),
    at + Math.min(0.015, duration * 0.1),
  );
  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    at + Math.max(0.025, duration),
  );
  gain.connect(target);
  return gain;
}

export function synthesizeSfx(
  context: AudioContext,
  target: AudioNode,
  recipe: SfxRecipe,
  at: number,
  duration: number,
  volume: number,
  seed: number,
) {
  const safeDuration = Math.max(0.04, Math.min(4, duration));
  if (
    recipe === 'keyboard' ||
    recipe === 'brick-pop' ||
    recipe === 'cash-register'
  ) {
    const count =
      recipe === 'keyboard'
        ? Math.max(2, Math.round(safeDuration * 9))
        : recipe === 'brick-pop'
          ? 3
          : 2;
    for (let index = 0; index < count; index += 1) {
      const oscillator = context.createOscillator();
      oscillator.type = recipe === 'cash-register' ? 'sine' : 'square';
      const start = at + (index / count) * safeDuration;
      oscillator.frequency.setValueAtTime(
        recipe === 'cash-register'
          ? 880 + index * 360
          : 170 + ((seed + index * 71) % 220),
        start,
      );
      const envelope = connectEnvelope(
        context,
        target,
        start,
        Math.min(0.12, safeDuration / count),
        volume * 0.35,
      );
      oscillator.connect(envelope);
      oscillator.start(start);
      oscillator.stop(start + Math.min(0.14, safeDuration / count));
    }
    return;
  }
  if (recipe === 'whoosh' || recipe === 'splash' || recipe === 'portal') {
    const source = context.createBufferSource();
    source.buffer = noiseBuffer(context, safeDuration, seed);
    const filter = context.createBiquadFilter();
    filter.type = recipe === 'splash' ? 'bandpass' : 'lowpass';
    filter.frequency.setValueAtTime(recipe === 'splash' ? 1100 : 320, at);
    filter.frequency.exponentialRampToValueAtTime(
      recipe === 'portal' ? 2400 : 1900,
      at + safeDuration,
    );
    const envelope = connectEnvelope(
      context,
      target,
      at,
      safeDuration,
      volume * 0.62,
    );
    source.connect(filter);
    filter.connect(envelope);
    source.start(at);
    source.stop(at + safeDuration);
    return;
  }
  const oscillator = context.createOscillator();
  oscillator.type =
    recipe === 'error-zap'
      ? 'sawtooth'
      : recipe === 'alarm'
        ? 'square'
        : 'sine';
  const startFrequency =
    recipe === 'success'
      ? 440
      : recipe === 'jelly-bloop'
        ? 190
        : recipe === 'error-zap'
          ? 680
          : 520;
  oscillator.frequency.setValueAtTime(startFrequency, at);
  oscillator.frequency.exponentialRampToValueAtTime(
    recipe === 'success'
      ? 1040
      : recipe === 'jelly-bloop'
        ? 110
        : recipe === 'error-zap'
          ? 90
          : 780,
    at + safeDuration,
  );
  const envelope = connectEnvelope(
    context,
    target,
    at,
    safeDuration,
    volume * 0.45,
  );
  oscillator.connect(envelope);
  oscillator.start(at);
  oscillator.stop(at + safeDuration);
}

let liveContext: AudioContext | null = null;

export function playSfxNow(cue: SfxCue, fps: number) {
  if (typeof window === 'undefined') return;
  liveContext ??= new AudioContext();
  void liveContext.resume();
  synthesizeSfx(
    liveContext,
    liveContext.destination,
    cue.recipe,
    liveContext.currentTime + 0.01,
    Math.max(0.08, (cue.endFrame - cue.startFrame) / fps),
    cue.volume,
    cue.seed,
  );
}

export function scheduleProjectSfx(
  context: AudioContext,
  target: AudioNode,
  project: StagehandProject,
  startAt: number,
) {
  let frameOffset = 0;
  for (const scene of project.scenes) {
    for (const cue of scene.sfx) {
      synthesizeSfx(
        context,
        target,
        cue.recipe,
        startAt + (frameOffset + cue.startFrame) / project.fps,
        Math.max(0.08, (cue.endFrame - cue.startFrame) / project.fps),
        cue.volume,
        cue.seed,
      );
    }
    frameOffset += scene.frameCount;
  }
}

async function decodeAssetAudio(context: AudioContext, asset: Asset) {
  if (!asset.dataUrl) return null;
  try {
    const response = await fetch(asset.dataUrl);
    if (!response.ok) return null;
    return await context.decodeAudioData(await response.arrayBuffer());
  } catch {
    return null;
  }
}

export async function scheduleProjectAudio(
  context: AudioContext,
  target: AudioNode,
  project: StagehandProject,
  startAt: number,
) {
  const buffers = new Map<string, AudioBuffer>();
  let scheduled = 0;
  let frameOffset = 0;
  for (const scene of project.scenes) {
    for (const cue of scene.audio) {
      const asset = project.assets.find(
        (item) => item.id === cue.assetId && item.kind === 'audio',
      );
      if (!asset?.dataUrl) continue;
      let buffer = buffers.get(asset.id);
      if (!buffer) {
        buffer = (await decodeAssetAudio(context, asset)) ?? undefined;
        if (buffer) buffers.set(asset.id, buffer);
      }
      if (!buffer) continue;
      const source = context.createBufferSource();
      const gain = context.createGain();
      const at = startAt + (frameOffset + cue.startFrame) / project.fps;
      const cueDuration = Math.max(
        1 / project.fps,
        (cue.endFrame - cue.startFrame) / project.fps,
      );
      source.buffer = buffer;
      source.loop = cue.kind === 'music' && buffer.duration < cueDuration;
      gain.gain.setValueAtTime(Math.max(0, Math.min(1, cue.volume)), at);
      source.connect(gain);
      gain.connect(target);
      source.start(at);
      source.stop(
        at + Math.min(cueDuration, source.loop ? cueDuration : buffer.duration),
      );
      scheduled += 1;
    }
    frameOffset += scene.frameCount;
  }
  return scheduled;
}

export async function playAudioCueNow(asset: Asset | undefined, cue: AudioCue) {
  if (typeof window === 'undefined' || !asset?.dataUrl) return false;
  liveContext ??= new AudioContext();
  await liveContext.resume();
  const buffer = await decodeAssetAudio(liveContext, asset);
  if (!buffer) return false;
  const source = liveContext.createBufferSource();
  const gain = liveContext.createGain();
  source.buffer = buffer;
  gain.gain.value = Math.max(0, Math.min(1, cue.volume));
  source.connect(gain);
  gain.connect(liveContext.destination);
  source.start();
  return true;
}

export function adjacentDrawings(
  project: StagehandProject,
  trackId: string | undefined,
  frame: number,
) {
  const trackValue = activeScene(project).tracks.find(
    (item) => item.id === trackId,
  );
  if (!trackValue) return { previous: null, current: null, next: null };
  const current = heldCel(trackValue, frame);
  const index = current
    ? trackValue.cels.findIndex((item) => item.id === current.id)
    : -1;
  return {
    previous: index > 0 ? trackValue.cels[index - 1] : null,
    current,
    next:
      index >= 0
        ? (trackValue.cels[index + 1] ?? null)
        : (trackValue.cels[0] ?? null),
  };
}
