const OUTPUT_SIZE = 1080;

const templates = {
  clean: {
    background: "#f8faf8",
    shelf: "#e4ebe6",
    text: "#14221d",
    muted: "#607169",
    badge: "#1f7a5f",
    badgeText: "#ffffff"
  },
  warm: {
    background: "#fbf6ed",
    shelf: "#ead7bd",
    text: "#2a2118",
    muted: "#735f49",
    badge: "#b96f24",
    badgeText: "#ffffff"
  },
  graphite: {
    background: "#1d2328",
    shelf: "#343d43",
    text: "#f4f7f5",
    muted: "#c0cac5",
    badge: "#f0b84a",
    badgeText: "#1d2328"
  },
  blue: {
    background: "#eef7f8",
    shelf: "#c9e3e8",
    text: "#132f38",
    muted: "#526b72",
    badge: "#23708b",
    badgeText: "#ffffff"
  }
};

const state = {
  items: [],
  outputs: []
};

const fileInput = document.querySelector("#fileInput");
const dropzone = document.querySelector("#dropzone");
const itemsList = document.querySelector("#itemsList");
const outputGrid = document.querySelector("#outputGrid");
const photoCount = document.querySelector("#photoCount");
const defaultLocation = document.querySelector("#defaultLocation");
const defaultTag = document.querySelector("#defaultTag");
const pricePrefix = document.querySelector("#pricePrefix");
const defaultBulkQty = document.querySelector("#defaultBulkQty");
const defaultBulkPrice = document.querySelector("#defaultBulkPrice");
const templateSelect = document.querySelector("#templateSelect");
const generateBtn = document.querySelector("#generateBtn");
const downloadZipBtn = document.querySelector("#downloadZipBtn");
const applyDealBtn = document.querySelector("#applyDealBtn");
const clearBtn = document.querySelector("#clearBtn");
const itemTemplate = document.querySelector("#itemTemplate");

fileInput.addEventListener("change", () => addFiles(fileInput.files));

dropzone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropzone.classList.add("dragging");
});

dropzone.addEventListener("dragleave", () => {
  dropzone.classList.remove("dragging");
});

dropzone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropzone.classList.remove("dragging");
  addFiles(event.dataTransfer.files);
});

generateBtn.addEventListener("click", generateAll);
downloadZipBtn.addEventListener("click", downloadZip);
applyDealBtn.addEventListener("click", applyDealToAll);
clearBtn.addEventListener("click", clearAll);

async function addFiles(fileList) {
  const files = [...fileList].filter((file) => file.type.startsWith("image/"));

  for (const file of files) {
    const imageUrl = URL.createObjectURL(file);
    const baseName = file.name.replace(/\.[^.]+$/, "");

    state.items.push({
      id: crypto.randomUUID(),
      file,
      imageUrl,
      title: titleFromFileName(baseName),
      price: "",
      bulkQty: defaultBulkQty.value.trim(),
      bulkPrice: defaultBulkPrice.value.trim(),
      tag: defaultTag.value.trim()
    });
  }

  renderItems();
}

function renderItems() {
  photoCount.textContent = state.items.length;
  itemsList.classList.toggle("empty", state.items.length === 0);

  if (state.items.length === 0) {
    itemsList.innerHTML = "<p>还没有照片。先上传几张商品图。</p>";
    return;
  }

  itemsList.replaceChildren(
    ...state.items.map((item) => {
      const fragment = itemTemplate.content.cloneNode(true);
      const row = fragment.querySelector(".item-row");
      const thumb = fragment.querySelector(".thumb");
      const title = fragment.querySelector(".item-title");
      const price = fragment.querySelector(".item-price");
      const bulkQty = fragment.querySelector(".item-bulk-qty");
      const bulkPrice = fragment.querySelector(".item-bulk-price");
      const tag = fragment.querySelector(".item-tag");
      const remove = fragment.querySelector(".remove-btn");

      thumb.src = item.imageUrl;
      thumb.alt = item.title || item.file.name;
      title.value = item.title;
      price.value = item.price;
      bulkQty.value = item.bulkQty;
      bulkPrice.value = item.bulkPrice;
      tag.value = item.tag;

      title.addEventListener("input", () => {
        item.title = title.value;
      });
      price.addEventListener("input", () => {
        item.price = price.value;
      });
      bulkQty.addEventListener("input", () => {
        item.bulkQty = bulkQty.value;
      });
      bulkPrice.addEventListener("input", () => {
        item.bulkPrice = bulkPrice.value;
      });
      tag.addEventListener("input", () => {
        item.tag = tag.value;
      });
      remove.addEventListener("click", () => {
        URL.revokeObjectURL(item.imageUrl);
        state.items = state.items.filter((candidate) => candidate.id !== item.id);
        renderItems();
      });

      row.dataset.id = item.id;
      return fragment;
    })
  );
}

