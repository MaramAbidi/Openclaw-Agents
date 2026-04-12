import { createCanvas } from "canvas";

export function buildStatCard({ value, label, date, site }) {
  const W = 800;
  const H = 400;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#1e3a5f";
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 2;
  ctx.strokeRect(16, 16, W - 32, H - 32);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 28px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("LumiCore - Rapport de Preparation", W / 2, 60);

  ctx.fillStyle = "#f0c040";
  ctx.font = "bold 120px sans-serif";
  ctx.fillText(Number(value).toLocaleString("fr-FR"), W / 2, 240);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 36px sans-serif";
  ctx.fillText(label, W / 2, 295);

  if (site) {
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath();
    ctx.roundRect(W / 2 - 80, 315, 160, 36, 8);
    ctx.fill();
    ctx.fillStyle = "#a8c8ff";
    ctx.font = "18px sans-serif";
    ctx.fillText(`Site : ${site}`, W / 2, 339);
  }

  ctx.fillStyle = "#8ca8c8";
  ctx.font = "16px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(date, 32, H - 24);

  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.font = "italic 16px sans-serif";
  ctx.fillText("LumiCore", W - 32, H - 24);

  return canvas.toBuffer("image/png");
}

export function imageContentFromBuffer(buffer) {
  return {
    type: "image",
    data: buffer.toString("base64"),
    mimeType: "image/png",
  };
}
