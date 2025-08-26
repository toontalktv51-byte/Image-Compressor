// Perfect WordPress-Compatible Image Compressor JavaScript - Use with WP Code Inserter
// This version maintains EXACTLY the same functionality, drag divider, and all features as our original files

(function() {
  'use strict';
  
  // Wait for DOM to be ready
  function ready(fn) {
    if (document.readyState !== 'loading') {
      fn();
    } else if (document.addEventListener) {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      document.attachEvent('onreadystatechange', function() {
        if (document.readyState !== 'loading') {
          fn();
        }
      });
    }
  }

  ready(function() {
    // Check if our container exists
    const container = document.querySelector('.wp-container');
    if (!container) {
      console.log('WordPress Image Compressor: Container not found');
      return;
    }

    // Get all elements with WordPress-safe IDs
    const iconAdd = document.getElementById('wp-icon-add');
    const deleteAllBtn = document.getElementById('wp-icon-delete-all');
    const downloadAllBtn = document.getElementById('wp-download-all');
    const filterButton = document.getElementById('wp-icon-filter');
    const filterMenu = document.getElementById('wp-filter-menu');
    const resetToolBtn = document.getElementById('wp-reset-tool');

    const fileInput = document.getElementById('wp-file-input');
    const imageListEl = document.getElementById('wp-image-list');
    const emptyState = document.getElementById('wp-empty-state');
    const template = document.getElementById('wp-image-card-template');

    const baseImg = document.getElementById('wp-base-img');
    const overlayImg = document.getElementById('wp-overlay-img');
    const originalMeta = document.getElementById('wp-original-meta');
    const compressedMeta = document.getElementById('wp-compressed-meta');
    const statsEl = document.getElementById('wp-stats');

    const qualityRange = document.getElementById('wp-quality-range');
    const qualityValueInput = document.getElementById('wp-quality-value');

    const maxSizeInput = document.getElementById('wp-max-size');
    const applyMaxBtn = document.getElementById('wp-apply-max');
    const uploadCountEl = document.getElementById('wp-upload-count');
    const uploadCountBottomEl = document.getElementById('wp-upload-count-bottom');
    const bottomDownloadAllBtn = document.getElementById('wp-bottom-download-all');
    const bottomDeleteAllBtn = document.getElementById('wp-bottom-delete-all');

    const reloadModal = document.getElementById('wp-reload-modal');
    const cancelReloadBtn = document.getElementById('wp-cancel-reload');
    const confirmReloadBtn = document.getElementById('wp-confirm-reload');

    const confirmModal = document.getElementById('wp-confirm-modal');
    const cancelDelete = document.getElementById('wp-cancel-delete');
    const confirmDelete = document.getElementById('wp-confirm-delete');
    const confirmTitle = confirmModal ? confirmModal.querySelector('h3') : null;
    const confirmMessage = confirmModal ? confirmModal.querySelector('p') : null;

    const dragDivider = document.getElementById('wp-drag-divider');
    const handle = dragDivider ? dragDivider.querySelector('.wp-handle') : null;
    const compareViewport = document.getElementById('wp-compare-viewport');
    const uploadFrame = document.getElementById('wp-upload-frame');
    const processingEl = document.getElementById('wp-processing');
    const processingText = document.getElementById('wp-processing-text');

    // Check if all required elements exist
    if (!iconAdd || !imageListEl || !template) {
      console.log('WordPress Image Compressor: Required elements not found');
      console.log('iconAdd:', iconAdd);
      console.log('imageListEl:', imageListEl);
      console.log('template:', template);
      return;
    }

    console.log('Template content:', template.content);
    console.log('Template first child:', template.content.firstElementChild);

    /** State */
    /** @type {{id:string, file:File, url:string, originalBytes:number, name:string, type:string, cachedCompressed?:{quality:number, blob:Blob, url:string}}[]} */
    const images = [];
    let selectedId = null;
    let pendingDeleteAll = false;
    let pendingDeleteId = null;
    let pendingReset = false;

    // Shared canvas
    let sharedCanvas = document.createElement('canvas');
    let sharedCtx = sharedCanvas.getContext('2d');
    
    function prepareCanvas(width, height) {
      if (sharedCanvas.width !== width) sharedCanvas.width = width;
      if (sharedCanvas.height !== height) sharedCanvas.height = height;
      sharedCtx.clearRect(0, 0, sharedCanvas.width, sharedCanvas.height);
    }

    function generateId() { 
      return Math.random().toString(36).slice(2) + Date.now().toString(36); 
    }
    
    function formatBytes(bytes) { 
      if (bytes < 1024) return `${bytes} B`; 
      const kb = bytes / 1024; 
      if (kb < 1024) return `${kb.toFixed(1)} KB`; 
      const mb = kb / 1024; 
      return `${mb.toFixed(2)} MB`; 
    }
    
    function computeReduction(originalBytes, compressedBytes) { 
      if (!originalBytes || !compressedBytes) return '—'; 
      const reduction = (1 - compressedBytes / originalBytes) * 100; 
      return `${reduction.toFixed(1)}% smaller`; 
    }

    function formatStats(originalBytes, compressedBytes) {
      if (!originalBytes || !compressedBytes) return '—';
      const original = formatBytes(originalBytes);
      const compressed = formatBytes(compressedBytes);
      const reduction = computeReduction(originalBytes, compressedBytes);
      return `${reduction} • Original: ${original} → Compressed: ${compressed}`;
    }

    // Smooth stats animation
    function animateStats(element, startText, endText, duration = 800) {
      if (!element) return;
      
      element.textContent = startText;
      element.style.opacity = '0.7';
      
      setTimeout(() => {
        element.textContent = endText;
        element.style.opacity = '1';
        element.style.transform = 'none';
      }, 100);
    }

    function toast(message) { 
      console.log('Toast function called with message:', message); // Debug log
      
      // Remove any existing toasts first
      const existingToasts = document.querySelectorAll('.wp-toast');
      existingToasts.forEach(toast => toast.remove());
      
      const div = document.createElement('div'); 
      div.className = 'wp-toast';
      div.textContent = message; 
      
      // Add inline styles as backup
      div.style.position = 'fixed'; 
      div.style.left = '50%'; 
      div.style.bottom = '24px'; 
      div.style.transform = 'translateX(-50%)'; 
      div.style.background = 'linear-gradient(90deg, #6300E2, #8E43F0)'; 
      div.style.color = '#fff'; 
      div.style.padding = '10px 14px'; 
      div.style.borderRadius = '12px'; 
      div.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; 
      div.style.zIndex = '99999'; 
      div.style.fontFamily = 'inherit';
      div.style.fontSize = '14px';
      div.style.fontWeight = '600';
      div.style.whiteSpace = 'nowrap';
      div.style.minWidth = '200px';
      div.style.textAlign = 'center';
      div.style.pointerEvents = 'none';
      
      document.body.appendChild(div); 
      console.log('Toast element created and added to DOM:', div); // Debug log
      console.log('Toast element styles:', div.style.cssText); // Debug log
      
      setTimeout(() => {
        if (div.parentNode) {
          div.remove();
          console.log('Toast element removed from DOM'); // Debug log
        }
      }, 3000); // Increased duration to 3 seconds for better visibility
    }

    // Helper function to compress all images at current quality
    async function compressAllImages(quality = null) {
      if (!qualityRange && !quality) return;
      
      const compressionQuality = quality || parseInt(qualityRange.value);
      showProcessing('Compressing all images...');
      
      for (let i = 0; i < images.length; i++) {
        const item = images[i];
        try {
          await ensureCompressed(item, compressionQuality);
          // Update progress
          const progress = Math.round(((i + 1) / images.length) * 100);
          showProcessing(`Compressing all images... ${progress}%`);
        } catch (err) {
          console.error(`Failed to compress ${item.name}:`, err);
        }
      }
      
      hideProcessing();
      
      // Refresh all image card statuses after bulk compression
      refreshAllImageCardStatuses();
      
      toast(`Compressed ${images.length} image(s) at ${compressionQuality}% quality`);
    }

    // Helper function to update all image card statuses
    function refreshAllImageCardStatuses() {
      images.forEach(item => {
        updateImageCardStatus(item);
      });
    }

    // Helper function to update individual image card status
    function updateImageCardStatus(item) {
      const card = document.querySelector(`[data-id="${item.id}"]`);
      if (!card) return;
      
      // Remove existing status classes
      card.classList.remove('compressed', 'uncompressed');
      card.style.borderColor = '';
      card.style.boxShadow = '';
      
      // Get current compression status
      const status = getCompressionStatus(item);
      
      // Apply new status
      if (status === 'compressed') {
        card.classList.add('compressed');
        card.style.borderColor = 'var(--primary)';
        card.style.boxShadow = '0 0 0 1px var(--primary)';
      } else if (status === 'uncompressed') {
        card.classList.add('uncompressed');
        card.style.borderColor = '#ff6b6b';
        card.style.boxShadow = '0 0 0 1px #ff6b6b';
      }
      
      // Update size display if it exists
      const sizeElement = card.querySelector('.wp-size');
      if (sizeElement) {
        if (status === 'compressed' && item.cachedCompressed && item.cachedCompressed.blob) {
          const originalSize = formatBytes(item.originalBytes);
          const compressedSize = formatBytes(item.cachedCompressed.blob.size);
          const reduction = Math.round(((item.originalBytes - item.cachedCompressed.blob.size) / item.originalBytes) * 100);
          sizeElement.textContent = `${originalSize} → ${compressedSize} (${reduction}% smaller)`;
        } else {
          sizeElement.textContent = formatBytes(item.originalBytes);
        }
      }
    }

    // Helper function to check if image is compressed
    function isImageCompressed(item) {
      return item.cachedCompressed && item.cachedCompressed.blob && item.cachedCompressed.blob.size < item.file.size;
    }

    // Helper function to get compression status
    function getCompressionStatus(item) {
      if (item.cachedCompressed && item.cachedCompressed.blob) {
        return 'compressed';
      }
      return 'uncompressed';
    }

    // Helper function to download multiple images
    async function downloadImages(imageList, processingMessage) {
      if (!qualityRange) return;
      
      const quality = parseInt(qualityRange.value);
      showProcessing(processingMessage);
      
      let downloadedCount = 0;
      for (const item of imageList) {
        try {
          const compressed = await ensureCompressed(item, quality);
          const link = document.createElement('a');
          link.href = URL.createObjectURL(compressed.blob);
          link.download = item.name.replace(/(\.[^.]+)$/, '-compressed$1');
          link.click();
          URL.revokeObjectURL(link.href);
          downloadedCount++;
        } catch (err) {
          console.error(`Failed to download ${item.name}:`, err);
        }
      }
      
      hideProcessing();
      if (downloadedCount > 0) {
        toast(`Downloaded ${downloadedCount} compressed image${downloadedCount > 1 ? 's' : ''}!`);
      } else {
        toast('No images were downloaded');
      }
    }

    // Helper function to copy image URL to clipboard
    function copyImageUrl(blob) {
      try {
        console.log('Attempting URL copy fallback...');
        const url = URL.createObjectURL(blob);
        const tempInput = document.createElement('input');
        tempInput.value = url;
        tempInput.style.position = 'absolute';
        tempInput.style.left = '-9999px';
        document.body.appendChild(tempInput);
        tempInput.select();
        tempInput.setSelectionRange(0, 99999); // For mobile devices
        
        const success = document.execCommand('copy');
        document.body.removeChild(tempInput);
        URL.revokeObjectURL(url);
        
        if (success) {
          console.log('✅ Copy successful via URL fallback!');
          toast('Compressed image URL copied to clipboard!');
        } else {
          console.log('❌ URL copy failed, downloading instead...');
          downloadImage(blob);
        }
      } catch (err) {
        console.error('❌ URL copy error:', err);
        downloadImage(blob);
      }
    }
    
    // Helper function to download image as fallback
    function downloadImage(blob) {
      try {
        console.log('Downloading image as final fallback...');
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `image-${Date.now()}.${blob.type.split('/')[1]}`;
        link.click();
        URL.revokeObjectURL(link.href);
        toast('Copy failed, image downloaded instead');
      } catch (err) {
        console.error('❌ Download failed:', err);
        toast('Copy and download both failed');
      }
    }

    // Test clipboard API functionality
    function testClipboardAPI() {
      console.log('=== TESTING CLIPBOARD API ===');
      console.log('navigator.clipboard exists:', !!navigator.clipboard);
      console.log('navigator.clipboard.write exists:', !!(navigator.clipboard && navigator.clipboard.write));
      console.log('navigator.clipboard.read exists:', !!(navigator.clipboard && navigator.clipboard.read));
      
      if (navigator.clipboard && navigator.clipboard.write) {
        // Test with simple text
        navigator.clipboard.writeText('Clipboard test').then(() => {
          console.log('✅ Text clipboard API working!');
          
          // Test reading back the text
          setTimeout(() => {
            navigator.clipboard.readText().then(text => {
              console.log('✅ Clipboard read working! Content:', text);
            }).catch(err => {
              console.log('❌ Clipboard read failed:', err);
            });
          }, 100);
        }).catch(err => {
          console.log('❌ Text clipboard API failed:', err);
        });
      }
      
      // Test execCommand
      const testInput = document.createElement('input');
      testInput.value = 'execCommand test';
      testInput.style.position = 'absolute';
      testInput.style.left = '-9999px';
      document.body.appendChild(testInput);
      testInput.select();
      const execSuccess = document.execCommand('copy');
      document.body.removeChild(testInput);
      console.log('execCommand copy available:', execSuccess);
    }

    // Test toast function on page load
    document.addEventListener('DOMContentLoaded', () => {
      console.log('DOM loaded, testing functions...');
      
      // Test clipboard API
      setTimeout(() => {
        testClipboardAPI();
      }, 500);
    });

    function setEmptyState() { 
      const has = images.length > 0; 
      if (emptyState) emptyState.style.display = has ? 'none' : ''; 
      
      // Update uploaded images count
      if (uploadCountEl) {
        uploadCountEl.textContent = `Images: ${images.length}`;
      }
      if (uploadCountBottomEl) {
        uploadCountBottomEl.textContent = `Images: ${images.length}`;
      }

      // Show/hide buttons based on image upload status
      if (deleteAllBtn) {
        deleteAllBtn.disabled = !has; 
        deleteAllBtn.style.display = has ? '' : 'none'; 
      }
      if (bottomDeleteAllBtn) {
        bottomDeleteAllBtn.disabled = !has;
        bottomDeleteAllBtn.style.display = has ? '' : 'none';
      }
      
      if (downloadAllBtn) {
        downloadAllBtn.disabled = !has; 
        downloadAllBtn.style.display = has ? '' : 'none';
      }
      if (bottomDownloadAllBtn) {
        bottomDownloadAllBtn.disabled = !has;
        bottomDownloadAllBtn.style.display = has ? '' : 'none';
      }
      
      // Enable/disable compress all button
      const compressAllBtn = document.getElementById('wp-compress-all');
      if (compressAllBtn) {
        compressAllBtn.disabled = !has;
        compressAllBtn.style.display = has ? '' : 'none';
      }
      
      // Show/hide filter button based on image count
      const filterButton = document.getElementById('wp-icon-filter');
      if (filterButton) {
        filterButton.style.display = has ? '' : 'none';
      }
    }
    
    function toggleFrame(showFrame) { 
      if (uploadFrame) uploadFrame.style.display = showFrame ? '' : 'none'; 
      if (compareViewport) compareViewport.style.display = showFrame ? 'none' : ''; 
    }

    function clearPreview() { 
      if (baseImg) baseImg.src = ''; 
      if (overlayImg) overlayImg.src = ''; 
      if (originalMeta) originalMeta.textContent = '—'; 
      if (compressedMeta) compressedMeta.textContent = '—'; 
      if (statsEl) statsEl.textContent = '—'; 
      toggleFrame(true); 
    }

    function getSelected() { 
      return images.find(i => i.id === selectedId); 
    }

    // Processing functions
    function showProcessing(message) {
      if (processingEl && processingText) {
        processingText.textContent = message || 'Processing...';
        processingEl.style.display = 'flex';
      }
    }

    function hideProcessing() {
      if (processingEl) {
        processingEl.style.display = 'none';
      }
    }

    // EXACTLY as in original tool
    async function compressBitmapToMime(bitmap, qualityPercent, mime) {
      prepareCanvas(bitmap.width, bitmap.height);
      sharedCtx.drawImage(bitmap, 0, 0);
      
      // For JPEG, use quality parameter; for PNG, always use maximum quality
      // PNG compression is lossless and quality parameter doesn't affect file size
      const q = mime === 'image/jpeg' ? Math.min(Math.max(qualityPercent / 100, 0.01), 1) : 1;
      
      const blob = await new Promise(resolve => sharedCanvas.toBlob(resolve, mime, q));
      return blob;
    }

    // EXACTLY as in original tool
    async function compressFile(file, qualityPercent) {
      // Always compress, even at 100% quality, to reduce file size
      const bitmap = await createImageBitmap(file);
      try {
        const isPng = file.type.includes('png');
        
        // At 100% quality, try multiple compression strategies for best file size
        if (qualityPercent >= 100) {
          // Try PNG first for lossless compression
          if (isPng) {
            const pngBlob = await compressBitmapToMime(bitmap, 100, 'image/png');
            // If PNG is smaller, use it
            if (pngBlob && pngBlob.size < file.size) {
              return pngBlob;
            }
          }
          
          // Try JPEG at 100% quality for better compression
          const jpegBlob = await compressBitmapToMime(bitmap, 100, 'image/jpeg');
          if (jpegBlob && jpegBlob.size < file.size) {
            return jpegBlob;
          }
          
          // If no compression achieved, return original
          return file;
        } else {
          // For lower quality, use standard compression
          const mimeType = isPng && qualityPercent < 100 ? 'image/jpeg' : (isPng ? 'image/png' : 'image/jpeg');
          const blob = await compressBitmapToMime(bitmap, qualityPercent, mimeType);
          return blob || file;
        }
      } finally { 
        try { 
          bitmap.close && bitmap.close(); 
        } catch {} 
      }
    }

    // EXACTLY as in original tool
    async function ensureCompressed(item, quality) {
      // Use cache if same quality
      if (item.cachedCompressed && item.cachedCompressed.quality === quality) return item.cachedCompressed;
      
      showProcessing('Compressing image...');
      const trial = await compressFile(item.file, quality);
      hideProcessing();
      
      // Always use the compressed version, even if it's the same size
      // This ensures consistent behavior and proper file format handling
      const resultBlob = trial || item.file;
      
      if (item.cachedCompressed && item.cachedCompressed.url) URL.revokeObjectURL(item.cachedCompressed.url);
      const url = URL.createObjectURL(resultBlob);
      item.cachedCompressed = { quality, blob: resultBlob, url };
      
      // Update the UI immediately after compression
      updateImageCardStatus(item);
      
      return item.cachedCompressed;
    }

    // EXACTLY as in original tool
    function updateStats(item, compressedBlob) { 
      if (compressedMeta) compressedMeta.textContent = `${item.name.replace(/(\.[^.]+)$/,'-compressed$1')} • ${formatBytes(compressedBlob.size)}`; 
      if (statsEl) statsEl.textContent = `${computeReduction(item.originalBytes, compressedBlob.size)} • Original: ${formatBytes(item.originalBytes)} → Compressed: ${formatBytes(compressedBlob.size)}`; 
    }

    // EXACTLY as in original tool
    async function selectImage(id) { 
      selectedId = id; 
      const item = getSelected(); 
      if (!item) return; 
      
      if (baseImg) baseImg.src = item.url; 
      if (originalMeta) originalMeta.textContent = `${item.name} • ${formatBytes(item.originalBytes)}`; 
      toggleFrame(false); 
      
      const quality = qualityRange ? parseInt(qualityRange.value, 10) : 50; 
      const c = await ensureCompressed(item, quality); 
      
      if (overlayImg) overlayImg.src = c.url; 
      updateStats(item, c.blob); 
      
      // Update selection in UI
      if (imageListEl) {
        imageListEl.querySelectorAll('.wp-image-card').forEach(card => { 
          card.classList.toggle('selected', card.dataset.id === id); 
        }); 
      }
      
      // Update the image card status to reflect current compression state
      updateImageCardStatus(item);
    }

    async function updatePreview() {
      const item = getSelected();
      if (!item) return;
      
      if (!qualityRange) return;
      const quality = parseInt(qualityRange.value);
      
      const compressed = await ensureCompressed(item, quality);
      if (overlayImg) overlayImg.src = compressed.url;
      updateStats(item, compressed.blob);
      
      // Update the image card status after quality change
      updateImageCardStatus(item);
    }

    function renderList() {
      if (!imageListEl) return;
      
      imageListEl.innerHTML = '';
      
      if (images.length === 0) {
        setEmptyState();
        return;
      }
      
      images.forEach(item => {
        const template = document.getElementById('wp-image-card-template');
        if (!template) return;
        
        const card = template.content.cloneNode(true);
        const cardEl = card.querySelector('.wp-image-card');
        if (!cardEl) return;
        
        cardEl.dataset.id = item.id;
        
        // Set image thumbnail
        const thumb = cardEl.querySelector('.wp-thumb');
        if (thumb) thumb.src = item.url;
        
        // Set image name
        const name = cardEl.querySelector('.wp-name');
        if (name) name.textContent = item.name;
        
        // Set image size
        const size = cardEl.querySelector('.wp-size');
        if (size) size.textContent = formatBytes(item.originalBytes);
        
        // Add compression status indicator
        const status = getCompressionStatus(item);
        if (status === 'compressed') {
          cardEl.classList.add('compressed');
          cardEl.style.borderColor = 'var(--primary)';
          cardEl.style.boxShadow = '0 0 0 1px var(--primary)';
        } else if (status === 'uncompressed') {
          cardEl.classList.add('uncompressed');
          cardEl.style.borderColor = '#ff6b6b';
          cardEl.style.boxShadow = '0 0 0 1px #ff6b6b';
        }
        
        // Set selection state
        if (item.id === selectedId) {
          cardEl.classList.add('selected');
        }
        
        // Add click handler for image selection
        cardEl.addEventListener('click', () => {
          selectImage(item.id);
        });
        
        // Add remove button handler
        const remove = cardEl.querySelector('.wp-remove');
        if (remove) {
          remove.addEventListener('click', (e) => {
            e.stopPropagation();
            pendingDeleteAll = false;
            pendingDeleteId = item.id;
            if (confirmTitle) confirmTitle.textContent = 'Delete this image?';
            if (confirmMessage) confirmMessage.textContent = 'This will remove only the selected image.';
            if (confirmDelete) confirmDelete.textContent = 'Delete';
            if (confirmModal) confirmModal.showModal();
          });
        }
        
        imageListEl.appendChild(card);
      });
      
      setEmptyState();
    }

    function setEmptyAndRender() { 
      setEmptyState(); 
      renderList(); 
      
      // Ensure all image card statuses are properly displayed
      setTimeout(() => {
        refreshAllImageCardStatuses();
      }, 100);
      
      if (images.length > 0) {
        selectImage(images[images.length - 1].id);
      }
    }

    function syncQualityInputs(val) { 
      const v = Math.max(1, Math.min(100, parseInt(val || '50', 10))); 
      if (qualityRange) qualityRange.value = String(v); 
      if (qualityValueInput) qualityValueInput.value = String(v); 
      
      // Update percentage display
      const percentageEl = document.getElementById('wp-quality-percentage');
      if (percentageEl) {
        percentageEl.textContent = v + '%';
      }
      
      const current = getSelected(); 
      if (current) ensureCompressed(current, v).then(c => { 
        if (overlayImg) overlayImg.src = c.url; 
        updateStats(current, c.blob); 
      }); 
    }

    // Event Listeners
    if (iconAdd) {
      iconAdd.addEventListener('click', () => {
        if (fileInput) fileInput.click();
      });
    }

    if (fileInput) {
      fileInput.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        showProcessing('Uploading...');

        for (const file of files) {
          if (!file.type.startsWith('image/')) continue;
          
          const id = generateId();
          const url = URL.createObjectURL(file);
          
          const imageItem = {
            id,
            file,
            url,
            originalBytes: file.size,
            name: file.name,
            type: file.type
          };
          
          images.push(imageItem);
        }

        hideProcessing();
        setEmptyAndRender(); // This will auto-select the last uploaded image
        fileInput.value = '';
        
        toast(`Uploaded ${files.length} image${files.length > 1 ? 's' : ''}`);
      });
    }

    if (deleteAllBtn) {
      deleteAllBtn.addEventListener('click', () => {
        pendingDeleteAll = true;
        if (confirmTitle) confirmTitle.textContent = 'Delete all images?';
        if (confirmMessage) confirmMessage.textContent = 'This action will remove all uploaded images.';
        if (confirmDelete) confirmDelete.textContent = 'Delete';
        if (confirmModal) confirmModal.showModal();
      });
    }

    if (downloadAllBtn) {
      downloadAllBtn.addEventListener('click', async () => {
        if (images.length === 0) {
          toast('No images to download');
          return;
        }

        // Check for uncompressed images
        const uncompressedImages = [];
        const compressedImages = [];
        const sameSizeImages = [];
        
        for (const item of images) {
          const status = getCompressionStatus(item);
          if (status === 'uncompressed') {
            uncompressedImages.push(item);
          } else if (status === 'compressed') {
            compressedImages.push(item);
          } else {
            sameSizeImages.push(item);
          }
        }

        if (uncompressedImages.length > 0) {
          // Show popup for uncompressed images
          const message = `Found ${uncompressedImages.length} uncompressed image(s). What would you like to do?`;
          const choice = confirm(`${message}\n\nClick OK to compress them first, or Cancel to ignore and download only compressed images.`);
          
          if (choice) {
            // User chose to compress - jump to first uncompressed image
            const firstUncompressed = uncompressedImages[0];
            selectImage(firstUncompressed.id);
            
            // Scroll to the image in the list
            const imageCard = document.querySelector(`[data-id="${firstUncompressed.id}"]`);
            if (imageCard) {
              imageCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
              // Highlight the image briefly
              imageCard.style.boxShadow = '0 0 0 3px var(--primary)';
              setTimeout(() => {
                imageCard.style.boxShadow = '';
              }, 2000);
            }
            
            toast(`Please compress image "${firstUncompressed.name}" first, then try downloading all again.`);
            return;
          } else {
            // User chose to ignore - download only compressed images
            if (compressedImages.length === 0) {
              toast('No compressed images to download');
              return;
            }
            await downloadImages(compressedImages, 'Downloading compressed images...');
            return;
          }
        }

        // Check if there are same-size images (compressed but no size reduction)
        if (sameSizeImages.length > 0) {
          const message = `Found ${sameSizeImages.length} image(s) that couldn't be compressed further. Download them anyway?`;
          const choice = confirm(`${message}\n\nClick OK to download all images, or Cancel to skip same-size images.`);
          
          if (!choice) {
            // User chose to skip same-size images
            if (compressedImages.length === 0) {
              toast('No compressed images to download');
              return;
            }
            await downloadImages(compressedImages, 'Downloading compressed images...');
            return;
          }
        }

        // Download all images (compressed + same-size)
        const allImages = [...compressedImages, ...sameSizeImages];
        await downloadImages(allImages, 'Downloading all images...');
      });
    }

    if (filterButton && filterMenu) {
      filterButton.addEventListener('click', () => {
        console.log('Filter button clicked');
        console.log('Filter menu:', filterMenu);
        console.log('Filter menu classes:', filterMenu.className);
        
        const expanded = filterButton.getAttribute('aria-expanded') === 'true';
        filterButton.setAttribute('aria-expanded', !expanded);
        
        if (expanded) {
          filterMenu.classList.remove('show');
          // Restore default positioning
          filterMenu.style.position = '';
          filterMenu.style.top = '';
          filterMenu.style.left = '';
          filterMenu.style.right = '';
          filterMenu.style.bottom = '';
          filterMenu.style.maxHeight = '';
          filterMenu.style.overflow = '';
          console.log('Removed show class');
        } else {
          filterMenu.classList.add('show');
          // Position as fixed overlay right under the button, above all elements
          const btnRect = filterButton.getBoundingClientRect();
          filterMenu.style.position = 'fixed';
          filterMenu.style.top = Math.round(btnRect.bottom + 6) + 'px';
          filterMenu.style.left = Math.round(btnRect.left) + 'px';
          filterMenu.style.right = 'auto';
          filterMenu.style.bottom = 'auto';
          filterMenu.style.maxHeight = 'none';
          filterMenu.style.overflow = 'visible';
          console.log('Added show class');
        }
        
        console.log('Filter menu classes after:', filterMenu.className);
        console.log('Filter menu display:', getComputedStyle(filterMenu).display);
      });
      
      // Close filter menu when clicking outside
      document.addEventListener('click', (e) => {
        if (!filterButton.contains(e.target) && !filterMenu.contains(e.target)) {
          filterMenu.classList.remove('show');
          filterButton.setAttribute('aria-expanded', 'false');
        }
      });
    }

    if (filterMenu) {
      filterMenu.addEventListener('click', (e) => {
        if (!e.target.matches('.wp-menu-item')) return;
        
        const sort = e.target.dataset.sort;
        filterMenu.classList.remove('show');
        filterButton.setAttribute('aria-expanded', 'false');
        
        // Sort images
        if (sort === 'az') {
          images.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sort === 'za') {
          images.sort((a, b) => b.name.localeCompare(a.name));
        } else if (sort === 'big') {
          images.sort((a, b) => b.originalBytes - a.originalBytes);
        } else if (sort === 'small') {
          images.sort((a, b) => a.originalBytes - b.originalBytes);
        }
        
        renderList();
        
        // Re-select the previously selected image after sorting
        if (selectedId) {
          const selectedCard = imageListEl.querySelector(`[data-id="${selectedId}"]`);
          if (selectedCard) {
            selectedCard.classList.add('selected');
          }
        }
        
        toast(`Sorted by ${e.target.textContent}`);
      });
    }

    if (resetToolBtn) {
      resetToolBtn.addEventListener('click', () => {
        pendingReset = true;
        if (confirmTitle) confirmTitle.textContent = 'Reset The Tool?';
        if (confirmMessage) confirmMessage.textContent = 'This action will remove all images & reset the Tool.';
        if (confirmDelete) confirmDelete.textContent = 'Reset';
        if (confirmModal) confirmModal.showModal();
      });
    }

    // Compress all button
    const compressAllBtn = document.getElementById('wp-compress-all');
    if (compressAllBtn) {
      compressAllBtn.addEventListener('click', () => {
        if (images.length === 0) {
          toast('No images to compress');
          return;
        }
        
        // Show the compress all modal
        const compressModal = document.getElementById('wp-compress-all-modal');
        if (compressModal) {
          compressModal.showModal();
        }
      });
    }

    // Compress all modal event listeners
    const compressModal = document.getElementById('wp-compress-all-modal');
    const compressQualityRange = document.getElementById('wp-compress-quality-range');
    const compressQualityValue = document.getElementById('wp-compress-quality-value');
    const compressQualityPercentage = document.getElementById('wp-compress-quality-percentage');
    const cancelCompressBtn = document.getElementById('wp-cancel-compress');
    const confirmCompressBtn = document.getElementById('wp-confirm-compress');

    if (compressModal && compressQualityRange && compressQualityValue && compressQualityPercentage) {
      // Sync quality inputs in compress modal
      compressQualityRange.addEventListener('input', (e) => {
        const value = e.target.value;
        compressQualityValue.value = value;
        compressQualityPercentage.textContent = value + '%';
      });

      compressQualityValue.addEventListener('input', () => {
        if (!compressQualityValue.value) return;
        const value = compressQualityValue.value;
        compressQualityRange.value = value;
        compressQualityPercentage.textContent = value + '%';
      });

      // Cancel button
      if (cancelCompressBtn) {
        cancelCompressBtn.addEventListener('click', () => {
          compressModal.close();
        });
      }

      // Confirm button
      if (confirmCompressBtn) {
        confirmCompressBtn.addEventListener('click', async () => {
          const quality = parseInt(compressQualityRange.value);
          compressModal.close();
          await compressAllImages(quality);
        });
      }
    }

    if (qualityRange) {
      qualityRange.addEventListener('input', (e) => {
        const value = e.target.value;
        syncQualityInputs(value);
        
        // Update preview and status when quality changes
        updatePreview();
      });
    }

    if (qualityValueInput) {
      qualityValueInput.addEventListener('input', () => {
        if (!qualityValueInput.value) return;
        const value = qualityValueInput.value;
        syncQualityInputs(value);
        
        // Update preview and status when quality changes
        updatePreview();
      });
    }

    if (applyMaxBtn && maxSizeInput) {
      applyMaxBtn.addEventListener('click', async () => {
        const sanitized = (maxSizeInput.value || '').toString().replace(/[^0-9]/g, '');
        maxSizeInput.value = sanitized;
        const maxSize = parseInt(sanitized, 10);
        if (isNaN(maxSize) || maxSize < 1) {
          toast('Enter valid KB');
          return;
        }
        
        const item = getSelected();
        if (!item) {
          toast('Select an image');
          return;
        }
        
        const targetBytes = Math.round(maxSize * 1024);
        
        // If target >= original, keep original
        if (targetBytes >= item.file.size) {
          if (item.cachedCompressed && item.cachedCompressed.url) URL.revokeObjectURL(item.cachedCompressed.url);
          const url = item.url;
          item.cachedCompressed = { quality: 100, blob: item.file, url };
          if (overlayImg) overlayImg.src = url;
          if (qualityRange) qualityRange.value = '100';
          if (qualityValueInput) qualityValueInput.value = '100';
          updateStats(item, item.file);
          toast('Optimized');
          return;
        }
        
        showProcessing('Optimizing...');
        
        try {
          const tolerance = Math.max(1024, Math.round(targetBytes * 0.02));
          const bitmap = await createImageBitmap(item.file);

          async function searchForTarget(mime, bmp = bitmap) {
            let low = 1, high = 100;
            let bestBelow = null, bestAbove = null;

            for (let i = 0; i < 12; i++) {
              const mid = Math.round((low + high) / 2);
              const blob = await compressBitmapToMime(bmp, mid, mime);
              const diff = Math.abs(blob.size - targetBytes);

              if (diff <= tolerance) return { q: mid, blob };

              if (blob.size <= targetBytes) {
                if (!bestBelow || blob.size > bestBelow.blob.size) bestBelow = { q: mid, blob };
                high = mid - 1;
              } else {
                if (!bestAbove || blob.size < bestAbove.blob.size) bestAbove = { q: mid, blob };
                low = mid + 1;
              }

              await new Promise(r => setTimeout(r, 0));
            }

            return bestBelow || bestAbove;
          }

          // Try same-dimension compression first
          const originalMime = item.file.type.includes('png') ? 'image/png' : 'image/jpeg';
          let chosen = await searchForTarget(originalMime);

          if (chosen && chosen.blob.size > targetBytes && originalMime === 'image/png') {
            const jpegTry = await searchForTarget('image/jpeg');
            if (jpegTry && (!chosen || jpegTry.blob.size < chosen.blob.size)) chosen = jpegTry;
          }

          // If still above target, progressively downscale dimensions and search again
          if (!chosen || chosen.blob.size > targetBytes) {
            let scale = 0.9; // start at 90%
            let best = chosen || null;
            const originalWidth = bitmap.width;
            const originalHeight = bitmap.height;

            while (scale >= 0.4) { // do not go below 40% of original
              prepareCanvas(Math.max(1, Math.round(originalWidth * scale)), Math.max(1, Math.round(originalHeight * scale)));
              sharedCtx.drawImage(bitmap, 0, 0, sharedCanvas.width, sharedCanvas.height);

              // Try JPEG primarily for size target
              const downBlob = await new Promise(resolve => sharedCanvas.toBlob(resolve, 'image/jpeg', 0.92));
              if (downBlob) {
                // Run a quick search around the quality to approach target using the downscaled bitmap
                const downBitmap = await createImageBitmap(downBlob);
                let downChosen = await searchForTarget('image/jpeg', downBitmap);
                downBitmap.close();

                if (downChosen && downChosen.blob.size <= targetBytes) {
                  best = downChosen;
                  break;
                }
                if (!best || (downChosen && downChosen.blob.size < best.blob.size)) {
                  best = downChosen || best;
                }
              }

              scale -= 0.1;
              await new Promise(r => setTimeout(r, 0));
            }

            if (best) {
              chosen = best;
            }
          }

          if (chosen) {
            const url = URL.createObjectURL(chosen.blob);
            if (item.cachedCompressed && item.cachedCompressed.url) URL.revokeObjectURL(item.cachedCompressed.url);
            item.cachedCompressed = { quality: chosen.q ?? 100, blob: chosen.blob, url };

            if (overlayImg) overlayImg.src = url;
            if (qualityRange && chosen.q) qualityRange.value = String(chosen.q);
            if (qualityValueInput && chosen.q) qualityValueInput.value = String(chosen.q);
            updateStats(item, chosen.blob);

            updateImageCardStatus(item);
            toast(chosen.blob.size <= targetBytes ? 'Optimized' : 'Optimized (closest possible)');
          } else {
            toast('Could not meet target size');
          }

          bitmap.close();
        } catch (err) {
          console.error('Optimization error:', err);
          toast('Optimization failed');
        }
        
        hideProcessing();
      });

      // Enter key triggers Apply
      maxSizeInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          applyMaxBtn.click();
        }
      });
    }

    if (confirmModal) {
      confirmModal.addEventListener('click', (e) => {
        if (e.target === confirmModal) {
          confirmModal.close();
        }
      });
    }

    if (cancelDelete) {
      cancelDelete.addEventListener('click', () => {
        if (confirmModal) confirmModal.close();
        pendingDeleteAll = false;
        pendingDeleteId = null;
        pendingReset = false;
      });
    }

    if (confirmDelete) {
      confirmDelete.addEventListener('click', () => {
        if (pendingDeleteAll) {
          // Clear all images
          images.forEach(item => {
            URL.revokeObjectURL(item.url);
            if (item.cachedCompressed) URL.revokeObjectURL(item.cachedCompressed.url);
          });
          images.length = 0;
          selectedId = null;
          renderList();
          setEmptyState();
          clearPreview();
          toast('All images deleted');
        } else if (pendingDeleteId) {
          // Delete specific image
          const index = images.findIndex(item => item.id === pendingDeleteId);
          if (index > -1) {
            const item = images[index];
            URL.revokeObjectURL(item.url);
            if (item.cachedCompressed) URL.revokeObjectURL(item.cachedCompressed.url);
            images.splice(index, 1);
            
            if (selectedId === pendingDeleteId) {
              selectedId = null;
              clearPreview();
            }
            
            renderList();
            setEmptyState();
            
            // Auto-select first remaining image if available
            if (images.length > 0 && !selectedId) {
              const firstCard = imageListEl.querySelector('.wp-image-card');
              if (firstCard) {
                firstCard.click();
                selectedId = images[0].id;
                selectImage(images[0].id);
              }
            }
            
            toast('Image deleted');
          }
        } else if (pendingReset) {
          // Reset tool
          images.forEach(item => {
            URL.revokeObjectURL(item.url);
            if (item.cachedCompressed) URL.revokeObjectURL(item.cachedCompressed.url);
          });
          images.length = 0;
          selectedId = null;
          renderList();
          setEmptyState();
          clearPreview();
          
          // Reset quality to 50%
          if (qualityRange) qualityRange.value = 50;
          if (qualityValueInput) qualityValueInput.value = 50;
          syncQualityInputs(50);
          
          // Clear max size
          if (maxSizeInput) maxSizeInput.value = '';
          
          toast('Tool reset successfully');
        }
        
        if (confirmModal) confirmModal.close();
        pendingDeleteAll = false;
        pendingDeleteId = null;
        pendingReset = false;
      });
    }

    // Drag and drop functionality
    if (uploadFrame) {
      uploadFrame.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadFrame.classList.add('wp-drag-over');
      });

      uploadFrame.addEventListener('dragleave', () => {
        uploadFrame.classList.remove('wp-drag-over');
      });

      uploadFrame.addEventListener('drop', async (e) => {
        e.preventDefault();
        uploadFrame.classList.remove('wp-drag-over');
        
        const files = Array.from(e.dataTransfer.files);
        if (files.length === 0) return;

        showProcessing('Uploading...');

        for (const file of files) {
          if (!file.type.startsWith('image/')) continue;
          
          const id = generateId();
          const url = URL.createObjectURL(file);
          
          images.push({
            id,
            file,
            url,
            originalBytes: file.size,
            name: file.name,
            type: file.type
          });
        }

        hideProcessing();
        setEmptyAndRender(); // This will auto-select the last uploaded image
        
        toast(`Added ${files.length} image${files.length > 1 ? 's' : ''}`);
      });

      uploadFrame.addEventListener('click', () => {
        if (fileInput) fileInput.click();
      });
    }

    // Image list event delegation for copy/download
    if (imageListEl) {
      imageListEl.addEventListener('click', async (e) => {
        const actionBtn = e.target.closest('[data-action]');
        if (!actionBtn) return;

        const action = actionBtn.dataset.action;
        const card = actionBtn.closest('.wp-image-card');
        if (!card) return;

        const id = card.dataset.id;
        const item = images.find(i => i.id === id);
        if (!item) return;

        if (!qualityRange) return;
        const quality = parseInt(qualityRange.value);

        if (action === 'copy') {
          console.log('=== COPY ACTION STARTED ===');
          try {
            const compressed = await ensureCompressed(item, quality);
            console.log('Image compressed successfully:', compressed);
            
            // Method 1: Try modern clipboard API
            if (navigator.clipboard && navigator.clipboard.write) {
              try {
                console.log('Attempting modern clipboard API...');
                const clipboardItem = new ClipboardItem({
                  [compressed.blob.type]: compressed.blob
                });
                
                await navigator.clipboard.write([clipboardItem]);
                console.log('✅ Copy successful via modern clipboard API!');
                toast('Compressed image copied to clipboard!');
                return;
              } catch (clipboardErr) {
                console.log('❌ Modern clipboard failed:', clipboardErr);
              }
            }
            
            // Method 2: Canvas-based copy
            try {
              console.log('Attempting canvas-based copy...');
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              const img = new Image();
              
              img.onload = async () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                
                try {
                  canvas.toBlob(async (blob) => {
                    if (navigator.clipboard && navigator.clipboard.write) {
                      try {
                        await navigator.clipboard.write([
                          new ClipboardItem({
                            [blob.type]: blob
                          })
                        ]);
                        console.log('✅ Copy successful via canvas method!');
                        toast('Compressed image copied to clipboard!');
                      } catch (err) {
                        console.log('❌ Canvas clipboard failed:', err);
                        // Fallback to direct download (not URL copy)
                        downloadImage(blob);
                      }
                    } else {
                      // Fallback to direct download (not URL copy)
                      downloadImage(blob);
                    }
                  }, compressed.blob.type);
                } catch (err) {
                  console.error('❌ Canvas toBlob failed:', err);
                  downloadImage(compressed.blob);
                }
              };
              
              img.src = URL.createObjectURL(compressed.blob);
              
            } catch (fallbackErr) {
              console.error('❌ Canvas method failed:', fallbackErr);
              downloadImage(compressed.blob);
            }
            
          } catch (err) {
            console.error('❌ Copy error:', err);
            toast('Failed to copy image');
          }
        } else if (action === 'download') {
          try {
            const compressed = await ensureCompressed(item, quality);
            const link = document.createElement('a');
            link.href = URL.createObjectURL(compressed.blob);
            link.download = item.name.replace(/(\.[^.]+)$/, '-compressed$1');
            link.click();
            URL.revokeObjectURL(link.href);
            toast('Compressed image downloaded!');
          } catch (err) {
            console.error('Download error:', err);
            toast('Failed to download image');
          }
        }
      });
    }

    // Drag divider functionality - EXACTLY as in original
    if (dragDivider && handle && compareViewport) {
      let isDragging = false;

      handle.addEventListener('mousedown', () => {
        isDragging = true;
      });

      document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const rect = compareViewport.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
        
        compareViewport.style.setProperty('--split', percent + '%');
      });

      document.addEventListener('mouseup', () => {
        isDragging = false;
      });

      // Touch support
      handle.addEventListener('touchstart', () => {
        isDragging = true;
      });

      document.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        
        const touch = e.touches[0];
        const rect = compareViewport.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
        
        compareViewport.style.setProperty('--split', percent + '%');
      });

      document.addEventListener('touchend', () => {
        isDragging = false;
      });
    }

    // Initialize
    setEmptyState();
    syncQualityInputs(50);
    
    console.log('WordPress Image Compressor: Initialized successfully with all original features');
  });
})();