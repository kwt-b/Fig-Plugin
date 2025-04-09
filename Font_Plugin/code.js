figma.showUI(__html__, { width: 500, height: 600 }, { themeColors: true });

// Send fonts when plugin loads
function scanFontsFromSelection() {
  const selection = figma.currentPage.selection;
  const fontMap = new Map();

  const scanNode = (node) => {
    if (node.type === "TEXT" && typeof node.fontName === "object" && "family" in node.fontName) {
      const key = `${node.fontName.family}::${node.fontName.style}`;
      fontMap.set(key, node.fontName);
    } else if ("children" in node) {
      for (const child of node.children) scanNode(child);
    }
  };

  for (const node of selection) {
    scanNode(node);
  }

  figma.ui.postMessage({
    type: "fonts-detected",
    fonts: Array.from(fontMap.values()),
  });
}

// On selection change
figma.on("selectionchange", () => {
  scanFontsFromSelection();
});

figma.ui.onmessage = async (msg) => {
  if (msg.type === "replace-fonts") {
    const mappings = msg.mappings; // [{ source: {family, style}, dest: {family, style} }]

    const nodes = figma.currentPage.findAll();
    let count = 0;

    for (const node of nodes) {
      if (node.type === "TEXT") {
        for (const map of mappings) {
          try {
            const fontName = node.fontName;
            if (
              typeof fontName === "object" &&
              fontName.family === map.source.family &&
              fontName.style === map.source.style
            ) {
              await figma.loadFontAsync(map.dest);
              node.fontName = map.dest;
              count++;
            }
          } catch (e) {
            console.error("Error replacing font in node", node, e);
          }
        }
      }
    }

    figma.notify(`✅ Replaced ${count} text layer(s)`);
    figma.ui.postMessage({ type: "done", count });
  }
};

// Initial scan on plugin open
scanFontsFromSelection();
