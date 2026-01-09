/**
 * utils.js - Common utility functions
 * Shared utilities for the customer management application
 */

/**
 * Formats a date to German dd.mm.yy format
 * @param {string|Date} date - Date string or Date object
 * @returns {string} Formatted date string (dd.mm.yy)
 */
export function formatDateGerman(date) {
    if (!date) return "";

    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return "";

    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = String(dateObj.getFullYear()).slice(-2);

    return `${day}.${month}.${year}`;
}

/**
 * Formats a price to German currency format
 * @param {number|string} price - Price value
 * @returns {string} Formatted price (X,XX €)
 */
export function formatPriceGerman(price) {
    if (!price) return "";

    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(numPrice)) return "";

    return numPrice.toLocaleString('de-DE', {
        style: 'currency',
        currency: 'EUR'
    });
}

/**
 * Detects file type from filename or MIME type
 * @param {string} filename - File name
 * @param {string} type - MIME type (optional)
 * @returns {object} File type information {isImage, isPdf, isWord, icon, bgColor, iconColor}
 */
export function detectFileType(filename, type = "") {
    const name = filename.toLowerCase();
    const mimeType = type.toLowerCase();

    const isImage = mimeType.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp)$/i.test(name);
    const isPdf = mimeType.includes("pdf") || name.endsWith(".pdf");
    const isWord = mimeType.includes("word") || /\.(doc|docx)$/i.test(name);

    let icon = "file";
    let bgColor = "bg-slate-100";
    let iconColor = "text-slate-600";

    if (isImage) {
        icon = "image";
        bgColor = "bg-purple-50";
        iconColor = "text-purple-600";
    } else if (isPdf) {
        icon = "file-text";
        bgColor = "bg-red-50";
        iconColor = "text-red-600";
    } else if (isWord) {
        icon = "file-type-2";
        bgColor = "bg-blue-50";
        iconColor = "text-blue-600";
    }

    return { isImage, isPdf, isWord, icon, bgColor, iconColor };
}

/**
 * Parses various date formats to timestamp
 * @param {string} dateStr - Date string in various formats
 * @returns {number} Timestamp or 0 if invalid
 */
export function parseDateToTimestamp(dateStr) {
    if (!dateStr) return 0;

    // Handle YYYY-MM-DD (ISO)
    if (dateStr.includes('-')) {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            const y = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10) - 1;
            const d = parseInt(parts[2], 10);
            return new Date(y, m, d).getTime();
        }
    }

    // Handle DD.MM.YYYY or DD.MM.YY
    if (dateStr.includes('.')) {
        const parts = dateStr.split('.');
        if (parts.length === 3) {
            let d = parseInt(parts[0], 10);
            let m = parseInt(parts[1], 10) - 1;
            let y = parseInt(parts[2], 10);

            if (y < 100) y += 2000;

            return new Date(y, m, d).getTime();
        }
    }

    return 0;
}

/**
 * Truncates a filename for display
 * @param {string} filename - Full filename
 * @param {number} maxLength - Maximum length before truncation
 * @returns {string} Truncated filename
 */
export function truncateFilename(filename, maxLength = 20) {
    if (!filename || filename.length <= maxLength) return filename;

    const ext = filename.split('.').pop();
    const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
    const truncateLength = maxLength - ext.length - 4; // -4 for "..." and "."

    if (truncateLength < 1) return `...${filename.slice(-maxLength)}`;

    return `${nameWithoutExt.slice(0, truncateLength)}...${ext}`;
}

/**
 * Debounce function for search/filter operations
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
