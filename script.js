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

    // --- Helper Functions ---

    function extractCoordinates(input) {
        // Try to extract coordinates from various Google Maps URL formats or direct input
        const patterns = [
            /q=([-\d.]+),([-\d.]+)/, // ?q=lat,lng
            /@([-\d.]+),([-\d.]+)/, // @lat,lng
            /!([-\d.]+)!([-\d.]+)/, // !lat!lng
            /^([-\d.]+),\s*([-\d.]+)$/ // Direct: lat,lng
        ];

        for (let pattern of patterns) {
            const match = input.match(pattern);
            if (match) {
                return { lat: match[1], lng: match[2] };
            }
        }
        return null;
    }

    // --- Event Listeners ---

    // V-Card Phone Number Management
    const phonesContainer = document.getElementById('vcard-phones-container');
    const addPhoneBtn = document.getElementById('add-phone-btn');

    if (addPhoneBtn) {
        addPhoneBtn.addEventListener('click', () => {
            const phoneRow = document.createElement('div');
            phoneRow.className = 'phone-input-row';
            phoneRow.innerHTML = `
                <select class="phone-type">
                    <option value="CELL">Mobile</option>
                    <option value="WORK">Work</option>
                    <option value="HOME">Home</option>
                    <option value="VOICE">Voice</option>
                </select>
                <input type="tel" class="phone-number" placeholder="+1 234 567 890">
                <button type="button" class="btn-remove-phone">×</button>
            `;
            phonesContainer.appendChild(phoneRow);

            // Add event listener to the remove button
            const removeBtn = phoneRow.querySelector('.btn-remove-phone');
            removeBtn.addEventListener('click', () => {
                phoneRow.remove();
                updateRemoveButtons();
            });

            updateRemoveButtons();

            // Trigger QR update
            setTimeout(() => updateQR(), 100);
        });
    }

    function updateRemoveButtons() {
        const phoneRows = document.querySelectorAll('#vcard-phones-container .phone-input-row');
        phoneRows.forEach((row, index) => {
            const removeBtn = row.querySelector('.btn-remove-phone');
            if (phoneRows.length > 1) {
                removeBtn.style.display = 'block';
            } else {
                removeBtn.style.display = 'none';
            }
        });
    }

    // Delegate event for phone inputs (for dynamically added fields)
    if (phonesContainer) {
        phonesContainer.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                updateQR();
                updatePreviewInfo();
            }, 300);
        });
    }

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
                const vEmail = document.getElementById('vcard-email').value;
                const vSite = document.getElementById('vcard-site').value;
                const vOrg = document.getElementById('vcard-company').value;
                const vTitle = document.getElementById('vcard-job').value;
                const vStreet = document.getElementById('vcard-street').value;
                const vCity = document.getElementById('vcard-city').value;
                const vCountry = document.getElementById('vcard-country').value;
                const vLocation = document.getElementById('vcard-location').value;

                // Collect all phone numbers
                const phoneRows = document.querySelectorAll('#vcard-phones-container .phone-input-row');
                let phoneLines = '';
                phoneRows.forEach(row => {
                    const type = row.querySelector('.phone-type').value;
                    const number = row.querySelector('.phone-number').value;
                    if (number.trim()) {
                        phoneLines += `TEL;TYPE=${type}:${number}\n`;
                    }
                });

                // Parse Google Maps location
                let geoLine = '';
                if (vLocation.trim()) {
                    const coords = extractCoordinates(vLocation);
                    if (coords) {
                        geoLine = `GEO:${coords.lat};${coords.lng}\n`;
                    }
                }

                return `BEGIN:VCARD\nVERSION:3.0\nN:${last};${first}\nFN:${first} ${last}\nORG:${vOrg}\nTITLE:${vTitle}\n${phoneLines}EMAIL:${vEmail}\nURL:${vSite}\nADR:;;${vStreet};${vCity};;;${vCountry}\n${geoLine}END:VCARD`;
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
        if (currentCategory === 'barcode') {
            downloadBarcode(format, brandNameInput.value || "My Shop");
        } else if (currentCategory === 'vcard') {
            // Special business card format for V-Card
            await downloadVCardBusinessCard(format);
        } else {
            // Standard QR download for other categories
            await downloadStandardQR(format);
        }
    }

    async function downloadVCardBusinessCard(format) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // ATM Card dimensions at 300 DPI: 3.375" × 2.125" = 1012px × 638px
        const width = 1012;
        const height = 638;
        const padding = 40;

        canvas.width = width;
        canvas.height = height;

        // Background - White
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        // Add subtle border
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 2;
        ctx.strokeRect(10, 10, width - 20, height - 20);

        // Get V-Card data
        const first = document.getElementById('vcard-first').value || '';
        const last = document.getElementById('vcard-last').value || '';
        const fullName = `${first} ${last}`.trim();
        const vEmail = document.getElementById('vcard-email').value || '';
        const vOrg = document.getElementById('vcard-company').value || '';
        const vTitle = document.getElementById('vcard-job').value || '';
        const vStreet = document.getElementById('vcard-street').value || '';
        const vCity = document.getElementById('vcard-city').value || '';
        const vCountry = document.getElementById('vcard-country').value || '';
        const brandName = brandNameInput.value || '';

        // Get all phone numbers
        const phoneRows = document.querySelectorAll('#vcard-phones-container .phone-input-row');
        const phones = [];
        phoneRows.forEach(row => {
            const number = row.querySelector('.phone-number').value;
            if (number.trim()) {
                phones.push(number);
            }
        });

        // Build address string
        let address = vStreet;
        if (vCity) address += (address ? ', ' : '') + vCity;
        if (vCountry) address += (address ? ', ' : '') + vCountry;

        // Get QR Code as image
        const rawData = await qrCode.getRawData('png');
        const qrImg = new Image();
        qrImg.src = URL.createObjectURL(rawData);

        qrImg.onload = () => {
            // QR Code - centered at top, larger size
            const qrSize = 280;
            const qrX = (width - qrSize) / 2;
            const qrY = 50;

            // Draw black background for QR
            ctx.fillStyle = '#000000';
            ctx.fillRect(qrX - 15, qrY - 15, qrSize + 30, qrSize + 30);

            ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

            // Text section starts below QR
            let currentY = qrY + qrSize + 40;

            // Brand Name (if provided)
            if (brandName) {
                ctx.font = 'bold 32px Poppins, Arial, sans-serif';
                ctx.fillStyle = '#000000';
                ctx.textAlign = 'center';
                ctx.fillText(brandName.toUpperCase(), width / 2, currentY);
                currentY += 40;
            }

            // Full Name
            if (fullName) {
                ctx.font = 'bold 28px Poppins, Arial, sans-serif';
                ctx.fillStyle = '#000000';
                ctx.textAlign = 'center';
                ctx.fillText(fullName, width / 2, currentY);
                currentY += 35;
            }

            // Company & Title
            if (vOrg || vTitle) {
                const orgText = vTitle ? `${vTitle}${vOrg ? ' at ' + vOrg : ''}` : vOrg;
                ctx.font = '20px Poppins, Arial, sans-serif';
                ctx.fillStyle = '#4b5563';
                ctx.textAlign = 'center';
                ctx.fillText(orgText, width / 2, currentY);
                currentY += 30;
            }

            // Phone Numbers with icons
            if (phones.length > 0) {
                ctx.font = 'bold 22px Poppins, Arial, sans-serif';
                ctx.fillStyle = '#000000';
                ctx.textAlign = 'center';
                const phoneText = '📞 : ' + phones.join(', ');
                ctx.fillText(phoneText, width / 2, currentY);
                currentY += 30;
            }

            // Email with icon
            if (vEmail) {
                ctx.font = '20px Poppins, Arial, sans-serif';
                ctx.fillStyle = '#1d4ed8';
                ctx.textAlign = 'center';
                ctx.fillText('📧 : ' + vEmail, width / 2, currentY);
                currentY += 28;
            }

            // Address with icon (wrapped if too long)
            if (address) {
                ctx.font = '18px Poppins, Arial, sans-serif';
                ctx.fillStyle = '#dc2626';
                ctx.textAlign = 'center';

                const maxWidth = width - 80;
                const addressText = '📍 : ' + address;

                // Wrap text if needed
                const words = addressText.split(' ');
                let line = '';
                let lines = [];

                for (let n = 0; n < words.length; n++) {
                    const testLine = line + words[n] + ' ';
                    const metrics = ctx.measureText(testLine);
                    if (metrics.width > maxWidth && n > 0) {
                        lines.push(line);
                        line = words[n] + ' ';
                    } else {
                        line = testLine;
                    }
                }
                lines.push(line);

                lines.forEach((line, index) => {
                    ctx.fillText(line.trim(), width / 2, currentY + (index * 24));
                });
            }

            // Download
            const link = document.createElement('a');
            const fileName = fullName || brandName || 'contact_card';
            const fileExt = format === 'jpeg' ? 'jpg' : format;
            const mimeType = format === 'jpeg' ? 'jpeg' : format;

            link.download = `${fileName.replace(/\s+/g, '_')}_Card.${fileExt}`;
            link.href = canvas.toDataURL(`image/${mimeType}`);
            link.click();
        };
    }

    async function downloadStandardQR(format) {
        const brandName = brandNameInput.value || "My Shop";
        const categoryText = currentCategory.toUpperCase();

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const size = 1000;
        const padding = 50;
        const textSpace = 150;

        canvas.width = size;
        canvas.height = size + textSpace;

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const rawData = await qrCode.getRawData('png');
        const img = new Image();
        img.src = URL.createObjectURL(rawData);

        img.onload = () => {
            ctx.drawImage(img, 0, 0, size, size);

            ctx.font = "bold 60px Poppins, sans-serif";
            ctx.fillStyle = brandColorInput.value || "#000000";
            ctx.textAlign = "center";
            ctx.fillText(brandName, size / 2, size + 60);

            ctx.font = "40px Poppins, sans-serif";
            ctx.fillStyle = "#6b7280";
            ctx.fillText(categoryText + " QR", size / 2, size + 120);

            const link = document.createElement('a');
            const fileExt = format === 'jpeg' ? 'jpg' : (format === 'svg' ? 'svg' : 'png');
            const mimeType = format === 'jpeg' ? 'jpeg' : (format === 'svg' ? 'png' : 'png');

            link.download = `${brandName.replace(/\s+/g, '_')}_QR.${fileExt}`;
            link.href = canvas.toDataURL(`image/${mimeType}`);

            if (format === 'svg') {
                alert("SVG download with text is not fully supported. Downloading plain QR SVG.");
                qrCode.download({ name: "qr-code", extension: "svg" });
            } else {
                link.click();
            }
        };
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
            const fileExt = format === 'jpeg' ? 'jpg' : (format === 'svg' ? 'svg' : 'png');
            link.download = `${brandName}_barcode.${fileExt}`;
            link.href = canvas.toDataURL(`image/${format === 'jpeg' ? 'jpeg' : format}`);
            link.click();
        };

        img.src = image64;
    }

    function printQR() {
        if (currentCategory === 'vcard') {
            // Create print preview for business card
            printVCardBusinessCard();
        } else {
            // Standard print for other categories
            window.print();
        }
    }

    async function printVCardBusinessCard() {
        // Create a temporary canvas for printing
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // ATM Card dimensions
        const width = 1012;
        const height = 638;

        canvas.width = width;
        canvas.height = height;

        // Background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        // Border
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 2;
        ctx.strokeRect(10, 10, width - 20, height - 20);

        // Get V-Card data
        const first = document.getElementById('vcard-first').value || '';
        const last = document.getElementById('vcard-last').value || '';
        const fullName = `${first} ${last}`.trim();
        const vEmail = document.getElementById('vcard-email').value || '';
        const vOrg = document.getElementById('vcard-company').value || '';
        const vTitle = document.getElementById('vcard-job').value || '';
        const vStreet = document.getElementById('vcard-street').value || '';
        const vCity = document.getElementById('vcard-city').value || '';
        const vCountry = document.getElementById('vcard-country').value || '';
        const brandName = brandNameInput.value || '';

        // Get all phone numbers
        const phoneRows = document.querySelectorAll('#vcard-phones-container .phone-input-row');
        const phones = [];
        phoneRows.forEach(row => {
            const number = row.querySelector('.phone-number').value;
            if (number.trim()) {
                phones.push(number);
            }
        });

        // Build address
        let address = vStreet;
        if (vCity) address += (address ? ', ' : '') + vCity;
        if (vCountry) address += (address ? ', ' : '') + vCountry;

        // Get QR Code
        const rawData = await qrCode.getRawData('png');
        const qrImg = new Image();
        qrImg.src = URL.createObjectURL(rawData);

        qrImg.onload = () => {
            const qrSize = 280;
            const qrX = (width - qrSize) / 2;
            const qrY = 50;

            ctx.fillStyle = '#000000';
            ctx.fillRect(qrX - 15, qrY - 15, qrSize + 30, qrSize + 30);
            ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

            let currentY = qrY + qrSize + 40;

            if (brandName) {
                ctx.font = 'bold 32px Poppins, Arial, sans-serif';
                ctx.fillStyle = '#000000';
                ctx.textAlign = 'center';
                ctx.fillText(brandName.toUpperCase(), width / 2, currentY);
                currentY += 40;
            }

            if (fullName) {
                ctx.font = 'bold 28px Poppins, Arial, sans-serif';
                ctx.fillStyle = '#000000';
                ctx.textAlign = 'center';
                ctx.fillText(fullName, width / 2, currentY);
                currentY += 35;
            }

            if (vOrg || vTitle) {
                const orgText = vTitle ? `${vTitle}${vOrg ? ' at ' + vOrg : ''}` : vOrg;
                ctx.font = '20px Poppins, Arial, sans-serif';
                ctx.fillStyle = '#4b5563';
                ctx.textAlign = 'center';
                ctx.fillText(orgText, width / 2, currentY);
                currentY += 30;
            }

            if (phones.length > 0) {
                ctx.font = 'bold 22px Poppins, Arial, sans-serif';
                ctx.fillStyle = '#000000';
                ctx.textAlign = 'center';
                ctx.fillText('📞 : ' + phones.join(', '), width / 2, currentY);
                currentY += 30;
            }

            if (vEmail) {
                ctx.font = '20px Poppins, Arial, sans-serif';
                ctx.fillStyle = '#1d4ed8';
                ctx.textAlign = 'center';
                ctx.fillText('📧 : ' + vEmail, width / 2, currentY);
                currentY += 28;
            }

            if (address) {
                ctx.font = '18px Poppins, Arial, sans-serif';
                ctx.fillStyle = '#dc2626';
                ctx.textAlign = 'center';

                const maxWidth = width - 80;
                const addressText = '📍 : ' + address;
                const words = addressText.split(' ');
                let line = '';
                let lines = [];

                for (let n = 0; n < words.length; n++) {
                    const testLine = line + words[n] + ' ';
                    const metrics = ctx.measureText(testLine);
                    if (metrics.width > maxWidth && n > 0) {
                        lines.push(line);
                        line = words[n] + ' ';
                    } else {
                        line = testLine;
                    }
                }
                lines.push(line);

                lines.forEach((line, index) => {
                    ctx.fillText(line.trim(), width / 2, currentY + (index * 24));
                });
            }

            // Open print preview with the card
            const imageUrl = canvas.toDataURL('image/png');
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Print Business Card</title>
                    <style>
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body {
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            min-height: 100vh;
                            background: #f3f4f6;
                            font-family: Arial, sans-serif;
                        }
                        .container {
                            text-align: center;
                            padding: 20px;
                        }
                        h2 {
                            margin-bottom: 20px;
                            color: #1f2937;
                        }
                        img {
                            max-width: 100%;
                            height: auto;
                            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                            border-radius: 8px;
                            margin-bottom: 20px;
                        }
                        .buttons {
                            display: flex;
                            gap: 10px;
                            justify-content: center;
                        }
                        button {
                            padding: 12px 24px;
                            font-size: 16px;
                            border: none;
                            border-radius: 6px;
                            cursor: pointer;
                            font-weight: 600;
                        }
                        .print-btn {
                            background: #4f46e5;
                            color: white;
                        }
                        .print-btn:hover { background: #4338ca; }
                        .close-btn {
                            background: #6b7280;
                            color: white;
                        }
                        .close-btn:hover { background: #4b5563; }
                        @media print {
                            body {
                                background: white;
                            }
                            .container h2,
                            .buttons {
                                display: none;
                            }
                            img {
                                box-shadow: none;
                                border-radius: 0;
                                max-width: 85.6mm;
                                height: auto;
                            }
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h2>Business Card Print Preview</h2>
                        <img src="${imageUrl}" alt="Business Card">
                        <div class="buttons">
                            <button class="print-btn" onclick="window.print()">🖨️ Print</button>
                            <button class="close-btn" onclick="window.close()">✖ Close</button>
                        </div>
                    </div>
                </body>
                </html>
            `);
            printWindow.document.close();
        };
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
