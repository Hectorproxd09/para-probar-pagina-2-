const STORAGE_KEY = "canvas-code-exportor-state-v1";
const canvas = document.getElementById("canvas");
const itemList = document.getElementById("item-list");
const emptyState = document.getElementById("empty-state");
const propertiesPanel = document.getElementById("properties-panel");
const propType = document.getElementById("prop-type");
const propTextRow = document.getElementById("prop-text-row");
const propImageRow = document.getElementById("prop-image-row");
const propColorRow = document.getElementById("prop-color-row");
const propBgRow = document.getElementById("prop-bg-row");
const propFontSizeRow = document.getElementById("prop-font-size-row");
const propText = document.getElementById("prop-text");
const propColor = document.getElementById("prop-color");
const propBg = document.getElementById("prop-bg");
const propImageSrc = document.getElementById("prop-image-src");
const propLinkRow = document.getElementById("prop-link-row");
const propLink = document.getElementById("prop-link");
const propTargetScreenRow = document.getElementById("prop-target-screen-row");
const propTargetScreen = document.getElementById("prop-target-screen");
const propFontSize = document.getElementById("prop-font-size");
const propFontSizeVal = document.getElementById("prop-font-size-val");
const undoButton = document.getElementById("btn-undo");
const redoButton = document.getElementById("btn-redo");
const togglePanelsButton = document.getElementById("btn-toggle-panels");
const appContainer = document.querySelector(".app");
const deleteButton = document.getElementById("btn-delete-element");
const bgTypeSelect = document.getElementById("canvas-bg-type");
const bgColorInput = document.getElementById("canvas-bg-color");
const bgGradientInput = document.getElementById("canvas-bg-gradient");
const bgImageUrlInput = document.getElementById("canvas-bg-image");
const bgImageFileInput = document.getElementById("canvas-bg-image-file");
const bgVideoUrlInput = document.getElementById("canvas-bg-video");
const bgVideoFileInput = document.getElementById("canvas-bg-video-file");
const bgVideoLoopCheckbox = document.getElementById("canvas-bg-video-loop");
const bgVideoMutedCheckbox = document.getElementById("canvas-bg-video-muted");
const gridToggle = document.getElementById("canvas-show-grid");
const snapGridToggle = document.getElementById("canvas-snap-grid");
const bgColorGroup = document.getElementById("bg-color-group");
const bgGradientGroup = document.getElementById("bg-gradient-group");
const bgImageGroup = document.getElementById("bg-image-group");
const bgVideoGroup = document.getElementById("bg-video-group");
const exportModal = document.getElementById("export-modal");
const exportTextarea = document.getElementById("export-textarea");
const tabs = document.querySelectorAll(".tab");
let exportTab = "html";

const state = loadState() || defaultState();
let dragState = null;
let historyStack = [];
let redoStack = [];
let dragLayerId = null;

function defaultState() {
  const firstItem = {
    id: "item-1",
    type: "text",
    x: 80,
    y: 60,
    w: 420,
    h: 160,
    text: "Diseña en el lienzo y exporta código",
    color: "#ffffff",
    bg: "#154b88",
    fontSize: 26,
    src: "",
    targetScreenId: "",
  };
  return {
    canvas: {
      bgType: "gradient",
      bgColor: "#081620",
      bgGradient: "linear-gradient(135deg, #0b1d32, #10263f)",
      bgImage: "",
      bgVideo: "",
      videoLoop: true,
      videoMuted: true,
      showGrid: true,
      snapToGrid: false,
    },
    screens: [
      {
        id: "screen-1",
        name: "Pantalla principal",
        items: [firstItem],
      },
    ],
    activeScreenId: "screen-1",
    selectedId: "item-1",
  };
}