function applyDealToAll() {
  const bulkQty = defaultBulkQty.value.trim();
  const bulkPrice = defaultBulkPrice.value.trim();
  const tag = defaultTag.value.trim();

  state.items.forEach((item) => {
    item.bulkQty = bulkQty;
    item.bulkPrice = bulkPrice;
    if (tag) {
      item.tag = tag;
    }
  });

  renderItems();
}

async function generateAll() {
  if (state.items.length === 0) {
    return;
  }

  generateBtn.disabled = true;
  generateBtn.textContent = "Generating...";
  outputGrid.classList.remove("empty");
  outputGrid.innerHTML = "";
  state.outputs = [];

  for (const item of state.items) {
    const output = await renderMarketplaceImage(item);
    state.outputs.push(output);
    renderOutputCard(output);
  }

  downloadZipBtn.disabled = state.outputs.length === 0;
  generateBtn.disabled = false;
  generateBtn.textContent = "Generate previews";
}

async function renderMarketplaceImage(item) {
  const image = await loadImage(item.imageUrl);
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const ctx = canvas.getContext("2d");
  const theme = templates[templateSelect.value] || templates.clean;

  ctx.fillStyle = theme.background;
  ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  drawSoftBackdrop(ctx, theme);
  drawContainedImage(ctx, image, 90, 92, 900, 760);
  drawShelf(ctx, theme);
  drawListingCopy(ctx, item, theme);

  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/png", 0.95)
  );

  const safeName = slugify(item.title || item.file.name || "marketplace-item");
  return {
    id: item.id,
    fileName: `${safeName || "marketplace-item"}.png`,
    dataUrl: canvas.toDataURL("image/png"),
    blob
  };
}

