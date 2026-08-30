const $ = selector => document.querySelector(selector);
const fileInput = $('#fileInput');
const dropzone = $('#dropzone');
const canvasWrap = $('#canvasWrap');
const canvas = $('#canvas');
const ctx = canvas.getContext('2d');
const cropBox = $('#cropBox');
const preview = $('#preview');
const previewCtx = preview.getContext('2d');
const zoomRow = $('#zoomRow');
const changeButton = $('#changeButton');
const resetButton = $('#resetButton');
const downloadButton = $('#downloadButton');
const message = $('#message');
const previewEmpty = $('#previewEmpty');

let file = null;
let image = null;
let format = 'webp';
let display = { x: 0, y: 0, width: 1, height: 1, scale: 1 };
let crop = { x: 0, y: 0, size: 1 }; // Coordinates in the 720 × 720 canvas.
let interaction = null;

function calculateDisplay() {
  const scale = Math.min(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  display = { x: (canvas.width - width) / 2, y: (canvas.height - height) / 2, width, height, scale };
}

function resetCrop() {
  if (!image) return;
  calculateDisplay();
  const size = Math.min(display.width, display.height) * 0.82;
  crop = {
    x: display.x + (display.width - size) / 2,
    y: display.y + (display.height - size) / 2,
    size,
  };
  render();
}

function sourceCrop() {
  return {
    x: (crop.x - display.x) / display.scale,
    y: (crop.y - display.y) / display.scale,
    size: crop.size / display.scale,
  };
}

function positionCropBox() {
  const sx = canvasWrap.clientWidth / canvas.width;
  const sy = canvasWrap.clientHeight / canvas.height;
  cropBox.style.left = `${crop.x * sx}px`;
  cropBox.style.top = `${crop.y * sy}px`;
  cropBox.style.width = `${crop.size * sx}px`;
  cropBox.style.height = `${crop.size * sy}px`;
  cropBox.style.setProperty('--crop-width', `${crop.size * sx}px`);
}

function render() {
  if (!image) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#e9e9e6';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, display.x, display.y, display.width, display.height);

  // A four-sided overlay leaves the selected area clear.
  ctx.fillStyle = 'rgba(10, 12, 11, .56)';
  ctx.fillRect(display.x, display.y, display.width, crop.y - display.y);
  ctx.fillRect(display.x, crop.y + crop.size, display.width, display.y + display.height - crop.y - crop.size);
  ctx.fillRect(display.x, crop.y, crop.x - display.x, crop.size);
  ctx.fillRect(crop.x + crop.size, crop.y, display.x + display.width - crop.x - crop.size, crop.size);
  positionCropBox();

  const source = sourceCrop();
  previewCtx.clearRect(0, 0, 512, 512);
  previewCtx.drawImage(image, source.x, source.y, source.size, source.size, 0, 0, 512, 512);
}

function clampCrop() {
  const minSize = Math.min(90, Math.min(display.width, display.height));
  crop.size = Math.max(minSize, Math.min(crop.size, display.width, display.height));
  crop.x = Math.max(display.x, Math.min(crop.x, display.x + display.width - crop.size));
  crop.y = Math.max(display.y, Math.min(crop.y, display.y + display.height - crop.size));
}

function loadFile(nextFile) {
  if (!nextFile) return;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(nextFile.type)) {
    message.textContent = 'Choose a JPG, PNG, or WebP image.'; return;
  }
  if (nextFile.size > 20 * 1024 * 1024) {
    message.textContent = 'The file exceeds 20 MB.'; return;
  }
  const url = URL.createObjectURL(nextFile);
  const nextImage = new Image();
  nextImage.onload = () => {
    file = nextFile; image = nextImage;
    URL.revokeObjectURL(url);
    dropzone.hidden = true; canvasWrap.hidden = false; zoomRow.hidden = false; changeButton.hidden = false;
    preview.classList.add('ready'); previewEmpty.hidden = true; downloadButton.disabled = false; message.textContent = '';
    resetCrop();
  };
  nextImage.onerror = () => { URL.revokeObjectURL(url); message.textContent = 'The image could not be opened.'; };
  nextImage.src = url;
}

fileInput.addEventListener('change', () => loadFile(fileInput.files[0]));
changeButton.addEventListener('click', () => fileInput.click());
resetButton.addEventListener('click', resetCrop);
['dragenter', 'dragover'].forEach(type => dropzone.addEventListener(type, event => { event.preventDefault(); dropzone.classList.add('dragging'); }));
['dragleave', 'drop'].forEach(type => dropzone.addEventListener(type, event => { event.preventDefault(); dropzone.classList.remove('dragging'); }));
dropzone.addEventListener('drop', event => loadFile(event.dataTransfer.files[0]));

cropBox.addEventListener('pointerdown', event => {
  event.preventDefault();
  const pointScale = canvas.width / canvasWrap.clientWidth;
  interaction = {
    mode: event.target.dataset.action === 'resize' ? 'resize' : 'move',
    startX: event.clientX,
    startY: event.clientY,
    crop: { ...crop },
    pointScale,
  };
  cropBox.setPointerCapture(event.pointerId);
  cropBox.classList.add('active');
});

cropBox.addEventListener('pointermove', event => {
  if (!interaction) return;
  const dx = (event.clientX - interaction.startX) * interaction.pointScale;
  const dy = (event.clientY - interaction.startY) * interaction.pointScale;
  if (interaction.mode === 'move') {
    crop.x = interaction.crop.x + dx;
    crop.y = interaction.crop.y + dy;
  } else {
    crop.size = interaction.crop.size + Math.max(dx, dy);
  }
  clampCrop(); render();
});

function endInteraction() { interaction = null; cropBox.classList.remove('active'); }
cropBox.addEventListener('pointerup', endInteraction);
cropBox.addEventListener('pointercancel', endInteraction);

document.querySelectorAll('.format-switch button').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('.format-switch button').forEach(item => item.classList.remove('active'));
  button.classList.add('active'); format = button.dataset.format;
  $('#formatLabel').textContent = format === 'webp' ? 'WebP' : 'PNG';
}));

function encodeCanvas(type, quality) {
  return new Promise(resolve => preview.toBlob(resolve, type, quality));
}

async function createStickerBlob() {
  if (format === 'png') {
    const blob = await encodeCanvas('image/png');
    if (!blob) throw new Error('PNG export is not supported by this browser.');
    if (blob.size > 512 * 1024) {
      throw new Error('This lossless PNG exceeds 512 KB. Choose WebP to meet Telegram’s limit.');
    }
    return blob;
  }

  let blob = null;
  for (const quality of [0.92, 0.86, 0.80, 0.74, 0.68, 0.60, 0.52, 0.44]) {
    blob = await encodeCanvas('image/webp', quality);
    if (!blob || blob.type !== 'image/webp') throw new Error('WebP export is not supported by this browser.');
    if (blob.size <= 512 * 1024) return blob;
  }
  throw new Error('The sticker could not be compressed below 512 KB.');
}

downloadButton.addEventListener('click', async () => {
  if (!file) return;
  downloadButton.disabled = true; message.textContent = 'Preparing the file…';
  try {
    const blob = await createStickerBlob();
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `telegram-sticker.${format}`; link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    message.textContent = `Ready · ${(blob.size / 1024).toFixed(0)} KB`;
  } catch (error) { message.textContent = error.message; }
  finally { downloadButton.disabled = false; }
});

new ResizeObserver(() => positionCropBox()).observe(canvasWrap);