function migrateState(st) {
  if (!st || typeof st !== "object") return defaultState();
  const canvas = st.canvas || {};
  st.canvas = {
    bgType:
      canvas.bgType || (canvas.bgVideo ? "video" : canvas.bgImage ? "image" : canvas.bgGradient ? "gradient" : "color"),
    bgColor: canvas.bgColor || "#081620",
    bgGradient: canvas.bgGradient || "linear-gradient(135deg, #0b1d32, #10263f)",
    bgImage: canvas.bgImage || canvas.bgImageDataUrl || canvas.bgImageUrl || "",
    bgVideo: canvas.bgVideo || "",
    videoLoop: canvas.videoLoop !== false,
    videoMuted: canvas.videoMuted !== false,
    showGrid: canvas.showGrid !== false,
    snapToGrid: canvas.snapToGrid === true,
  };
  if (!Array.isArray(st.screens)) {
    const items = Array.isArray(st.items) ? st.items : [];
    st.screens = [
      {
        id: "screen-1",
        name: "Pantalla principal",
        items: items.map((item) => ({ ...item, targetScreenId: item.targetScreenId || "" })),
      },
    ];
    st.activeScreenId = st.screens[0].id;
  } else {
    st.screens = st.screens.map((screen) => ({
      ...screen,
      items: Array.isArray(screen.items)
        ? screen.items.map((item) => ({ ...item, targetScreenId: item.targetScreenId || "" }))
        : [],
    }));
    if (!st.activeScreenId && st.screens[0]) st.activeScreenId = st.screens[0].id;
  }
  if (!st.selectedId && st.screens[0] && st.screens[0].items[0]) st.selectedId = st.screens[0].items[0].id;
  return st;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return migrateState(parsed);
  } catch {
    return null;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function createItem(type) {
  const id = `item-${Date.now()}`;
  const itemType = type === "text-panel" ? "text" : type;
  const template = {
    id,
    type: itemType,
    x: 80,
    y: 80,
    w: type === "button" ? 220 : 300,
    h: type === "button" ? 54 : 140,
    text:
      type === "text" ? "Texto libre"
      : type === "text-panel" ? "Texto con panel"
      : type === "button" ? "Botón"
      : "Bloque",
    color: "#ffffff",
    bg:
      type === "box" ? "rgba(105,185,255,0.18)"
      : type === "button" ? "linear-gradient(135deg, #69b9ff, #7cc3ff)"
      : type === "text" ? "transparent"
      : type === "text-panel" ? "rgba(16, 40, 76, 0.9)"
      : "#154b88",
    fontSize: type === "button" ? 18 : 22,
    src: "",
    link: "",
    targetScreenId: "",
  };
  if (type === "image") {
    template.w = 360;
    template.h = 240;
    template.src = "https://images.unsplash.com/photo-1517816743773-6e0fd518b4a6?auto=format&fit=crop&w=800&q=80";
    template.text = "";
    template.bg = "transparent";
  }
  const activeScreen = getActiveScreen();
  if (activeScreen) {
    activeScreen.items.push(template);
  }
  state.selectedId = id;
  saveState();
  recordHistory();
  render();
}

function getActiveScreen() {
  return state.screens.find((screen) => screen.id === state.activeScreenId) || null;
}

function getActiveItems() {
  const activeScreen = getActiveScreen();
  return activeScreen ? activeScreen.items : [];
}

function getSelectedItem() {
  return getActiveItems().find((item) => item.id === state.selectedId) || null;
}

function getScreenOptions() {
  return state.screens.map((screen) => ({ id: screen.id, name: screen.name }));
}

function selectScreen(screenId) {
  if (state.activeScreenId === screenId) return;
  if (!state.screens.find((screen) => screen.id === screenId)) return;
  state.activeScreenId = screenId;
  const activeScreen = getActiveScreen();
  state.selectedId = activeScreen?.items[0]?.id || null;
  render();
}

function renderScreenList() {
  const screenList = document.getElementById("screen-list");
  const activeScreen = getActiveScreen();
  screenList.innerHTML = "";
  state.screens.forEach((screen) => {
    const li = document.createElement("li");
    li.className = screen.id === state.activeScreenId ? "active" : "";
    li.innerHTML = `<span>${screen.name}</span><div class="screen-actions"><button type="button" data-action="rename" data-id="${screen.id}">✎</button><button type="button" data-action="delete" data-id="${screen.id}">🗑</button></div>`;
    li.addEventListener("click", () => selectScreen(screen.id));
    li.querySelector("button[data-action=rename]")?.addEventListener("click", (event) => {
      event.stopPropagation();
      const name = prompt("Nombre de la pantalla", screen.name);
      if (name) {
        screen.name = name.trim();
        saveState();
        renderScreenList();
        renderProperties();
      }
    });
    li.querySelector("button[data-action=delete]")?.addEventListener("click", (event) => {
      event.stopPropagation();
      if (state.screens.length === 1) return;
      const index = state.screens.findIndex((entry) => entry.id === screen.id);
      state.screens.splice(index, 1);
      if (state.activeScreenId === screen.id) {
        state.activeScreenId = state.screens[0].id;
        state.selectedId = getActiveScreen().items[0]?.id || null;
      }
      saveState();
      render();
    });
    screenList.appendChild(li);
  });
  document.getElementById("active-screen-name").textContent = activeScreen?.name || "Pantalla";
}

function createScreen() {
  const id = `screen-${Date.now()}`;
  state.screens.push({
    id,
    name: `Pantalla ${state.screens.length + 1}`,
    items: [],
  });
  state.activeScreenId = id;
  state.selectedId = null;
  saveState();
  recordHistory();
  render();
}

function duplicateScreen() {
  const activeScreen = getActiveScreen();
  if (!activeScreen) return;
  const id = `screen-${Date.now()}`;
  state.screens.push({
    id,
    name: `${activeScreen.name} copia`,
    items: activeScreen.items.map((item) => ({ ...item, id: `item-${Date.now()}-${Math.random().toString(16).slice(2)}` })),
  });
  state.activeScreenId = id;
  state.selectedId = state.screens[state.screens.length - 1].items[0]?.id || null;
  saveState();
  recordHistory();
  render();
}

function renderCanvas() {
  canvas.innerHTML = "";
  canvas.classList.toggle("has-grid", state.canvas.showGrid);
  const bg = state.canvas;

  if (bg.bgType === "video" && bg.bgVideo) {
    const video = document.createElement("video");
    video.className = "canvas-bg-video";
    video.src = bg.bgVideo;
    video.autoplay = true;
    video.loop = bg.videoLoop;
    video.muted = bg.videoMuted;
    video.playsInline = true;
    canvas.appendChild(video);
    canvas.style.background = bg.bgGradient || bg.bgColor;
  } else if (bg.bgType === "image" && bg.bgImage) {
    canvas.style.background = `url(${bg.bgImage}) center / cover no-repeat`;
  } else if (bg.bgType === "gradient" && bg.bgGradient) {
    canvas.style.background = bg.bgGradient;
  } else {
    canvas.style.background = bg.bgColor;
  }

  getActiveItems().forEach((item, index) => {
    const element = document.createElement("div");
    element.className = `canvas-item ${item.type}`;
    element.dataset.id = item.id;
    if (state.selectedId === item.id) element.classList.add("selected");
    element.style.left = `${item.x}px`;
    element.style.top = `${item.y}px`;
    element.style.width = `${item.w}px`;
    element.style.height = `${item.h}px`;
    element.style.zIndex = index + 1;
    if (item.type !== "image") {
      element.style.background = item.bg;
      element.style.color = item.color;
      element.style.fontSize = `${item.fontSize}px`;
      element.textContent = item.text;
    } else {
      const img = document.createElement("img");
      img.src = item.src;
      img.alt = item.text || "Imagen";
      element.appendChild(img);
    }

    const handle = document.createElement("div");
    handle.className = "resize-handle";
    element.appendChild(handle);

    element.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      selectItem(item.id);

      const rect = canvas.getBoundingClientRect();
      const offsetX = event.clientX - rect.left - item.x;
      const offsetY = event.clientY - rect.top - item.y;

      if (event.target === handle) {
        dragState = {
          mode: "resize",
          id: item.id,
          startX: event.clientX,
          startY: event.clientY,
          startW: item.w,
          startH: item.h,
          hasMoved: false,
          clickItemId: item.id,
        };
      } else {
        dragState = {
          mode: "move",
          id: item.id,
          offsetX,
          offsetY,
          hasMoved: false,
          clickItemId: item.id,
        };
      }
      canvas.setPointerCapture(event.pointerId);
    });

    canvas.appendChild(element);
  });
}

