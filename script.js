document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const themeToggle = document.getElementById('themeToggle');
  const previewToggle = document.getElementById('previewToggle');
  const autoSaveToggle = document.getElementById('autoSaveToggle');
  const autoDownloadToggle = document.getElementById('autoDownloadToggle');
  const photoInput = document.getElementById('photoInput');
  const uploader = document.getElementById('uploader');
  const settingsPanel = document.getElementById('settingsPanel');
  const cropper = document.getElementById('cropper');
  const preview = document.getElementById('preview');
  const bgChoose = document.getElementById('bgChoose');
  const cropCanvas = new fabric.Canvas('cropCanvas', { width: 600, height: 600 });
  const previewCanvas = document.getElementById('previewCanvas');
  const cropButton = document.getElementById('cropButton');
  const autoCropButton = document.getElementById('autoCrop');
  const removeBgButton = document.getElementById('removeBg');
  const undoButton = document.getElementById('undo');
  const redoButton = document.getElementById('redo');
  const downloadJPG = document.getElementById('downloadJPG');
  const downloadPDF = document.getElementById('downloadPDF');
  const recropButton = document.getElementById('recrop');
  const applyPhotoBgButton = document.getElementById('applyPhotoBg');
  const autoDownloadButton = document.getElementById('autoDownload');
  const brightnessSlider = document.getElementById('brightness');
  const contrastSlider = document.getElementById('contrast');
  const saturationSlider = document.getElementById('saturation');
  const sharpeningSlider = document.getElementById('sharpening');
  const vignetteSlider = document.getElementById('vignette');
  const shadowSlider = document.getElementById('shadow');
  const flipHorizontalButton = document.getElementById('flipHorizontal');
  const flipVerticalButton = document.getElementById('flipVertical');

  // State Variables
  let originalPhoto = null;
  let croppedPhoto = null;
  let history = [null];
  let historyIndex = 0;
  let settings = {
    whiteSpace: 0.2,
    border: 0.05,
    borderColor: 'black',
    dpi: 300,
    background: '#ffffff', // White background for A4 sheet
    photoBg: 'white',
    rotation: 0,
    zoom: 1,
    brightness: 0,
    contrast: 0,
    saturation: 0,
    sharpening: 0,
    vignette: 0,
    shadow: 0,
    flippedH: false,
    flippedV: false,
    rowsToPrint: 6,
  };
  let isPreviewOn = true;
  let autoSave = false;
  let autoDownload = false;

  // Load saved state from localStorage if auto-save is enabled
  if (localStorage.getItem('passportPhotoSettings')) {
    const savedSettings = JSON.parse(localStorage.getItem('passportPhotoSettings'));
    Object.assign(settings, savedSettings);
    if (savedSettings.croppedPhoto) {
      croppedPhoto = savedSettings.croppedPhoto;
      renderPreview().then(() => console.log('Initial preview rendered'));
    }
  }

  // Theme Toggle (Dark Mode Only)
  themeToggle.addEventListener('click', () => {
    alert('Dark mode is the only option in this premium design.');
  });

  // Preview Toggle
  previewToggle.addEventListener('click', () => {
    isPreviewOn = !isPreviewOn;
    previewToggle.textContent = isPreviewOn ? '👁️ Preview' : '🙈 Hide Preview';
    preview.classList.toggle('hidden', !isPreviewOn);
    if (isPreviewOn && croppedPhoto) {
      renderPreview().then(() => console.log('Preview toggled and rendered'));
    }
    saveState();
  });

  // Auto-Save Toggle
  autoSaveToggle.addEventListener('click', () => {
    autoSave = !autoSave;
    autoSaveToggle.textContent = autoSave ? '💾 Auto-Save On' : '💾 Auto-Save Off';
    if (autoSave && croppedPhoto) saveState();
  });

  // Auto-Download Toggle
  autoDownloadToggle.addEventListener('click', () => {
    autoDownload = !autoDownload;
    autoDownloadToggle.textContent = autoDownload ? '📥 Auto-Download On' : '📥 Auto-Download Off';
    if (autoDownload && croppedPhoto) autoDownloadFiles();
  });

  autoDownloadButton.addEventListener('click', () => {
    autoDownloadFiles();
  });

  // Photo Upload
  uploader.addEventListener('click', () => photoInput.click());
  photoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        originalPhoto = event.target.result;
        showCropper();
      };
      reader.readAsDataURL(file);
    } else {
      alert('Please upload an image file (JPG, PNG).');
    }
  });

  uploader.addEventListener('dragover', (e) => e.preventDefault());
  uploader.addEventListener('drop', (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        originalPhoto = event.target.result;
        showCropper();
      };
      reader.readAsDataURL(file);
    } else {
      alert('Please upload an image file (JPG, PNG).');
    }
  });

  // Cropper Logic
  function showCropper(photo = originalPhoto) {
    uploader.classList.add('hidden');
    cropper.classList.remove('hidden');
    cropCanvas.clear();
    fabric.Image.fromURL(photo, (img) => {
      const scale = Math.min(600 / img.width, 600 / img.height);
      img.scale(scale);
      cropCanvas.add(img);
      cropCanvas.centerObject(img);
      cropCanvas.setActiveObject(img);

      // Auto-detect face or center for cropping
      const rect = new fabric.Rect({
        width: 3.5 * 118.11, // 3.5 cm at 300 DPI
        height: 4.5 * 118.11, // 4.5 cm at 300 DPI
        fill: 'transparent',
        stroke: 'red',
        strokeWidth: 3,
        selectable: true,
        strokeDashArray: [5, 5],
        left: (cropCanvas.width - 3.5 * 118.11 * scale) / 2,
        top: (cropCanvas.height - 4.5 * 118.11 * scale) / 2,
      });
      cropCanvas.add(rect);
      cropCanvas.setActiveObject(rect);

      // Enable drag, resize, and rotate
      rect.setControlsVisibility({
        mt: true,
        mb: true,
        ml: true,
        mr: true,
        mtr: true,
      });
    });
  }

  cropButton.addEventListener('click', () => {
    const activeObject = cropCanvas.getActiveObject();
    if (activeObject && activeObject.type === 'rect') {
      const cropped = cropCanvas.toDataURL({
        left: activeObject.left,
        top: activeObject.top,
        width: activeObject.width * activeObject.scaleX,
        height: activeObject.height * activeObject.scaleY,
      });
      updatePhoto(cropped);
      cropper.classList.add('hidden');
      settingsPanel.classList.remove('hidden');
      if (isPreviewOn) preview.classList.remove('hidden');
      renderPreview().then(() => console.log('Cropped and preview rendered'));
    } else {
      alert('Please adjust the cropping rectangle before proceeding.');
    }
  });

  // Auto-Crop (Simple Placeholder)
  autoCropButton.addEventListener('click', () => {
    const img = cropCanvas.getObjects().find(obj => obj.type === 'image');
    if (img) {
      const scale = Math.min(600 / img.width, 600 / img.height);
      const rect = cropCanvas.getObjects().find(obj => obj.type === 'rect');
      if (rect) {
        rect.set({
          left: (cropCanvas.width - 3.5 * 118.11 * scale) / 2,
          top: (cropCanvas.height - 4.5 * 118.11 * scale) / 2,
          width: 3.5 * 118.11 * scale,
          height: 4.5 * 118.11 * scale,
          scaleX: 1,
          scaleY: 1,
          angle: 0,
        });
        cropCanvas.renderAll();
      }
    }
  });

  // Recrop Option
  recropButton.addEventListener('click', () => {
    if (croppedPhoto) {
      settingsPanel.classList.add('hidden');
      if (isPreviewOn) preview.classList.add('hidden');
      showCropper(croppedPhoto);
    }
  });

  // Settings Updates
  document.getElementById('rowsToPrint').addEventListener('change', (e) => {
    settings.rowsToPrint = parseInt(e.target.value) || 6;
    renderPreview().then(() => console.log('Rows updated and preview rendered'));
    saveState();
  });
  document.getElementById('whiteSpace').addEventListener('change', (e) => {
    settings.whiteSpace = parseFloat(e.target.value) || 0.2;
    if (settings.whiteSpace < 0) settings.whiteSpace = 0;
    renderPreview().then(() => console.log('White space updated and preview rendered'));
    saveState();
  });
  document.getElementById('border').addEventListener('change', (e) => {
    settings.border = parseFloat(e.target.value) || 0.05;
    if (settings.border < 0) settings.border = 0;
    renderPreview().then(() => console.log('Border updated and preview rendered'));
    saveState();
  });
  document.getElementById('borderColor').addEventListener('change', (e) => {
    settings.borderColor = e.target.value || 'black';
    renderPreview().then(() => console.log('Border color updated and preview rendered'));
    saveState();
  });
  document.getElementById('dpi').addEventListener('change', (e) => {
    settings.dpi = parseInt(e.target.value) || 300;
    renderPreview().then(() => console.log('DPI updated and preview rendered'));
    saveState();
  });
  document.getElementById('rotation').addEventListener('change', (e) => {
    settings.rotation = parseInt(e.target.value) || 0;
    renderPreview().then(() => console.log('Rotation updated and preview rendered'));
    saveState();
  });
  document.getElementById('zoom').addEventListener('change', (e) => {
    settings.zoom = parseFloat(e.target.value) || 1;
    if (settings.zoom < 0.5) settings.zoom = 0.5;
    if (settings.zoom > 2) settings.zoom = 2;
    renderPreview().then(() => console.log('Zoom updated and preview rendered'));
    saveState();
  });
  brightnessSlider.addEventListener('input', (e) => {
    settings.brightness = parseInt(e.target.value) || 0;
    renderPreview().then(() => console.log('Brightness updated and preview rendered'));
    saveState();
  });
  contrastSlider.addEventListener('input', (e) => {
    settings.contrast = parseInt(e.target.value) || 0;
    renderPreview().then(() => console.log('Contrast updated and preview rendered'));
    saveState();
  });
  saturationSlider.addEventListener('input', (e) => {
    settings.saturation = parseInt(e.target.value) || 0;
    renderPreview().then(() => console.log('Saturation updated and preview rendered'));
    saveState();
  });
  sharpeningSlider.addEventListener('input', (e) => {
    settings.sharpening = parseInt(e.target.value) || 0;
    renderPreview().then(() => console.log('Sharpening updated and preview rendered'));
    saveState();
  });
  vignetteSlider.addEventListener('input', (e) => {
    settings.vignette = parseInt(e.target.value) || 0;
    renderPreview().then(() => console.log('Vignette updated and preview rendered'));
    saveState();
  });
  shadowSlider.addEventListener('input', (e) => {
    settings.shadow = parseInt(e.target.value) || 0;
    renderPreview().then(() => console.log('Shadow updated and preview rendered'));
    saveState();
  });
  flipHorizontalButton.addEventListener('click', () => {
    settings.flippedH = !settings.flippedH;
    renderPreview().then(() => console.log('Flip horizontal updated and preview rendered'));
    saveState();
  });
  flipVerticalButton.addEventListener('click', () => {
    settings.flippedV = !settings.flippedV;
    renderPreview().then(() => console.log('Flip vertical updated and preview rendered'));
    saveState();
  });
  document.getElementById('photoBg').addEventListener('change', (e) => {
    settings.photoBg = e.target.value || 'white';
    renderPreview().then(() => console.log('Photo background updated and preview rendered'));
    saveState();
  });

  // Background Removal
  removeBgButton.addEventListener('click', async () => {
    if (!croppedPhoto) return;
    removeBgButton.disabled = true;

    try {
      const response = await fetch(croppedPhoto);
      const blob = await response.blob();

      const formData = new FormData();
      formData.append('image_file', blob, 'photo.png');
      formData.append('size', 'auto');

      const apiKeyResponse = await fetch('apikey.txt');
      const apiKey = await apiKeyResponse.text();

      const apiResponse = await axios.post('https://api.remove.bg/v1.0/removebg', formData, {
        headers: { 'X-Api-Key': apiKey.trim(), 'Content-Type': 'multipart/form-data' },
        responseType: 'blob',
      });

      const reader = new FileReader();
      reader.onloadend = () => {
        croppedPhoto = reader.result;
        updatePhoto(croppedPhoto);
        removeBgButton.disabled = false;
        settingsPanel.classList.add('hidden');
        if (isPreviewOn) preview.classList.add('hidden');
        bgChoose.classList.remove('hidden');
        renderPreview().then(() => console.log('Background removed and preview rendered'));
      };
      reader.readAsDataURL(apiResponse.data);
    } catch (error) {
      console.error('Error removing background:', error);
      alert('Failed to remove background. Check your API key or internet connection.');
      removeBgButton.disabled = false;
    }
  });

  // Apply Photo Background
  applyPhotoBgButton.addEventListener('click', () => {
    settings.photoBg = document.getElementById('photoBgTemp').value;
    bgChoose.classList.add('hidden');
    settingsPanel.classList.remove('hidden');
    if (isPreviewOn) preview.classList.remove('hidden');
    renderPreview().then(() => console.log('Photo background applied and preview rendered'));
  });

  // Undo/Redo
  function updatePhoto(newPhoto) {
    history = [...history.slice(0, historyIndex + 1), newPhoto];
    historyIndex = history.length - 1;
    croppedPhoto = newPhoto;
    renderPreview().then(() => console.log('Photo updated and preview rendered'));
    undoButton.disabled = historyIndex === 0;
    redoButton.disabled = historyIndex === history.length - 1;
    saveState();
  }

  undoButton.addEventListener('click', () => {
    if (historyIndex > 0) {
      historyIndex--;
      croppedPhoto = history[historyIndex];
      renderPreview().then(() => console.log('Undo applied and preview rendered'));
      undoButton.disabled = historyIndex === 0;
      redoButton.disabled = false;
      saveState();
    }
  });

  redoButton.addEventListener('click', () => {
    if (historyIndex < history.length - 1) {
      historyIndex++;
      croppedPhoto = history[historyIndex];
      renderPreview().then(() => console.log('Redo applied and preview rendered'));
      redoButton.disabled = historyIndex === history.length - 1;
      undoButton.disabled = false;
      saveState();
    }
  });

  // Save State
  function saveState() {
    if (autoSave) {
      const state = {
        croppedPhoto,
        ...settings,
      };
      localStorage.setItem('passportPhotoSettings', JSON.stringify(state));
    }
  }

  // Auto-Download Files
  function autoDownloadFiles() {
    if (autoDownload && croppedPhoto) {
      downloadJPG.click();
      downloadPDF.click();
    }
  }

  // Render Preview on Canvas (Returns a Promise)
  function renderPreview() {
    return new Promise((resolve, reject) => {
      if (!isPreviewOn || !croppedPhoto) {
        resolve();
        return;
      }

      const ctx = previewCanvas.getContext('2d');
      const dpi = settings.dpi;
      const cmToPx = dpi / 2.54;

      const a4Width = 21 * cmToPx;
      const a4Height = 29.7 * cmToPx;
      previewCanvas.width = a4Width;
      previewCanvas.height = a4Height;

      // Clear the canvas and set background
      ctx.fillStyle = settings.background;
      ctx.fillRect(0, 0, a4Width, a4Height);

      const img = new Image();
      img.src = croppedPhoto;
      img.crossOrigin = "Anonymous";

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const tempCtx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        tempCtx.drawImage(img, 0, 0);

        // Apply Image Adjustments
        const imageData = tempCtx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          // Brightness
          data[i] = Math.min(255, Math.max(0, data[i] + settings.brightness * 2.55));
          data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + settings.brightness * 2.55));
          data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + settings.brightness * 2.55));
          // Contrast
          const contrastFactor = (259 * (settings.contrast + 255)) / (255 * (259 - settings.contrast));
          data[i] = contrastFactor * (data[i] - 128) + 128;
          data[i + 1] = contrastFactor * (data[i + 1] - 128) + 128;
          data[i + 2] = contrastFactor * (data[i + 2] - 128) + 128;
          // Saturation
          const r = data[i], g = data[i + 1], b = data[i + 2];
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          const satFactor = 1 + settings.saturation / 100;
          data[i] = gray + (r - gray) * satFactor;
          data[i + 1] = gray + (g - gray) * satFactor;
          data[i + 2] = gray + (b - gray) * satFactor;
          data[i] = Math.min(255, Math.max(0, data[i]));
          data[i + 1] = Math.min(255, Math.max(0, data[i + 1]));
          data[i + 2] = Math.min(255, Math.max(0, data[i + 2]));
          // Sharpening
          if (settings.sharpening > 0) {
            const sharpenFactor = settings.sharpening / 100;
            if (i >= 4 && i < data.length - 4) {
              data[i] = data[i] + sharpenFactor * (data[i] - (data[i - 4] + data[i + 4]) / 2);
              data[i + 1] = data[i + 1] + sharpenFactor * (data[i + 1] - (data[i + 1 - 4] + data[i + 1 + 4]) / 2);
              data[i + 2] = data[i + 2] + sharpenFactor * (data[i + 2] - (data[i + 2 - 4] + data[i + 2 + 4]) / 2);
              data[i] = Math.min(255, Math.max(0, data[i]));
              data[i + 1] = Math.min(255, Math.max(0, data[i + 1]));
              data[i + 2] = Math.min(255, Math.max(0, data[i + 2]));
            }
          }
        }
        tempCtx.putImageData(imageData, 0, 0);

        // Apply Vignette
        if (settings.vignette > 0) {
          const vignetteFactor = settings.vignette / 100;
          const centerX = canvas.width / 2;
          const centerY = canvas.height / 2;
          for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
              const dx = x - centerX;
              const dy = y - centerY;
              const distance = Math.sqrt(dx * dx + dy * dy);
              const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);
              const vignette = 1 - (distance / maxDistance) * vignetteFactor;
              const pixelData = tempCtx.getImageData(x, y, 1, 1).data;
              const newPixelData = new Uint8ClampedArray(4);
              newPixelData[0] = pixelData[0] * vignette;
              newPixelData[1] = pixelData[1] * vignette;
              newPixelData[2] = pixelData[2] * vignette;
              newPixelData[3] = pixelData[3];
              tempCtx.putImageData(new ImageData(newPixelData, 1, 1), x, y);
            }
          }
        }

        // Apply Flips
        const flippedCanvas = document.createElement('canvas');
        flippedCanvas.width = canvas.width;
        flippedCanvas.height = canvas.height;
        const flippedCtx = flippedCanvas.getContext('2d');
        flippedCtx.save();
        if (settings.flippedH) flippedCtx.scale(-1, 1);
        if (settings.flippedV) flippedCtx.scale(1, -1);
        flippedCtx.drawImage(canvas, settings.flippedH ? -canvas.width : 0, settings.flippedV ? -canvas.height : 0);
        flippedCtx.restore();

        // Apply Shadow
        const shadowCanvas = document.createElement('canvas');
        shadowCanvas.width = 3.5 * cmToPx;
        shadowCanvas.height = 4.5 * cmToPx;
        const shadowCtx = shadowCanvas.getContext('2d');
        shadowCtx.shadowBlur = settings.shadow * 2;
        shadowCtx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        shadowCtx.shadowOffsetX = settings.shadow;
        shadowCtx.shadowOffsetY = settings.shadow;

        // Apply Photo Background
        const bgCanvas = document.createElement('canvas');
        bgCanvas.width = 3.5 * cmToPx;
        bgCanvas.height = 4.5 * cmToPx;
        const bgCtx = bgCanvas.getContext('2d');
        bgCtx.fillStyle = settings.photoBg;
        bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);
        bgCtx.drawImage(flippedCanvas, 0, 0, bgCanvas.width, bgCanvas.height);

        shadowCtx.drawImage(bgCanvas, 0, 0);

        // Layout Photos on A4
        const photoWidth = 3.5 * cmToPx * settings.zoom;
        const photoHeight = 4.5 * cmToPx * settings.zoom;
        const whiteSpace = settings.whiteSpace * cmToPx;
        const border = settings.border * cmToPx;
        const totalWidth = 5 * (photoWidth + whiteSpace) + whiteSpace;
        const totalHeight = 6 * (photoHeight + whiteSpace) + whiteSpace;
        const rowsToPrint = settings.rowsToPrint;

        const xOffset = (a4Width - totalWidth) / 2;
        const yOffset = (a4Height - totalHeight) / 2;

        for (let row = 0; row < 6; row++) {
          for (let col = 0; col < 5; col++) {
            const x = xOffset + col * (photoWidth + whiteSpace) + whiteSpace;
            const y = yOffset + row * (photoHeight + whiteSpace) + whiteSpace;

            if (row < rowsToPrint) {
              ctx.save();
              ctx.translate(x + photoWidth / 2, y + photoHeight / 2);
              ctx.rotate((settings.rotation * Math.PI) / 180);
              ctx.drawImage(shadowCanvas, -photoWidth / 2, -photoHeight / 2, photoWidth, photoHeight);
              ctx.restore();

              ctx.lineWidth = border;
              ctx.strokeStyle = settings.borderColor;
              ctx.strokeRect(x, y, photoWidth, photoHeight);
            } else {
              ctx.fillStyle = settings.background;
              ctx.fillRect(x, y, photoWidth, photoHeight);
            }
          }
        }

        resolve();
      };

      img.onerror = () => {
        console.error('Failed to load image for preview:', croppedPhoto);
        alert('Failed to load the image for preview. Ensure the image is accessible and try again.');
        reject(new Error('Image loading failed'));
      };
    });
  }

  // Download JPG
  downloadJPG.addEventListener('click', async () => {
    if (!croppedPhoto) {
      alert('Please upload and crop a photo before downloading.');
      return;
    }

    try {
      // Ensure the canvas is fully rendered before downloading
      await renderPreview();
      const dataUrl = previewCanvas.toDataURL('image/jpeg', 1.0);
      if (!dataUrl || dataUrl === 'data:,') {
        throw new Error('Invalid or empty data URL for JPG download.');
      }

      const link = document.createElement('a');
      link.download = 'passport-photos.jpg';
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      console.log('JPG downloaded successfully');
    } catch (error) {
      console.error('JPG download failed:', error);
      alert('Failed to download JPG. Ensure you are running the project on a local server (e.g., using VS Code Live Server) to avoid CORS issues. Check the console for more details.');
    }
  });

  // Download PDF
  downloadPDF.addEventListener('click', async () => {
    if (!croppedPhoto) {
      alert('Please upload and crop a photo before downloading.');
      return;
    }

    try {
      // Ensure the canvas is fully rendered before downloading
      await renderPreview();
      const { jsPDF } = window.jspdf;
      const canvas = await html2canvas(previewCanvas, {
        scale: settings.dpi / 96,
        useCORS: false,
        allowTaint: true,
        logging: true,
      });
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      if (!imgData || imgData === 'data:,') {
        throw new Error('Invalid or empty image data for PDF download.');
      }

      const pdf = new jsPDF('p', 'mm', 'a4', true);
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
      pdf.save('passport-photos.pdf');
      console.log('PDF downloaded successfully');
    } catch (error) {
      console.error('PDF download failed:', error);
      alert('Failed to download PDF. Ensure you are running the project on a local server (e.g., using VS Code Live Server) to avoid CORS issues. Check the console for more details.');
    }
  });
});