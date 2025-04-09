// Font Replacement Plugin UI Script
// This script handles the UI for a font replacement plugin. It includes font detection, replacement, and user interaction.
// It is designed to work within a Figma plugin environment and uses the Figma API for font operations. 
// --- Load Font Data ---
  const allFontData = window.FONT_DATA || {};
  const allFontFamilies = Object.keys(allFontData);

 // --- DOM Elements ---
  const replaceBtn = document.getElementById("replaceBtn");
  const fontList = document.getElementById("fontList");
  const mainUI = document.getElementById("mainUI");
  const welcomeScreen = document.getElementById("welcomeScreen");
  const startBtn = document.getElementById("startBtn");

  let detectedFonts = [];
  let isReplacing = false;

  // --- Helpers ---
  function setReplaceButtonState(enabled, text = "Replace Fonts") {
    replaceBtn.disabled = !enabled;
    replaceBtn.style.opacity = enabled ? "1" : "0.5";
    replaceBtn.style.cursor = enabled ? "pointer" : "not-allowed";
    replaceBtn.textContent = text;
  }
  setReplaceButtonState(false, "Detecting Fonts...");

  // --- Autocomplete Input --- 
  function createAutocompleteInput(index, styleSelect, populateStyles) {
    const wrapper = document.createElement("div");
    wrapper.className = "autocomplete";

    const input = document.createElement("input");
    input.className = "font-input";
    input.placeholder = "Type replacement font...";
    input.setAttribute("data-index", index);
    input.setAttribute("autocomplete", "off");
    wrapper.appendChild(input);

    const suggestions = document.createElement("div");
    suggestions.className = "suggestions";
    suggestions.style.display = "none";
    wrapper.appendChild(suggestions);

    let debounceTimer;
    input.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const val = input.value.trim().toLowerCase();
        suggestions.innerHTML = "";

        if (!val) {
          suggestions.style.display = "none";
          return;
        }

        const startsWithMatches = allFontFamilies.filter(f => f.toLowerCase().startsWith(val));
        const includesMatches = allFontFamilies.filter(f => f.toLowerCase().includes(val) && !f.toLowerCase().startsWith(val));
        const matches = [...startsWithMatches, ...includesMatches].slice(0, 15);

        if (matches.length) {
          suggestions.style.display = "block";
          matches.forEach(font => {
            const div = document.createElement("div");
            div.textContent = font;
            div.onclick = () => {
              input.value = font;
              suggestions.style.display = "none";

              const availableStyles = allFontData[font] || ["Regular"];
              const currentSelectedStyle = styleSelect.value;
              populateStyles(availableStyles, currentSelectedStyle);
            };
            suggestions.appendChild(div);
          });
        } else {
          suggestions.style.display = "none";
        }
      }, 150);
    });

    document.addEventListener("click", (e) => {
      if (!wrapper.contains(e.target)) {
        suggestions.style.display = "none";
      }
    }, true);

    return { wrapper, input };
  }

  // --- Render UI --- 
  function renderFontMapUI(fonts) {
    fontList.innerHTML = "";

    if (!fonts || fonts.length === 0) {
      fontList.innerHTML = "<p style='text-align:center; color:#888; padding: 20px;'>No fonts detected in the selection.</p>";
      setReplaceButtonState(false, "No Fonts Detected");
      return;
    }

    fonts.forEach((font, i) => {
      const row = document.createElement("div");
      row.className = "font-row";
      row.dataset.originalFamily = font.family;
      row.dataset.originalStyle = font.style;

      const label = document.createElement("div");
      label.className = "font-label";
      label.innerHTML = `<strong>${font.family}</strong> <span style="color: #888">(${font.style})</span> →`;
      row.appendChild(label);

      // Style Select
      const styleSelect = document.createElement("select");
      styleSelect.id = `style-${i}`;
      styleSelect.className = "style-select";

      const populateStyles = (availableStyles, selectedStyle) => {
        styleSelect.innerHTML = "";
        availableStyles.forEach(style => {
          const opt = document.createElement("option");
          opt.value = style;
          opt.textContent = style;
          styleSelect.appendChild(opt);
        });
        styleSelect.value = availableStyles.includes(selectedStyle)
          ? selectedStyle
          : availableStyles.includes("Regular") ? "Regular" : availableStyles[0];
      };

      const defaultStyles = allFontData[font.family] || ["Regular"];
      populateStyles(defaultStyles, font.style);
      row.appendChild(styleSelect);

      // Font Input with autocomplete
      const { wrapper: inputWrapper, input } = createAutocompleteInput(i, styleSelect, populateStyles);
      input.id = `family-${i}`;
      row.appendChild(inputWrapper);

      fontList.appendChild(row);
    });

    setReplaceButtonState(true, "Replace Fonts");
    fontList.scrollTop = fontList.scrollHeight;
  }

  // --- Events ---
  startBtn.onclick = () => {
    welcomeScreen.style.display = "none";
    mainUI.style.display = "block";
    fontList.innerHTML = "<p style='text-align:center; color:#888; padding: 20px;'>Waiting for font detection results...</p>";
  };

  replaceBtn.onclick = () => {
    if (replaceBtn.disabled || isReplacing) return;

    const mappings = [];
    const fontRows = fontList.querySelectorAll(".font-row");

    fontRows.forEach((row, i) => {
      const familyInput = row.querySelector(`#family-${i}`);
      const styleSelect = row.querySelector(`#style-${i}`);
      const destFamily = familyInput?.value.trim();
      if (destFamily) {
        mappings.push({
          source: {
            family: row.dataset.originalFamily,
            style: row.dataset.originalStyle,
          },
          dest: {
            family: destFamily,
            style: styleSelect?.value || "Regular",
          },
        });
      }
    });

    if (mappings.length === 0) {
      alert("Please enter at least one replacement font.");
      return;
    }

    isReplacing = true;
    setReplaceButtonState(false, "Replacing...");

    parent.postMessage({ pluginMessage: { type: "replace-fonts", mappings } }, "*");

    setTimeout(() => {
      setReplaceButtonState(true, "Replace Fonts");
      isReplacing = false;
    }, 1000);
  };

  // --- Message Receiver ---
  window.onmessage = (event) => {
    const msg = event.data.pluginMessage;
    if (!msg) return;

    if (msg.type === "fonts-detected") {
      isReplacing = false;
      detectedFonts = msg.fonts || [];
      renderFontMapUI(detectedFonts);
    }

    if (msg.type === "error" || msg.type === "replacement-error") {
      isReplacing = false;
      setReplaceButtonState(true, "Replace Fonts");
      alert(`An error occurred: ${msg.error || 'Unknown error'}`);
    }
  };