function renderItemList() {
  itemList.innerHTML = "";
  getActiveItems()
    .slice()
    .reverse()
    .forEach((item) => {
      const li = document.createElement("li");
      li.draggable = true;
      li.className = state.selectedId === item.id ? "active" : "";
      const label =
        item.type === "image" ? "Imagen"
        : item.type === "button" ? "Botón"
        : item.type === "text" && item.bg !== "transparent" ? "Texto + panel"
        : item.type === "text" ? "Texto"
        : "Bloque";
    li.innerHTML = `<span>${label}</span><button type="button" aria-label="Seleccionar elemento">›</button>`;
    li.addEventListener("click", () => {
      selectItem(item.id);
    });
    li.addEventListener("dragstart", (event) => {
      dragLayerId = item.id;
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", item.id);
      li.classList.add("dragging");
    });
    li.addEventListener("dragend", () => {
      dragLayerId = null;
      li.classList.remove("dragging");
    });
    li.addEventListener("dragover", (event) => {
      event.preventDefault();
      li.classList.add("drag-over");
    });
    li.addEventListener("dragleave", () => {
      li.classList.remove("drag-over");
    });
    li.addEventListener("drop", (event) => {
      event.preventDefault();
      const draggedId = event.dataTransfer.getData("text/plain");
      if (draggedId) {
        moveLayer(draggedId, item.id);
      }
      li.classList.remove("drag-over");
    });
    itemList.appendChild(li);
  });
}

