document.addEventListener('DOMContentLoaded', () => {

    // --- State Management ---
    let currentCategory = 'text';
    let qrCode = new QRCodeStyling({
        width: 300,
        height: 300,
        type: "svg",
        data: "",
        image: "",
        dotsOptions: {
            color: "#000000",
            type: "rounded"
        },
        backgroundOptions: {
            color: "#ffffff",
        },
        imageOptions: {
            crossOrigin: "anonymous",
            margin: 10
        }
    });

    // --- DOM Elements ---
    const navItems = document.querySelectorAll('.nav-item');
    const forms = document.querySelectorAll('.form-group');
    const categoryTitle = document.getElementById('category-title');
    const qrContainer = document.getElementById('qr-code');
    const barcodeDisplay = document.getElementById('barcode-display');
    const themeSwitch = document.getElementById('theme-switch');
    const brandNameInput = document.getElementById('brand-name');
    const brandColorInput = document.getElementById('brand-color');
    const brandLogoInput = document.getElementById('brand-logo');
    const previewBrandName = document.getElementById('preview-brand-name');
    const previewCategory = document.getElementById('preview-category');
    const qrWrapper = document.getElementById('qr-wrapper');
    const historyList = document.getElementById('history-list');

    // --- Initialization ---
    qrCode.append(qrContainer);
    loadHistory();
    updateQR(); // Initial render

    // --- Event Listeners ---

    // Navigation
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const category = item.dataset.category;
            switchCategory(category);
        });
    });

    // Theme Toggle
    themeSwitch.addEventListener('change', () => {
        if (themeSwitch.checked) {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
    });

    // Input Changes (Debounced)
    const inputs = document.querySelectorAll('input, textarea, select');
    let debounceTimer;
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                updateQR();
                updatePreviewInfo();
            }, 300);
        });
    });

    // Brand Logo Upload
    brandLogoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                qrCode.update({
                    image: reader.result
                });
            };
            reader.readAsDataURL(file);
        } else {
            qrCode.update({ image: "" });
        }
    });

    // Downloads
    document.getElementById('download-png').addEventListener('click', () => downloadQR('png'));
    document.getElementById('download-jpg').addEventListener('click', () => downloadQR('jpeg'));
    document.getElementById('download-svg').addEventListener('click', () => downloadQR('svg'));
    document.getElementById('print-qr').addEventListener('click', printQR);

    // --- Functions ---

    function switchCategory(category) {
        currentCategory = category;

        // Update Nav
        navItems.forEach(item => {
            if (item.dataset.category === category) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Update Forms
        forms.forEach(form => {
            form.classList.remove('active');
        });
        const activeForm = document.getElementById(`form-${category}`);
        if (activeForm) activeForm.classList.add('active');

        // Update Title
        categoryTitle.textContent = `Generate ${category.charAt(0).toUpperCase() + category.slice(1)} QR`;
        previewCategory.textContent = `${category.charAt(0).toUpperCase() + category.slice(1)} QR`;

        // Reset QR/Barcode visibility
        if (category === 'barcode') {
            qrContainer.style.display = 'none';
            barcodeDisplay.style.display = 'block';
        } else {
            qrContainer.style.display = 'block';
            barcodeDisplay.style.display = 'none';
        }

        updateQR();
        updateAITheme(category);
    }

    function getDataForCategory(category) {
        switch (category) {
            case 'text':
                return document.getElementById('input-text').value || " ";
            case 'url':
                return document.getElementById('input-url').value || "https://example.com";
            case 'wifi':
                const ssid = document.getElementById('wifi-ssid').value;
                const pass = document.getElementById('wifi-password').value;
                const type = document.getElementById('wifi-type').value;
                const hidden = document.getElementById('wifi-hidden').checked;
                return `WIFI:S:${ssid};T:${type};P:${pass};H:${hidden};;`;
            case 'email':
                const email = document.getElementById('email-address').value;
                const subject = document.getElementById('email-subject').value;
                const body = document.getElementById('email-body').value;
                return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            case 'sms':
                const phone = document.getElementById('sms-phone').value;
                const msg = document.getElementById('sms-message').value;
                return `SMSTO:${phone}:${msg}`;
            case 'whatsapp':
                const waPhone = document.getElementById('whatsapp-phone').value;
                const waMsg = document.getElementById('whatsapp-message').value;
                return `https://wa.me/${waPhone}?text=${encodeURIComponent(waMsg)}`;
            case 'facebook':
                return document.getElementById('facebook-url').value || "https://facebook.com";
            case 'instagram':
                const igUser = document.getElementById('instagram-username').value;
                return `https://instagram.com/${igUser}`;
            case 'twitter':
                const twUser = document.getElementById('twitter-username').value;
                return `https://twitter.com/${twUser}`;
            case 'vcard':
                const first = document.getElementById('vcard-first').value;
                const last = document.getElementById('vcard-last').value;
                const vPhone = document.getElementById('vcard-phone').value;
                const vEmail = document.getElementById('vcard-email').value;
                const vSite = document.getElementById('vcard-site').value;
                const vOrg = document.getElementById('vcard-company').value;
                const vTitle = document.getElementById('vcard-job').value;
                const vStreet = document.getElementById('vcard-street').value;
                const vCity = document.getElementById('vcard-city').value;
                const vCountry = document.getElementById('vcard-country').value;
                return `BEGIN:VCARD\nVERSION:3.0\nN:${last};${first}\nFN:${first} ${last}\nORG:${vOrg}\nTITLE:${vTitle}\nTEL:${vPhone}\nEMAIL:${vEmail}\nURL:${vSite}\nADR:;;${vStreet};${vCity};;;${vCountry}\nEND:VCARD`;
            case 'barcode':
                return document.getElementById('barcode-value').value || "123456789";
            default:
                return " ";
        }
    }

    function updateQR() {
        const data = getDataForCategory(currentCategory);
        const color = brandColorInput.value;

        if (currentCategory === 'barcode') {
            try {
                JsBarcode("#barcode-display", data, {
                    format: "CODE128",
                    lineColor: color,
                    width: 2,
                    height: 100,
                    displayValue: true
                });
            } catch (e) {
                // Handle invalid characters for barcode
            }
        } else {
            qrCode.update({
                data: data,
                dotsOptions: {
                    color: color,
                    type: "rounded"
                },
                cornersSquareOptions: {
                    color: color,
                    type: "extra-rounded"
                }
            });
        }

        addToHistory(currentCategory, data);
    }

    function updatePreviewInfo() {
        previewBrandName.textContent = brandNameInput.value || "My Shop";
    }

    function updateAITheme(category) {
        // AI Theme Logic: Generate gradients based on category
        let gradient = '';
        switch (category) {
            case 'text':
                gradient = 'linear-gradient(45deg, #6b7280, #374151)'; // Gray
                break;
            case 'url':
                gradient = 'linear-gradient(45deg, #3b82f6, #2563eb)'; // Blue
                break;
            case 'wifi':
                gradient = 'linear-gradient(45deg, #8b5cf6, #d946ef)'; // Purple/Pink
                break;
            case 'whatsapp':
                gradient = 'linear-gradient(45deg, #22c55e, #16a34a)'; // Green
                break;
            case 'facebook':
                gradient = 'linear-gradient(45deg, #1877f2, #0f52ba)'; // FB Blue
                break;
            case 'instagram':
                gradient = 'linear-gradient(45deg, #f59e0b, #ec4899, #8b5cf6)'; // Insta Gradient
                break;
            case 'twitter':
                gradient = 'linear-gradient(45deg, #000000, #333333)'; // X Black
                break;
            case 'email':
                gradient = 'linear-gradient(45deg, #f43f5e, #e11d48)'; // Red
                break;
            default:
                gradient = 'linear-gradient(45deg, var(--primary-color), #ec4899)';
        }

        // Apply to the pseudo-element via style injection (since we can't access pseudo-elements directly in JS)
        // Alternative: Change a CSS variable that the pseudo-element uses
        // But here we are using a simpler approach by setting the background of a wrapper or using a style tag

        // Actually, let's just set the style on the element itself if we weren't using pseudo-elements,
        // but since we used ::before in CSS, let's change the CSS variable approach which is cleaner.
        // Wait, I didn't define a variable for the gradient in CSS. Let's modify the CSS slightly or just inject a style.

        // Let's use a style tag for simplicity to override the rule
        let style = document.getElementById('dynamic-theme-style');
        if (!style) {
            style = document.createElement('style');
            style.id = 'dynamic-theme-style';
            document.head.appendChild(style);
        }
        style.innerHTML = `.qr-wrapper::before { background: ${gradient} !important; }`;
    }

    // --- Download & Print Logic ---

    async function downloadQR(format) {
        const brandName = brandNameInput.value || "My Shop";
        const categoryText = currentCategory.toUpperCase();

        if (currentCategory === 'barcode') {
            downloadBarcode(format, brandName);
        } else {
            // For QR Code, we need to composite the image with text
            // We can get the QR as a blob/buffer from the library
            // But the library's download() doesn't support custom text outside the QR.
            // So we will render it to a canvas manually.

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const size = 1000; // High res for download
            const padding = 50;
            const textSpace = 150; // Space for text at bottom

            canvas.width = size;
            canvas.height = size + textSpace;

            // Fill Background (White card look)
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Get QR Image
            // We need to wait for the QR to be ready. 
            // Since we are using qr-code-styling, we can get the raw image data.
            const rawData = await qrCode.getRawData('png');
            const img = new Image();
            img.src = URL.createObjectURL(rawData);

            img.onload = () => {
                // Draw QR
                ctx.drawImage(img, 0, 0, size, size);

                // Draw Brand Name
                ctx.font = "bold 60px Poppins, sans-serif";
                ctx.fillStyle = brandColorInput.value || "#000000";
                ctx.textAlign = "center";
                ctx.fillText(brandName, size / 2, size + 60);

                // Draw Category/Subtitle
                ctx.font = "40px Poppins, sans-serif";
                ctx.fillStyle = "#6b7280";
                ctx.fillText(categoryText + " QR", size / 2, size + 120);

                // Download
                const link = document.createElement('a');
                link.download = `${brandName.replace(/\s+/g, '_')}_QR.${format}`;
                link.href = canvas.toDataURL(`image/${format === 'svg' ? 'png' : format}`); // Fallback to png for canvas if svg requested, or handle svg separately

                if (format === 'svg') {
                    // For SVG, we can't easily composite text with the library's output without parsing SVG.
                    // For now, we'll download PNG for the composite view or just standard SVG for the QR only.
                    // Let's stick to PNG/JPG for the composite text feature as it's pixel-based.
                    // If user really wants SVG with text, we'd need to construct an SVG string.
                    alert("SVG download with text is not fully supported. Downloading plain QR SVG.");
                    qrCode.download({ name: "qr-code", extension: "svg" });
                } else {
                    link.click();
                }
            };
        }
    }

    function downloadBarcode(format, brandName) {
        const svg = document.getElementById('barcode-display');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        // Serialize SVG
        const xml = new XMLSerializer().serializeToString(svg);
        const svg64 = btoa(xml);
        const b64Start = 'data:image/svg+xml;base64,';
        const image64 = b64Start + svg64;

        img.onload = () => {
            canvas.width = img.width + 100;
            canvas.height = img.height + 150;

            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.drawImage(img, 50, 20);

            ctx.font = "bold 24px Poppins, sans-serif";
            ctx.fillStyle = "#000000";
            ctx.textAlign = "center";
            ctx.fillText(brandName, canvas.width / 2, canvas.height - 80);

            const link = document.createElement('a');
            link.download = `barcode.${format}`;
            link.href = canvas.toDataURL(`image/${format}`);
            link.click();
        };

        img.src = image64;
    }

    function printQR() {
        // We rely on CSS @media print to style the page for printing
        // But we want to ensure the text is visible in the print view.
        // The current DOM already has the text in 'preview-info', so we just need to make sure
        // the print stylesheet hides everything else and centers the preview card.
        window.print();
    }

    // --- History Management ---
    function addToHistory(type, data) {
        // Simple debounce for history to avoid saving every keystroke
        // We'll actually just save on "Download" or maybe just keep the last 10 unique ones
        // For this demo, let's just save when switching categories or explicitly generating?
        // The requirement says "History of last 10 generated".
        // Let's save to localStorage but only update the UI list occasionally or when data is stable.

        // For now, let's just save the current state to a "Draft" in local storage, 
        // and add to "History" list only when the user clicks a "Save" or "Download" button?
        // Or maybe just every few seconds.

        // Let's implement a simple "Recent" list that updates on category switch or download.
    }

    // Let's actually make the history update when the user clicks "Download" 
    // because that implies they are happy with the result.
    // Or we can add a "Generate" button? The prompt implies "Auto" generation.

    // Let's hook into the download buttons to save history.
    const downloadBtns = document.querySelectorAll('.btn-download');
    downloadBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            saveToHistory(currentCategory, getDataForCategory(currentCategory));
        });
    });

    function saveToHistory(type, data) {
        let history = JSON.parse(localStorage.getItem('qr_history') || '[]');

        // Avoid duplicates at the top
        if (history.length > 0 && history[0].data === data && history[0].type === type) return;

        const item = {
            type,
            data,
            date: new Date().toLocaleDateString()
        };

        history.unshift(item);
        if (history.length > 10) history.pop();

        localStorage.setItem('qr_history', JSON.stringify(history));
        loadHistory();
    }

    function loadHistory() {
        const history = JSON.parse(localStorage.getItem('qr_history') || '[]');
        historyList.innerHTML = '';

        history.forEach(item => {
            const div = document.createElement('div');
            div.className = 'history-item';
            div.innerHTML = `
                <div class="history-icon">
                    <i class="fa-solid fa-qrcode"></i>
                </div>
                <div class="history-details">
                    <div class="history-title">${item.type.toUpperCase()}</div>
                    <div class="history-date">${item.date}</div>
                </div>
            `;
            div.addEventListener('click', () => {
                // Restore state (simplified)
                // In a full app, we'd fill the forms back up.
                // For now, let's just alert or log.
                console.log("Restoring", item);
            });
            historyList.appendChild(div);
        });
    }

});
