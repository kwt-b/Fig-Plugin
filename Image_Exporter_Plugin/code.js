figma.showUI(__html__, { width: 400, height: 600 });

async function getSelectedFrame() {
  const selection = figma.currentPage.selection;
  const node =
    selection.length === 1 && selection[0].type === "FRAME"
      ? selection[0]
      : null;
  return node;
}

async function sendPreview() {
  const node = await getSelectedFrame();
  if (!node) {
    figma.ui.postMessage({ type: "no-frame" });
    return;
  }
  const previewBytes = await node.exportAsync({
    format: "PNG",
    constraint: { type: "SCALE", value: 1 },
  });
  const base64 = figma.base64Encode(previewBytes);
  figma.ui.postMessage({
    type: "frame-selected",
    name: node.name,
    preview: base64,
    width: node.width,
    height: node.height,
  });
}

figma.ui.onmessage = async (msg) => {
  if (msg.type === "request-frame") {
    await sendPreview();
  }

  if (msg.type === "export-frame") {
    const node = await getSelectedFrame();
    if (!node) {
      figma.ui.postMessage({ type: "error", message: "No frame selected." });
      return;
    }

    const format = msg.format;
    const scale = parseFloat(msg.scale || 1);

    let exportOptions;

    try {
      switch (format) {
        case "PDF":
        case "SVG":
          exportOptions = { format };
          break;
        case "AI": // Export as SVG but save as .ai
          exportOptions = { format: "PDF" };
          break;
        case "WEBP": // Export as SVG but save as .ai
          exportOptions = { format: "PNG" };
          break;
        default:
          exportOptions = {
            format,
            constraint: { type: "SCALE", value: scale },
          };
      }

      const bytes = await node.exportAsync(exportOptions);
      const base64 = figma.base64Encode(bytes);
      figma.ui.postMessage({
        type: "export-done",
        name: node.name,
        format: format === "AI" ? "ai" : format.toLowerCase(),
        bytes: base64,
      });
    } catch (err) {
      figma.ui.postMessage({
        type: "error",
        message: "Export failed: " + err.message,
      });
    }
  }
};

figma.on("selectionchange", () => {
  sendPreview();
});