function renderProperties() {
  const item = getSelectedItem();
  if (!item) {
    propertiesPanel.classList.add("hidden");
    emptyState.classList.remove("hidden");
    return;
  }

  propertiesPanel.classList.remove("hidden");
  emptyState.classList.add("hidden");
  propType.textContent = item.type === "text" ? "Texto" : item.type === "box" ? "Bloque" : "Imagen";

  propTextRow.classList.toggle("hidden", item.type === "image");
  propLinkRow.classList.toggle("hidden", item.type !== "button");
  propTargetScreenRow.classList.toggle("hidden", item.type === "image");
  propImageRow.classList.toggle("hidden", item.type !== "image");
  propColorRow.classList.toggle("hidden", item.type === "image");
  propBgRow.classList.toggle("hidden", item.type === "image");
  propFontSizeRow.classList.toggle("hidden", item.type === "image");

  propText.value = item.text;
  propLink.value = item.link || "";
  propColor.value = item.color || "#ffffff";
  propBg.value = item.bg && item.bg !== "transparent" ? item.bg : "#154b88";
  propImageSrc.value = item.src || "";
  propFontSize.value = item.fontSize;
  propFontSizeVal.textContent = `${item.fontSize}px`;

  propTargetScreen.innerHTML = "";
  const screenOptions = getScreenOptions().filter((screen) => screen.id !== state.activeScreenId);
  const emptyOption = document.createElement("option");
  emptyOption.value = "";
  emptyOption.textContent = "Ninguna";
  propTargetScreen.appendChild(emptyOption);
  screenOptions.forEach((screen) => {
    const option = document.createElement("option");
    option.value = screen.id;
    option.textContent = screen.name;
    propTargetScreen.appendChild(option);
  });
  propTargetScreen.value = item.targetScreenId || "";
}

function renderBackgroundControls() {
  bgTypeSelect.value = state.canvas.bgType;
  bgColorGroup.classList.toggle("hidden", state.canvas.bgType !== "color");
  bgGradientGroup.classList.toggle("hidden", state.canvas.bgType !== "gradient");
  bgImageGroup.classList.toggle("hidden", state.canvas.bgType !== "image");
  bgVideoGroup.classList.toggle("hidden", state.canvas.bgType !== "video");
  bgImageUrlInput.value = state.canvas.bgImage || "";
  bgVideoUrlInput.value = state.canvas.bgVideo || "";
  bgVideoLoopCheckbox.checked = state.canvas.videoLoop;
  bgVideoMutedCheckbox.checked = state.canvas.videoMuted;
  gridToggle.checked = state.canvas.showGrid;
  snapGridToggle.checked = state.canvas.snapToGrid;
}

function selectItem(id) {
  state.selectedId = id;
  render();
}

function updateSelectedItem(updateFields) {
  const item = getSelectedItem();
  if (!item) return;
  Object.assign(item, updateFields);
  saveState();
  render();
}

function recordHistory() {
  historyStack.push(JSON.stringify(state));
  if (historyStack.length > 80) historyStack.shift();
  redoStack.length = 0;
  updateUndoRedoButtons();
}

function restoreState(serialized) {
  const parsed = JSON.parse(serialized);
  state.canvas = parsed.canvas;
  state.screens = Array.isArray(parsed.screens) ? parsed.screens : [];
  state.activeScreenId = parsed.activeScreenId || (state.screens[0] ? state.screens[0].id : "");
  state.selectedId = parsed.selectedId;
  saveState();
  render();
}

