// html2canvas CDN is loaded in index.html

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const uploadButton = document.getElementById('upload-button');
    const clearAllButton = document.getElementById('clear-all-button');
    const randomizeButton = document.getElementById('randomize-button');
    const saveButton = document.getElementById('save-button');
    const loadButton = document.getElementById('load-button');
    const downloadButton = document.getElementById('download-button');
    const imageUploadInput = document.getElementById('image-upload');
    const wheelContainer = document.getElementById('wheel-container');
    const placeholderText = document.getElementById('placeholder-text');
    const outlineToggle = document.getElementById('outline-toggle');
    const outlineToggleContainer = document.getElementById('outline-toggle-container');
    const outlineColorPicker = document.getElementById('outline-color-picker');
    const wheelBgColorPicker = document.getElementById('wheel-bg-color-picker');
    const labelTextColorPicker = document.getElementById('label-text-color-picker');
    const labelBgColorPicker = document.getElementById('label-bg-color-picker');
    const downloadScaleInput = document.getElementById('download-scale-input');
    const downloadFormatRadios = document.querySelectorAll('input[name="download-format"]');
    const jpgQualityContainer = document.getElementById('jpg-quality-container');
    const jpgQualitySlider = document.getElementById('jpg-quality-slider');
    const jpgQualityValueSpan = document.getElementById('jpg-quality-value');
    const customizationOptions = document.getElementById('customization-options');
    const imageListSection = document.getElementById('image-list-section');
    const imageListContainer = document.getElementById('image-list-container');
    const imageListPlaceholder = document.getElementById('image-list-placeholder');

    // --- Global State ---
    let loadedCharacters = [];
    let currentRadius = 0;
    let currentImageSize = 0;
    const DOWNLOAD_BASE_RESOLUTION_SCALE = 4;
    const MAX_SAVABLE_IMAGE_DIMENSION = 1000;
    let draggedItemIndex = null;

    // --- Initial UI State ---
    function resetUI() {
        // Keep customization and image list sections visible
        downloadButton.style.display = 'none';
        clearAllButton.style.display = 'none';
        randomizeButton.style.display = 'none';
        saveButton.style.display = 'none';
        loadButton.style.display = 'inline-block'; // Load button always visible

        wheelContainer.innerHTML = '';
        placeholderText.classList.remove('hidden');
        imageListContainer.innerHTML = '';
        imageListPlaceholder.classList.remove('hidden');
        wheelContainer.style.width = '600px';
        wheelContainer.style.height = '600px';

        // Reset color pickers and toggle
        outlineColorPicker.value = "#6366f1";
        wheelBgColorPicker.value = "#FFFFFF";
        labelTextColorPicker.value = "#FFFFFF";
        labelBgColorPicker.value = "#636363"; // Default label background color to grey (rgb 99,99,99)
        outlineToggle.checked = true;

        // Reset download options
        downloadScaleInput.value = DOWNLOAD_BASE_RESOLUTION_SCALE;
        document.querySelector('input[name="download-format"][value="png"]').checked = true;
        jpgQualitySlider.value = 1.0; // Default JPEG quality to 1.0
        jpgQualityValueSpan.textContent = 1.0; // Update display
        jpgQualityContainer.style.display = 'none';

        applyColorsAndOutlines(); // Apply to live view
    }
    resetUI(); // Call on initial load

    loadState(); // Attempt to load state on startup

    // --- Event Listeners ---
    uploadButton.addEventListener('click', () => imageUploadInput.click());
    imageUploadInput.addEventListener('change', handleImageUpload);
    downloadButton.addEventListener('click', downloadWheelAsImage);
    clearAllButton.addEventListener('click', clearAllImages);
    randomizeButton.addEventListener('click', randomizeOrder);
    saveButton.addEventListener('click', saveState);
    loadButton.addEventListener('click', loadState);

    outlineColorPicker.addEventListener('input', applyColorsAndOutlines);
    wheelBgColorPicker.addEventListener('input', applyColorsAndOutlines);
    labelTextColorPicker.addEventListener('input', applyColorsAndOutlines);
    labelBgColorPicker.addEventListener('input', applyColorsAndOutlines);
    outlineToggle.addEventListener('change', applyColorsAndOutlines);

    downloadScaleInput.addEventListener('input', () => {
        let val = parseInt(downloadScaleInput.value);
        if (isNaN(val) || val < 1) {
            downloadScaleInput.value = 1;
        } else if (val > 10) {
            downloadScaleInput.value = 10;
        }
    });

    downloadFormatRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'jpeg') {
                jpgQualityContainer.style.display = 'flex';
            } else {
                jpgQualityContainer.style.display = 'none';
            }
        });
    });

    jpgQualitySlider.addEventListener('input', () => {
        jpgQualityValueSpan.textContent = parseFloat(jpgQualitySlider.value).toFixed(2);
    });


    // --- Helper to apply colors and outlines to live view ---
    function applyColorsAndOutlines() {
        document.documentElement.style.setProperty('--outline-color', outlineColorPicker.value);
        document.documentElement.style.setProperty('--wheel-bg-color', wheelBgColorPicker.value);
        document.documentElement.style.setProperty('--label-text-color', labelTextColorPicker.value);
        document.documentElement.style.setProperty('--label-bg-color', labelBgColorPicker.value);

        const wrappers = wheelContainer.querySelectorAll('.character-image-wrapper');
        const showOutlines = outlineToggle.checked;
        const outlineColor = outlineColorPicker.value;

        wrappers.forEach(wrapper => {
            if (showOutlines) {
                wrapper.style.border = `3px solid ${outlineColor}`;
                wrapper.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
                wrapper.style.backgroundColor = '#e2e8f0';
            } else {
                wrapper.style.border = 'none';
                wrapper.style.boxShadow = 'none';
                wrapper.style.backgroundColor = 'transparent';
            }
        });
    }


    // --- Core Functions ---

    function handleImageUpload(event) {
        const files = event.target.files;
        if (files.length === 0) return;

        let imagesProcessedCount = 0;
        const newCharactersToAdd = [];

        Array.from(files).forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const charId = crypto.randomUUID();
                    newCharactersToAdd.push({ id: charId, url: e.target.result, label: '' });
                    imagesProcessedCount++;
                    if (imagesProcessedCount === files.length) {
                        loadedCharacters = loadedCharacters.concat(newCharactersToAdd);
                        postUploadSetup();
                    }
                };
                reader.readAsDataURL(file);
                    }
        });
    }

    function postUploadSetup() {
        drawCharacterWheel(loadedCharacters);
        renderImageList(loadedCharacters);
        downloadButton.style.display = 'inline-block';
        clearAllButton.style.display = 'inline-block';
        randomizeButton.style.display = 'inline-block';
        saveButton.style.display = 'inline-block';
        applyColorsAndOutlines();
    }

    /**
     * Draws the character images in a circular arrangement within the wheel container.
     * @param {Array<Object>} characters - An array of character objects {id, url, label}.
     */
    function drawCharacterWheel(characters) {
        const numImages = characters.length;
        wheelContainer.innerHTML = '';
        if (numImages === 0) {
            placeholderText.classList.remove('hidden');
            wheelContainer.style.width = '600px';
            wheelContainer.style.height = '600px';
            return;
        }
        placeholderText.classList.add('hidden');

        currentImageSize = window.innerWidth <= 768 ? 60 : 80;
        const imagePadding = currentImageSize * 0.25;

        if (numImages < 5) {
            currentRadius = Math.max(100, (numImages * (currentImageSize + imagePadding)) / (2 * Math.PI));
        } else {
            currentRadius = (numImages * (currentImageSize + imagePadding)) / (2 * Math.PI);
        }

        const labelHeight = 20;
        const labelClearance = 15;

        const maxRadialExtension = currentRadius + (currentImageSize / 2) + labelClearance + (labelHeight / 2);
        const dynamicContainerSize = (maxRadialExtension * 2) + (imagePadding * 2);

        wheelContainer.style.width = `${dynamicContainerSize}px`;
        wheelContainer.style.height = `${dynamicContainerSize}px`;

        const centerX = wheelContainer.offsetWidth / 2;
        const centerY = wheelContainer.offsetHeight / 2;

        const startAngleOffset = -90;

        characters.forEach((char, index) => {
            const angle = (index * (360 / numImages)) + startAngleOffset;
            const angleRad = angle * (Math.PI / 180);

            const imgX = centerX + currentRadius * Math.cos(angleRad) - (currentImageSize / 2);
            const imgY = centerY + currentRadius * Math.sin(angleRad) - (currentImageSize / 2);

            const imgWrapper = document.createElement('div');
            imgWrapper.classList.add('character-image-wrapper');
            imgWrapper.style.width = `${currentImageSize}px`;
            imgWrapper.style.height = `${currentImageSize}px`;
            imgWrapper.style.left = `${imgX}px`;
            imgWrapper.style.top = `${imgY}px`;
            imgWrapper.dataset.charId = char.id;

            const img = document.createElement('img');
            img.src = char.url;
            img.alt = `Character ${char.label || index + 1}`;
            imgWrapper.appendChild(img);
            wheelContainer.appendChild(imgWrapper);

            if (char.label) {
                const labelDiv = document.createElement('div');
                labelDiv.classList.add('character-label');
                labelDiv.textContent = char.label;

                const labelOffsetFromWheelCenter = currentRadius + (currentImageSize / 2) + labelClearance + (labelHeight / 2);

                const labelX = centerX + labelOffsetFromWheelCenter * Math.cos(angleRad);
                const labelY = centerY + labelOffsetFromWheelCenter * Math.sin(angleRad);

                labelDiv.style.left = `${labelX}px`;
                labelDiv.style.top = `${labelY}px`;
                wheelContainer.appendChild(labelDiv);
            }
        });
        applyColorsAndOutlines();
    }

    /**
     * Renders the draggable list of images for reordering.
     * @param {Array<Object>} characters - An array of character objects {id, url, label}.
     */
    function renderImageList(characters) {
        imageListContainer.innerHTML = '';
        if (characters.length === 0) {
            imageListPlaceholder.classList.remove('hidden');
            return;
        }
        imageListPlaceholder.classList.add('hidden');

        characters.forEach((char, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.classList.add('draggable-image-item');
            itemDiv.setAttribute('draggable', 'true');
            itemDiv.dataset.index = index;
            itemDiv.dataset.charId = char.id;

            const imgThumbnailWrapper = document.createElement('div');
            imgThumbnailWrapper.classList.add('image-thumbnail');
            const img = document.createElement('img');
            img.src = char.url;
            img.alt = `Character ${char.label || index + 1}`;
            img.loading = 'lazy';
            imgThumbnailWrapper.appendChild(img);
            itemDiv.appendChild(imgThumbnailWrapper);


            const labelInput = document.createElement('input');
            labelInput.type = 'text';
            labelInput.classList.add('label-input');
            labelInput.placeholder = 'Label (optional)';
            labelInput.value = char.label;
            labelInput.addEventListener('input', (e) => {
                const charIndex = loadedCharacters.findIndex(c => c.id === char.id);
                if (charIndex !== -1) {
                    loadedCharacters[charIndex].label = e.target.value;
                    drawCharacterWheel(loadedCharacters);
                }
            });
            itemDiv.appendChild(labelInput);

            const indexOverlay = document.createElement('div');
            indexOverlay.classList.add('index-overlay');
            indexOverlay.textContent = index + 1;
            itemDiv.appendChild(indexOverlay);

            const removeBtn = document.createElement('button');
            removeBtn.classList.add('remove-btn');
            removeBtn.textContent = 'X';
            removeBtn.title = 'Remove Character';
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                removeCharacter(char.id);
            });
            itemDiv.appendChild(removeBtn);

            imageListContainer.appendChild(itemDiv);
        });

        addDragDropListeners();
    }

    /**
     * Adds drag and drop event listeners to the image list items.
     */
    function addDragDropListeners() {
        const items = imageListContainer.querySelectorAll('.draggable-image-item');

        items.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') {
                    e.preventDefault();
                    return;
                }

                draggedItemIndex = parseInt(item.dataset.index);
                item.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';

                const img = new Image();
                img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
                e.dataTransfer.setDragImage(img, 0, 0);

                setTimeout(() => {
                    item.style.opacity = '0.5';
                }, 0);
            });

            item.addEventListener('dragend', (e) => {
                e.target.classList.remove('dragging');
                e.target.style.opacity = '1';
                draggedItemIndex = null;
                items.forEach(el => el.classList.remove('drag-over'));
            });

            item.addEventListener('dragenter', (e) => {
                e.preventDefault();
                const targetItem = e.target.closest('.draggable-image-item');
                if (targetItem && draggedItemIndex !== null) {
                    targetItem.classList.add('drag-over');
                }
            });

            item.addEventListener('dragleave', (e) => {
                const targetItem = e.target.closest('.draggable-image-item');
                if (targetItem) {
                    targetItem.classList.remove('drag-over');
                }
            });

            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                const targetItem = e.target.closest('.draggable-image-item');
                if (targetItem && draggedItemIndex !== null) {
                    items.forEach(el => {
                        if (el !== targetItem) {
                            el.classList.remove('drag-over');
                        }
                    });
                    targetItem.classList.add('drag-over');
                }
            });

            item.addEventListener('drop', (e) => {
                e.preventDefault();
                const dropTarget = e.target.closest('.draggable-image-item');
                if (dropTarget && draggedItemIndex !== null) {
                    const dropTargetIndex = parseInt(dropTarget.dataset.index);

                    if (draggedItemIndex !== dropTargetIndex) {
                        const [draggedCharacter] = loadedCharacters.splice(draggedItemIndex, 1);
                        loadedCharacters.splice(dropTargetIndex, 0, draggedCharacter);

                        renderImageList(loadedCharacters);
                        drawCharacterWheel(loadedCharacters);
                    }
                }
                items.forEach(el => el.classList.remove('drag-over'));
            });
        });
    }

    function removeCharacter(charIdToRemove) {
        loadedCharacters = loadedCharacters.filter(char => char.id !== charIdToRemove);
        if (loadedCharacters.length === 0) {
            resetUI();
        } else {
            renderImageList(loadedCharacters);
            drawCharacterWheel(loadedCharacters);
        }
    }

    function clearAllImages() {
        loadedCharacters = [];
        resetUI();
    }

    function randomizeOrder() {
        for (let i = loadedCharacters.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [loadedCharacters[i], loadedCharacters[j]] = [loadedCharacters[j], loadedCharacters[i]];
        }
        renderImageList(loadedCharacters);
        drawCharacterWheel(loadedCharacters);
    }

    /**
     * Resizes a base64 image data URL to a maximum specified longest side, maintaining aspect ratio.
     * Returns a Promise resolving with the new base64 URL.
     * @param {string} imageDataUrl - The base64 data URL of the image.
     * @param {number} maxLength - The maximum desired length for the longest side (width or height).
     * @returns {Promise<string>} - A promise that resolves with the resized base64 data URL.
     */
    async function resizeImageForLocalStorage(imageDataUrl, maxLength) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                if (width <= maxLength && height <= maxLength) {
                    resolve(imageDataUrl);
                    return;
                }

                if (width > height) {
                    height = Math.round(height * (maxLength / width));
                    width = maxLength;
                } else {
                    width = Math.round(width * (maxLength / height));
                    height = maxLength;
                }

                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = width;
                canvas.height = height;

                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.onerror = () => {
                console.warn("Failed to load image for resizing, skipping:", imageDataUrl.substring(0, 50) + "...");
                resolve(imageDataUrl);
            };
            img.src = imageDataUrl;
        });
    }

    async function saveState() {
        try {
            let imagesResized = 0;
            const savableCharactersPromises = loadedCharacters.map(async char => {
                if (char.url) {
                    const originalImg = new Image();
                    await new Promise(resolve => {
                        originalImg.onload = resolve;
                        originalImg.onerror = () => {
                            console.warn(`Failed to load original image for size check: ${char.id}`);
                            resolve();
                        };
                        originalImg.src = char.url;
                    });

                    if (originalImg.width > MAX_SAVABLE_IMAGE_DIMENSION || originalImg.height > MAX_SAVABLE_IMAGE_DIMENSION) {
                        imagesResized++;
                        const resizedUrl = await resizeImageForLocalStorage(char.url, MAX_SAVABLE_IMAGE_DIMENSION);
                        return { id: char.id, url: resizedUrl, label: char.label };
                    } else {
                        return { id: char.id, url: char.url, label: char.label };
                    }
                }
                return char;
            });

            const savableCharacters = await Promise.all(savableCharactersPromises);

            const stateToSave = {
                characters: savableCharacters,
                outlineColor: outlineColorPicker.value,
                wheelBgColor: wheelBgColorPicker.value,
                labelTextColor: labelTextColorPicker.value,
                labelBgColor: labelBgColorPicker.value,
                outlineToggleChecked: outlineToggle.checked
            };
            localStorage.setItem('characterWheelConfig', JSON.stringify(stateToSave));

            let message = "Wheel configuration saved successfully!";
            let messageType = "green";
            if (imagesResized > 0) {
                message = `Configuration saved! Note: ${imagesResized} image(s) were resized to fit within the ${MAX_SAVABLE_IMAGE_DIMENSION}px limit for saving.`;
                messageType = "blue";
            }
            displayMessageBox(message, messageType);

        } catch (e) {
            console.error("Failed to save state to local storage:", e);
            let errorMessage = "Failed to save wheel state. Local storage might be full or blocked.";
            if (e.name === "QuotaExceededError") {
                errorMessage += " Please try reducing the number or size of images.";
            }
            displayMessageBox(errorMessage, "red");
        }
    }

    async function loadState() {
        try {
            const savedConfig = localStorage.getItem('characterWheelConfig');
            if (savedConfig) {
                const parsedConfig = JSON.parse(savedConfig);
                loadedCharacters = parsedConfig.characters || [];

                outlineColorPicker.value = parsedConfig.outlineColor || "#6366f1";
                wheelBgColorPicker.value = parsedConfig.wheelBgColor || "#FFFFFF";
                labelTextColorPicker.value = parsedConfig.labelTextColor || "#FFFFFF";
                labelBgColorPicker.value = parsedConfig.labelBgColor || "#636363"; // Set default grey color on load
                outlineToggle.checked = parsedConfig.outlineToggleChecked !== undefined ? parsedConfig.outlineToggleChecked : true;


                if (loadedCharacters.length > 0) {
                    const preloadPromises = loadedCharacters.map(char => {
                        if (char.url) {
                            return new Promise((resolve) => {
                                const img = new Image();
                                img.onload = resolve;
                                img.onerror = () => {
                                    console.warn(`Failed to preload image: ${char.id}. It might not display correctly.`);
                                    resolve();
                                };
                                img.src = char.url;
                            });
                        }
                        return Promise.resolve();
                    });
                    await Promise.all(preloadPromises);

                    postUploadSetup();
                    displayMessageBox("Wheel configuration loaded successfully!", "green");
                } else {
                    resetUI();
                    displayMessageBox("No saved wheel state found or loaded state is empty.", "blue");
                }
            } else {
                console.log("No saved wheel state found.");
                resetUI();
            }
        } catch (e) {
            console.error("Failed to load state from local storage:", e);
            displayMessageBox(`Failed to load wheel state. Data might be corrupted. (${e.message})`, "red");
            resetUI();
        }
    }

    // Custom message box function (replaces alert/confirm)
    function displayMessageBox(message, type = "info") {
        const existingBox = document.querySelector('.message-box');
        if (existingBox) existingBox.remove();

        const messageBox = document.createElement('div');
        messageBox.classList.add('message-box', 'fixed', 'top-1/2', 'left-1/2', '-translate-x-1/2', '-translate-y-1/2', 'bg-white', 'p-6', 'rounded-lg', 'shadow-xl', 'z-50', 'text-center');
        messageBox.style.maxWidth = 'calc(100vw - 40px)';

        let textColor = 'text-gray-800';
        let buttonBg = 'bg-blue-500 hover:bg-blue-600';
        if (type === 'red') {
            textColor = 'text-red-600';
            buttonBg = 'bg-red-500 hover:bg-red-600';
        } else if (type === 'green') {
            textColor = 'text-green-600';
            buttonBg = 'bg-green-500 hover:bg-green-600';
        } else if (type === 'blue') {
             textColor = 'text-blue-600';
             buttonBg = 'bg-blue-500 hover:bg-blue-600';
        }

        messageBox.innerHTML = `
            <p class="font-bold mb-2 ${textColor}">${message}</p>
            <button class="mt-4 ${buttonBg} text-white font-bold py-2 px-4 rounded-lg">Close</button>
        `;
        document.body.appendChild(messageBox);

        messageBox.querySelector('button').addEventListener('click', () => {
            messageBox.remove();
        });

        if (type === 'green' || type === 'blue') {
            setTimeout(() => {
                if (messageBox.parentNode) messageBox.remove();
            }, 5000);
        }
    }


    /**
     * Crops an image into a circle while preserving its aspect ratio.
     * @param {string} imageUrl - The URL of the image to crop.
     * @param {number} size - The desired diameter of the circular output image (at display resolution).
     * @param {number} scaleFactor - The factor by which to increase the processing resolution.
     * @returns {Promise<string>} A promise that resolves with the data URL of the cropped image.
     */
    async function getCircularCroppedImage(imageUrl, size, scaleFactor) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const hiResSize = size * scaleFactor;
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = hiResSize;
                canvas.height = hiResSize;

                ctx.beginPath();
                ctx.arc(hiResSize / 2, hiResSize / 2, hiResSize / 2, 0, Math.PI * 2, true);
                ctx.closePath();
                ctx.clip();

                const imgAspectRatio = img.width / img.height;
                const targetAspectRatio = 1;

                let sx, sy, sWidth, sHeight;

                if (imgAspectRatio > targetAspectRatio) {
                    sHeight = img.height;
                    sWidth = img.height * targetAspectRatio;
                    sx = (img.width - sWidth) / 2;
                    sy = 0;
                } else {
                    sWidth = img.width;
                    sHeight = img.width / targetAspectRatio;
                    sx = 0;
                    sy = (img.height - sHeight) / 2;
                }
                ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, hiResSize, hiResSize);
                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = () => {
                console.error(`Failed to load image for circular cropping: ${imageUrl}`);
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = size;
                canvas.height = size;
                ctx.clearRect(0, 0, size, size);
                resolve(canvas.toDataURL('image/png'));
            };
            img.src = imageUrl;
        });
    }

    /**
     * Creates a canvas with the given text perfectly centered, with a background.
     * @param {string} text - The text to draw.
     * @param {number} fontSize - The font size in pixels.
     * @param {number} paddingX - Horizontal padding.
     * @param {number} paddingY - Vertical padding.
     * @param {string} textColor - Text color.
     * @param {string} bgColor - Background color (e.g., 'rgba(0,0,0,0.6)').
     * @param {number} borderRadius - Border radius in pixels.
     * @returns {Promise<string>} Data URL of the canvas image.
     */
    async function createCenteredTextCanvas(text, fontSize, paddingX, paddingY, textColor, bgColor, borderRadius) {
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');

        tempCtx.font = `${fontSize}px Inter, sans-serif`;
        const textMetrics = tempCtx.measureText(text);
        const textWidth = textMetrics.width;
        const textHeight = fontSize;

        const canvasWidth = textWidth + (paddingX * 2);
        const canvasHeight = textHeight + (paddingY * 2);

        tempCanvas.width = canvasWidth;
        tempCanvas.height = canvasHeight;

        tempCtx.font = `${fontSize}px Inter, sans-serif`;
        tempCtx.textAlign = 'center';
        tempCtx.textBaseline = 'middle';
        tempCtx.fillStyle = textColor;

        tempCtx.fillStyle = bgColor;
        tempCtx.beginPath();
        tempCtx.moveTo(borderRadius, 0);
        tempCtx.lineTo(canvasWidth - borderRadius, 0);
        tempCtx.quadraticCurveTo(canvasWidth, 0, canvasWidth, borderRadius);
        tempCtx.lineTo(canvasWidth, canvasHeight - borderRadius);
        tempCtx.quadraticCurveTo(canvasWidth, canvasHeight, canvasWidth - borderRadius, canvasHeight);
        tempCtx.lineTo(borderRadius, canvasHeight);
        tempCtx.quadraticCurveTo(0, canvasHeight, 0, canvasHeight - borderRadius);
        tempCtx.lineTo(0, borderRadius);
        tempCtx.quadraticCurveTo(0, 0, borderRadius, 0);
        tempCtx.closePath();
        tempCtx.fill();

        tempCtx.fillStyle = textColor;
        tempCtx.fillText(text, canvasWidth / 2, canvasHeight / 2);

        return tempCanvas.toDataURL('image/png');
    }


    /**
     * Captures the character wheel and downloads it as a PNG image.
     */
    async function downloadWheelAsImage() {
        if (loadedCharacters.length === 0) {
            displayMessageBox("No images to download. Please upload characters first!", "red");
            return;
        }

        const includeOutlines = outlineToggle.checked;
        const downloadOutlineColor = outlineColorPicker.value;
        const downloadBgColor = wheelBgColorPicker.value;
        const downloadLabelTextColor = labelTextColorPicker.value;
        const downloadLabelBgColor = labelBgColorPicker.value;

        const downloadScale = parseFloat(downloadScaleInput.value);
        const downloadFormat = document.querySelector('input[name="download-format"]:checked').value;
        const downloadJpgQuality = parseFloat(jpgQualitySlider.value);


        const baseLabelPaddingX = 5;
        const baseLabelPaddingY = 2;
        const baseLabelFontSize = 0.75 * 16;

        const scaledLabelPaddingX = baseLabelPaddingX * downloadScale;
        const scaledLabelPaddingY = baseLabelPaddingY * downloadScale;
        const scaledLabelFontSize = baseLabelFontSize * downloadScale;
        const scaledLabelBorderRadius = 0.25 * 16 * downloadScale;


        const scaledImageSize = currentImageSize * downloadScale;
        const scaledRadius = currentRadius * downloadScale;

        const labelClearanceDownload = 15 * downloadScale;

        const estimatedLabelHeightForCanvas = scaledLabelFontSize + (scaledLabelPaddingY * 2);

        const maxRadialExtension = scaledRadius + (scaledImageSize / 2) + labelClearanceDownload + (estimatedLabelHeightForCanvas / 2);
        const downloadContainerDim = (maxRadialExtension * 2);

        const canvasPadding = scaledImageSize;
        const canvasWidth = downloadContainerDim + (canvasPadding * 2);
        const canvasHeight = downloadContainerDim + (canvasPadding * 2);


        const downloadDiv = document.createElement('div');
        downloadDiv.style.width = `${canvasWidth}px`;
        downloadDiv.style.height = `${canvasHeight}px`;
        downloadDiv.style.backgroundColor = downloadBgColor;
        downloadDiv.style.position = 'absolute';
        downloadDiv.style.left = '-9999px';
        downloadDiv.style.top = '-9999px';
        downloadDiv.style.overflow = 'hidden';

        document.body.appendChild(downloadDiv);

        const downloadCenterX = canvasWidth / 2;
        const downloadCenterY = canvasHeight / 2;


        const preprocessedImagePromises = loadedCharacters.map(char =>
            char.url ? getCircularCroppedImage(char.url, currentImageSize, downloadScale) : Promise.resolve(null)
        );
        const preprocessedImages = await Promise.all(preprocessedImagePromises);

        const labelImagePromises = loadedCharacters.map(char =>
            char.label ? createCenteredTextCanvas(
                char.label,
                scaledLabelFontSize,
                scaledLabelPaddingX,
                scaledLabelPaddingY,
                downloadLabelTextColor,
                downloadLabelBgColor,
                scaledLabelBorderRadius
            ) : Promise.resolve(null)
        );
        const preprocessedLabelDataUrls = await Promise.all(labelImagePromises);


        const startAngleOffset = -90;

        const finalLabelImageLoadPromises = [];

        loadedCharacters.forEach((char, index) => {
            const numImages = loadedCharacters.length;
            const angle = (index * (360 / numImages)) + startAngleOffset;
            const angleRad = angle * (Math.PI / 180);

            const scaledImageSize = currentImageSize * downloadScale;
            const scaledRadius = currentRadius * downloadScale;

            const imgX = downloadCenterX + scaledRadius * Math.cos(angleRad) - (scaledImageSize / 2);
            const imgY = downloadCenterY + scaledRadius * Math.sin(angleRad) - (scaledImageSize / 2);

            const imgWrapper = document.createElement('div');
            imgWrapper.style.position = 'absolute';
            imgWrapper.style.width = `${scaledImageSize}px`;
            imgWrapper.style.height = `${scaledImageSize}px`;
            imgWrapper.style.left = `${imgX}px`;
            imgWrapper.style.top = `${imgY}px`;
            imgWrapper.style.borderRadius = '9999px';
            imgWrapper.style.overflow = 'hidden';
            imgWrapper.style.backgroundColor = '#e2e8f0';

            if (includeOutlines) {
                const scaledBorderWidth = 3 * downloadScale;
                const scaledBoxShadowOffset = 4 * downloadScale;
                imgWrapper.style.border = `${scaledBorderWidth}px solid ${downloadOutlineColor}`;
                imgWrapper.style.boxShadow = `0 ${scaledBoxShadowOffset}px ${scaledBoxShadowOffset * 1.5}px -1px rgba(0, 0, 0, 0.1), 0 ${scaledBoxShadowOffset / 2}px ${scaledBoxShadowOffset}px -1px rgba(0, 0, 0, 0.06)`;
            } else {
                imgWrapper.style.border = 'none';
                imgWrapper.style.boxShadow = 'none';
            }

            const imageDataUrl = preprocessedImages[index];
            if (imageDataUrl) {
                const img = document.createElement('img');
                img.src = imageDataUrl;
                img.alt = `Character ${char.label || index + 1}`;
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'cover';
                img.style.borderRadius = '9999px';
                imgWrapper.appendChild(img);
            }
            downloadDiv.appendChild(imgWrapper);

            const labelDataUrl = preprocessedLabelDataUrls[index];
            if (char.label && labelDataUrl) {
                const labelImg = document.createElement('img');
                labelImg.src = labelDataUrl;
                labelImg.alt = `Label for ${char.label}`;
                labelImg.style.position = 'absolute';
                labelImg.style.zIndex = '10';

                const loadLabelPromise = new Promise(resolve => {
                    labelImg.onload = () => {
                        const labelOffsetFromWheelCenter = scaledRadius + (scaledImageSize / 2) + labelClearanceDownload + (labelImg.height / 2);

                        const labelX = downloadCenterX + labelOffsetFromWheelCenter * Math.cos(angleRad);
                        const labelY = downloadCenterY + labelOffsetFromWheelCenter * Math.sin(angleRad);

                        labelImg.style.left = `${labelX}px`;
                        labelImg.style.top = `${labelY}px`;
                        labelImg.style.transform = 'translate(-50%, -50%)';
                        downloadDiv.appendChild(labelImg);
                        resolve();
                    };
                    labelImg.onerror = () => {
                        console.error(`Failed to load label image for download: ${char.label}`);
                        resolve();
                    };
                });
                finalLabelImageLoadPromises.push(loadLabelPromise);
            }
        });

        await Promise.all(finalLabelImageLoadPromises);

        try {
            const canvas = await html2canvas(downloadDiv, {
                backgroundColor: downloadBgColor,
                scale: 1,
                useCORS: true,
                logging: false
            });

            const link = document.createElement('a');
            link.download = `character-shipping-wheel.${downloadFormat}`;
            link.href = canvas.toDataURL(`image/${downloadFormat}`, downloadJpgQuality);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("Error capturing the wheel for download:", error);
            displayMessageBox("Error during download! Please try again. If the problem persists, ensure your images are fully loaded and accessible, or try with fewer images.", "red");
        } finally {
            document.body.removeChild(downloadDiv);
        }
    }
});