function drawSoftBackdrop(ctx, theme) {
  const gradient = ctx.createRadialGradient(540, 320, 40, 540, 320, 620);
  gradient.addColorStop(0, "rgba(255, 255, 255, 0.72)");
  gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

  ctx.fillStyle = theme.shelf;
  ctx.beginPath();
  ctx.ellipse(540, 842, 370, 48, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawContainedImage(ctx, image, x, y, width, height) {
  const scale = Math.min(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const drawX = x + (width - drawWidth) / 2;
  const drawY = y + (height - drawHeight) / 2;

  ctx.save();
  ctx.shadowColor = "rgba(20, 26, 30, 0.20)";
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 22;
  ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  ctx.restore();
}

function drawShelf(ctx, theme) {
  ctx.fillStyle = withAlpha(theme.shelf, 0.58);
  ctx.fillRect(90, 860, 900, 2);
}

function drawListingCopy(ctx, item, theme) {
  const prefix = pricePrefix.value;
  const title = item.title.trim() || "Marketplace item";
  const tag = item.tag.trim() || defaultTag.value.trim();
  const location = defaultLocation.value.trim();

  drawDealSticker(ctx, item, prefix);

  ctx.fillStyle = theme.text;
  ctx.font = "900 48px Avenir Next, Trebuchet MS, sans-serif";
  drawWrappedText(ctx, title, 78, 920, 620, 54, 2);

  ctx.fillStyle = theme.muted;
  ctx.font = "700 28px Avenir Next, Trebuchet MS, sans-serif";
  const footer = [tag, location].filter(Boolean).join(" · ");
  ctx.fillText(fitText(ctx, footer || "Ready for pickup", 850), 78, 1022);
}

function drawDealSticker(ctx, item, prefix) {
  const singlePrice = formatPrice(item.price, prefix);
  const bulkQty = item.bulkQty.trim() || defaultBulkQty.value.trim() || "3";
  const bulkPrice = formatPrice(
    item.bulkPrice.trim() || item.price.trim(),
    prefix
  );
  const x = 656;
  const y = 52;
  const width = 352;
  const height = 194;

  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.24)";
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 14;
  drawRoundedRect(ctx, x, y, width, height, 30, "#ffda36");
  ctx.restore();

  drawRoundedRect(ctx, x + 16, y + 16, width - 32, 62, 20, "#111820");
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 25px Avenir Next, Trebuchet MS, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText("SINGLE ITEM", x + 38, y + 47);

  ctx.fillStyle = "#111820";
  ctx.font = "900 58px Avenir Next, Trebuchet MS, sans-serif";
  ctx.fillText(fitText(ctx, singlePrice, 188), x + 38, y + 112);
  ctx.font = "900 24px Avenir Next, Trebuchet MS, sans-serif";
  ctx.fillText("each", x + 232, y + 112);

  ctx.fillStyle = "#e63726";
  ctx.fillRect(x, y + 136, width, 58);
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 30px Avenir Next, Trebuchet MS, sans-serif";
  ctx.fillText(fitText(ctx, `BUY ${bulkQty}+  ${bulkPrice} EACH`, 304), x + 26, y + 166);
}

function formatPrice(value, prefix) {
  const normalized = String(value || "0").trim().replace(/^\$/, "");
  return `${prefix}${normalized || "0"}`;
}

function renderOutputCard(output) {
  const card = document.createElement("article");
  card.className = "output-card";

  const image = document.createElement("img");
  image.src = output.dataUrl;
  image.alt = output.fileName;

  const meta = document.createElement("div");
  meta.className = "output-meta";

  const name = document.createElement("span");
  name.textContent = output.fileName;

  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "Download";
  button.addEventListener("click", () => downloadBlob(output.blob, output.fileName));

  meta.append(name, button);
  card.append(image, meta);
  outputGrid.append(card);
}

async function downloadZip() {
  const entries = await Promise.all(
    state.outputs.map(async (output) => ({
      name: output.fileName,
      bytes: new Uint8Array(await output.blob.arrayBuffer())
    }))
  );
  const zipBlob = createZip(entries);
  downloadBlob(zipBlob, "facebook-marketplace-photos.zip");
}

function clearAll() {
  state.items.forEach((item) => URL.revokeObjectURL(item.imageUrl));
  state.items = [];
  state.outputs = [];
  fileInput.value = "";
  downloadZipBtn.disabled = true;
  renderItems();
  outputGrid.classList.add("empty");
  outputGrid.innerHTML = "<p>预览会显示在这里。</p>";
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

function titleFromFileName(name) {
  return name
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

function drawRoundedRect(ctx, x, y, width, height, radius, fillStyle) {
  ctx.fillStyle = fillStyle;
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fill();
}

function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
  const words = text.split(/\s+/);
  const lines = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth) {
      current = next;
    } else {
      lines.push(current);
      current = word;
    }

    if (lines.length === maxLines) {
      break;
    }
  }

  if (current && lines.length < maxLines) {
    lines.push(current);
  }

  lines.forEach((line, index) => {
    const value =
      index === maxLines - 1 && words.join(" ").length > lines.join(" ").length
        ? fitText(ctx, `${line}...`, maxWidth)
        : line;
    ctx.fillText(value, x, y + index * lineHeight);
  });
}

function fitText(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) {
    return text;
  }

  let value = text;
  while (value.length > 1 && ctx.measureText(`${value}...`).width > maxWidth) {
    value = value.slice(0, -1);
  }
  return `${value}...`;
}

function withAlpha(hex, alpha) {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function createZip(entries) {
  const chunks = [];
  const centralDirectory = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encodeUtf8(entry.name);
    const crc = crc32(entry.bytes);
    const localHeader = concatBytes(
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(entry.bytes.length),
      u32(entry.bytes.length),
      u16(nameBytes.length),
      u16(0),
      nameBytes
    );

    chunks.push(localHeader, entry.bytes);

    centralDirectory.push(
      concatBytes(
        u32(0x02014b50),
        u16(20),
        u16(20),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(crc),
        u32(entry.bytes.length),
        u32(entry.bytes.length),
        u16(nameBytes.length),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(0),
        u32(offset),
        nameBytes
      )
    );

    offset += localHeader.length + entry.bytes.length;
  }

  const centralStart = offset;
  const centralBytes = concatBytes(...centralDirectory);
  const end = concatBytes(
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(entries.length),
    u16(entries.length),
    u32(centralBytes.length),
    u32(centralStart),
    u16(0)
  );

  return new Blob([...chunks, centralBytes, end], { type: "application/zip" });
}

function encodeUtf8(value) {
  return new TextEncoder().encode(value);
}

function u16(value) {
  const bytes = new Uint8Array(2);
  const view = new DataView(bytes.buffer);
  view.setUint16(0, value, true);
  return bytes;
}

function u32(value) {
  const bytes = new Uint8Array(4);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, value >>> 0, true);
  return bytes;
}

function concatBytes(...parts) {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;

  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }

  return output;
}

function crc32(bytes) {
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}