function undo() {
  if (historyStack.length < 2) return;
  const current = historyStack.pop();
  redoStack.push(current);
  const previous = historyStack[historyStack.length - 1];
  restoreState(previous);
  updateUndoRedoButtons();
}

function redo() {
  if (redoStack.length === 0) return;
  const next = redoStack.pop();
  historyStack.push(next);
  restoreState(next);
  updateUndoRedoButtons();
}

function updateUndoRedoButtons() {
  undoButton.disabled = historyStack.length < 2;
  redoButton.disabled = redoStack.length === 0;
}

function moveLayer(draggedId, targetId) {
  if (draggedId === targetId) return;
  const activeScreen = getActiveScreen();
  if (!activeScreen) return;
  const draggedIndex = activeScreen.items.findIndex((item) => item.id === draggedId);
  const targetIndex = activeScreen.items.findIndex((item) => item.id === targetId);
  if (draggedIndex === -1 || targetIndex === -1) return;
  const [draggedItem] = activeScreen.items.splice(draggedIndex, 1);
  activeScreen.items.splice(targetIndex, 0, draggedItem);
  state.selectedId = draggedId;
  saveState();
  recordHistory();
  render();
}

function onPropertyChange() {
  const item = getSelectedItem();
  if (!item) return;
  if (item.type !== "image") {
    item.text = propText.value;
    item.color = propColor.value;
    item.bg = propBg.value;
    item.fontSize = parseInt(propFontSize.value, 10);
    item.targetScreenId = propTargetScreen.value || "";
    if (item.type === "button") {
      item.link = propLink.value.trim();
    }
  } else {
    item.src = propImageSrc.value;
  }
  saveState();
  recordHistory();
  renderCanvas();
}

function handleCanvasPointerMove(event) {
  if (!dragState) return;
  const item = getActiveItems().find((entry) => entry.id === dragState.id);
  if (!item) return;
  const rect = canvas.getBoundingClientRect();
  const snap = state.canvas.snapToGrid ? 10 : 1;
  const dx = Math.abs(event.clientX - (dragState.startX || event.clientX));
  const dy = Math.abs(event.clientY - (dragState.startY || event.clientY));
  if (dx > 4 || dy > 4) {
    dragState.hasMoved = true;
  }
  if (dragState.mode === "move") {
    const x = clamp(event.clientX - rect.left - dragState.offsetX, 0, canvas.clientWidth - item.w);
    const y = clamp(event.clientY - rect.top - dragState.offsetY, 0, canvas.clientHeight - item.h);
    item.x = Math.round(x / snap) * snap;
    item.y = Math.round(y / snap) * snap;
  } else if (dragState.mode === "resize") {
    const dx = event.clientX - dragState.startX;
    const dy = event.clientY - dragState.startY;
    item.w = Math.round(clamp(dragState.startW + dx, 80, canvas.clientWidth - item.x) / snap) * snap;
    item.h = Math.round(clamp(dragState.startH + dy, 40, canvas.clientHeight - item.y) / snap) * snap;
  }
  renderCanvas();
  renderProperties();
}

function handleCanvasPointerUp() {
  if (!dragState) return;
  const clickedItemId = dragState.clickItemId;
  const wasClick = !dragState.hasMoved && dragState.mode === "move";
  const activeItems = getActiveItems();
  const clickedItem = activeItems.find((entry) => entry.id === clickedItemId);
  const targetScreenId = clickedItem?.targetScreenId;
  dragState = null;
  if (wasClick && targetScreenId) {
    selectScreen(targetScreenId);
    return;
  }
  saveState();
  recordHistory();
}

function render() {
  renderScreenList();
  renderBackgroundControls();
  renderCanvas();
  renderItemList();
  renderProperties();
}

function buildExportHtml() {
  const escaped = (value) => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  let canvasStyle = "";
  let bgMarkup = "";
  if (state.canvas.bgType === "video" && state.canvas.bgVideo) {
    canvasStyle = `background: ${state.canvas.bgGradient || state.canvas.bgColor};`;
    bgMarkup = `    <video class="canvas-bg-video" src="${escaped(state.canvas.bgVideo)}" autoplay loop ${state.canvas.videoMuted ? "muted" : ""} playsinline></video>\n`;
  } else if (state.canvas.bgType === "image" && state.canvas.bgImage) {
    canvasStyle = `background: url(${escaped(state.canvas.bgImage)}) center / cover no-repeat;`;
  } else if (state.canvas.bgType === "gradient" && state.canvas.bgGradient) {
    canvasStyle = `background: ${state.canvas.bgGradient};`;
  } else {
    canvasStyle = `background: ${state.canvas.bgColor};`;
  }

  const itemsHtml = getActiveItems()
    .map((item) => {
      const style = [`left: ${item.x}px;`, `top: ${item.y}px;`, `width: ${item.w}px;`, `height: ${item.h}px;`];
      if (item.type !== "image") {
        style.push(`background: ${item.bg};`, `color: ${item.color};`, `font-size: ${item.fontSize}px;`);
      }
      if (item.type === "image") {
        return `      <div class="canvas-item image" style="${style.join(" ")}"><img src="${escaped(item.src)}" alt="Imagen" /></div>`;
      }
      if (item.type === "button" && item.link) {
        return `      <a class="canvas-item button" href="${escaped(item.link)}" style="${style.join(" ")}">${escaped(item.text)}</a>`;
      }
      return `      <div class="canvas-item ${item.type}" style="${style.join(" ")}">${escaped(item.text)}</div>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Diseño exportado</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <main class="canvas exported-canvas" style="${canvasStyle}">
${bgMarkup}${itemsHtml}
  </main>
</body>
</html>`;
}

function buildExportCss() {
  const canvasBackground = (() => {
    if (state.canvas.bgType === "video" && state.canvas.bgVideo) {
      return "background: transparent;";
    }
    if (state.canvas.bgType === "image" && state.canvas.bgImage) {
      return `background: url(${state.canvas.bgImage}) center / cover no-repeat;`;
    }
    if (state.canvas.bgType === "gradient" && state.canvas.bgGradient) {
      return `background: ${state.canvas.bgGradient};`;
    }
    return `background: ${state.canvas.bgColor};`;
  })();

  return `:root {
  color-scheme: dark;
  color: #eef5ff;
  background: #07111e;
  font-family: Inter, system-ui, sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  background: linear-gradient(180deg, #07111e 0%, #04080f 100%);
}

.exported-canvas {
  position: relative;
  width: min(1200px, 100vw);
  max-width: 1200px;
  min-height: 100vh;
  margin: 0 auto;
  padding: 48px;
  overflow: hidden;
  ${canvasBackground}
}

@media (max-width: 900px) {
  .exported-canvas {
    padding: 24px;
    width: min(100%, 100vw);
  }
}

.canvas-bg-video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 0;
}

.exported-canvas > .canvas-item,
.exported-canvas > .canvas-bg-video + .canvas-item,
.exported-canvas > .canvas-bg-video + .canvas-item * {
  position: relative;
  z-index: 1;
}

.canvas-item {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 1rem;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  z-index: 1;
}

.canvas-item.button {
  text-decoration: none;
}

.canvas-item.text,
.canvas-item.box {
  font-weight: 600;
}

.canvas-item.image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
`;
}

function openExportModal() {
  exportTab = "html";
  setExportContent();
  tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === exportTab));
  exportModal.showModal();
}

function setExportContent() {
  exportTextarea.value = exportTab === "html" ? buildExportHtml() : buildExportCss();
}

function setupEventListeners() {
  document.getElementById("btn-add-text").addEventListener("click", () => createItem("text"));
  document.getElementById("btn-add-text-panel").addEventListener("click", () => createItem("text-panel"));
  document.getElementById("btn-add-box").addEventListener("click", () => createItem("box"));
  document.getElementById("btn-add-button").addEventListener("click", () => createItem("button"));
  document.getElementById("btn-add-image").addEventListener("click", () => createItem("image"));
  document.getElementById("btn-add-screen").addEventListener("click", createScreen);
  document.getElementById("btn-duplicate-screen").addEventListener("click", duplicateScreen);
  undoButton.addEventListener("click", undo);
  redoButton.addEventListener("click", redo);
  togglePanelsButton.addEventListener("click", () => {
    appContainer.classList.toggle("panels-hidden");
    togglePanelsButton.textContent = appContainer.classList.contains("panels-hidden") ? "Mostrar paneles" : "Ocultar paneles";
  });
  document.getElementById("btn-load-demo").addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    Object.assign(state, defaultState());
    saveState();
    render();
  });
  document.getElementById("btn-export").addEventListener("click", openExportModal);
  document.getElementById("btn-copy-export").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(exportTextarea.value);
    } catch {
      exportTextarea.select();
      document.execCommand("copy");
    }
  });
  document.getElementById("btn-download-export").addEventListener("click", () => {
    const blob = new Blob([exportTextarea.value], { type: exportTab === "html" ? "text/html" : "text/css" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = exportTab === "html" ? "index.html" : "styles.css";
    a.click();
    URL.revokeObjectURL(a.href);
  });
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      exportTab = tab.dataset.tab;
      tabs.forEach((t) => t.classList.toggle("active", t === tab));
      setExportContent();
    });
  });
  [propText, propColor, propBg, propImageSrc, propFontSize, propLink, propTargetScreen].forEach((control) => {
    control.addEventListener("input", onPropertyChange);
  });
  bgTypeSelect.addEventListener("change", () => {
    state.canvas.bgType = bgTypeSelect.value;
    saveState();
    recordHistory();
    render();
  });
  bgColorInput.addEventListener("input", () => {
    state.canvas.bgColor = bgColorInput.value;
    state.canvas.bgType = "color";
    saveState();
    recordHistory();
    render();
  });
  bgGradientInput.addEventListener("input", () => {
    state.canvas.bgGradient = bgGradientInput.value;
    state.canvas.bgType = "gradient";
    saveState();
    recordHistory();
    render();
  });
  bgImageUrlInput.addEventListener("change", () => {
    state.canvas.bgImage = bgImageUrlInput.value.trim();
    state.canvas.bgType = "image";
    saveState();
    recordHistory();
    render();
  });
  bgImageFileInput.addEventListener("change", () => {
    const file = bgImageFileInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      state.canvas.bgImage = reader.result;
      state.canvas.bgType = "image";
      saveState();
      recordHistory();
      render();
    };
    reader.readAsDataURL(file);
    bgImageFileInput.value = "";
  });
  bgVideoUrlInput.addEventListener("change", () => {
    state.canvas.bgVideo = bgVideoUrlInput.value.trim();
    state.canvas.bgType = "video";
    saveState();
    recordHistory();
    render();
  });
  bgVideoFileInput.addEventListener("change", () => {
    const file = bgVideoFileInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      state.canvas.bgVideo = reader.result;
      state.canvas.bgType = "video";
      saveState();
      recordHistory();
      render();
    };
    reader.readAsDataURL(file);
    bgVideoFileInput.value = "";
  });
  bgVideoLoopCheckbox.addEventListener("change", () => {
    state.canvas.videoLoop = bgVideoLoopCheckbox.checked;
    saveState();
    recordHistory();
    render();
  });
  bgVideoMutedCheckbox.addEventListener("change", () => {
    state.canvas.videoMuted = bgVideoMutedCheckbox.checked;
    saveState();
    recordHistory();
    render();
  });
  gridToggle.addEventListener("change", () => {
    state.canvas.showGrid = gridToggle.checked;
    saveState();
    recordHistory();
    render();
  });
  snapGridToggle.addEventListener("change", () => {
    state.canvas.snapToGrid = snapGridToggle.checked;
    saveState();
  });
  deleteButton.addEventListener("click", () => {
    const item = getSelectedItem();
    const activeScreen = getActiveScreen();
    if (!item || !activeScreen) return;
    activeScreen.items = activeScreen.items.filter((entry) => entry.id !== item.id);
    state.selectedId = activeScreen.items[0]?.id || null;
    saveState();
    recordHistory();
    render();
  });
  canvas.addEventListener("pointermove", handleCanvasPointerMove);
  canvas.addEventListener("pointerup", handleCanvasPointerUp);
  canvas.addEventListener("pointercancel", handleCanvasPointerUp);
  canvas.addEventListener("pointerleave", handleCanvasPointerUp);
}

function init() {
  bgColorInput.value = state.canvas.bgColor;
  bgGradientInput.value = state.canvas.bgGradient;
  setupEventListeners();
  historyStack = [JSON.stringify(state)];
  updateUndoRedoButtons();
  render();
}

init();
