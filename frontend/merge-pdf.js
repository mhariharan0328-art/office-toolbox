
const API_BASE = "https://office-toolbox.onrender.com";

const pdfInput = document.getElementById("pdfInput");
const fileList = document.getElementById("fileList");
const fileSummary = document.getElementById("fileSummary");
const mergeBtn = document.getElementById("mergeBtn");
const statusBox = document.getElementById("status");
const preview = document.getElementById("preview");

let pdfFiles = [];
let previewUrl = null;
let isMerging = false;

const MAX_FILES = 20;
const MAX_TOTAL_SIZE = 100 * 1024 * 1024;

// ==============================
// PDF.JS SETUP
// ==============================

if (typeof pdfjsLib !== "undefined") {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
}

// ==============================
// HELPER FUNCTIONS
// ==============================

function showStatus(message, type = "") {
    statusBox.textContent = message;
    statusBox.className = type;
}

function formatSize(bytes) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function cleanupPreview() {
    if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        previewUrl = null;
    }

    preview.removeAttribute("src");
    preview.hidden = true;
}

async function getPageCount(file) {
    if (typeof pdfjsLib === "undefined") {
        throw new Error("PDF.js did not load.");
    }

    const data = await file.arrayBuffer();

    const pdf = await pdfjsLib.getDocument({
        data: new Uint8Array(data)
    }).promise;

    const pageCount = pdf.numPages;

    await pdf.destroy();

    return pageCount;
}

// ==============================
// RENDER FILE LIST
// ==============================

function renderFiles() {
    fileList.replaceChildren();

    pdfFiles.forEach((item, index) => {
        const file = item.file;
        const row = document.createElement("div");

        row.className = "file";
row.draggable = !isMerging;
row.title = "Drag this PDF to change its order";

        const info = document.createElement("div");
        info.className = "file-info";

        const name = document.createElement("strong");
        name.textContent = `${index + 1}. ${file.name}`;

        const details = document.createElement("small");

        let pageText = "Counting pages...";

        if (item.pageCount !== null) {
            pageText = item.pageCount === "Unknown"
                ? "Page count unavailable"
                : `${item.pageCount} page(s)`;
        }

        details.textContent =
            `${formatSize(file.size)} · ${pageText}`;

        info.append(name, details);

        // Preview button
        const previewButton = document.createElement("button");
        previewButton.className = "move";
        previewButton.textContent = "Preview";
        previewButton.disabled = isMerging;

        previewButton.addEventListener("click", () => {
            cleanupPreview();

            previewUrl = URL.createObjectURL(file);
            preview.src = previewUrl;
            preview.hidden = false;
            preview.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        });

        // Move up
        const upButton = document.createElement("button");
        upButton.className = "move";
        upButton.textContent = "↑";
        upButton.title = "Move up";
        upButton.disabled = isMerging || index === 0;

        upButton.addEventListener("click", () => {
            [pdfFiles[index - 1], pdfFiles[index]] =
                [pdfFiles[index], pdfFiles[index - 1]];

            renderFiles();
        });

        // Move down
        const downButton = document.createElement("button");
        downButton.className = "move";
        downButton.textContent = "↓";
        downButton.title = "Move down";
        downButton.disabled =
            isMerging || index === pdfFiles.length - 1;

        downButton.addEventListener("click", () => {
            [pdfFiles[index], pdfFiles[index + 1]] =
                [pdfFiles[index + 1], pdfFiles[index]];

            renderFiles();
        });

        // Remove file
        const removeButton = document.createElement("button");
        removeButton.className = "remove";
        removeButton.textContent = "Remove";
        removeButton.disabled = isMerging;

        removeButton.addEventListener("click", () => {
            pdfFiles.splice(index, 1);
            cleanupPreview();
            renderFiles();
        });

        row.append(
            info,
            previewButton,
            upButton,
            downButton,
            removeButton
        );

        fileList.append(row);

// Drag-and-drop reordering
row.addEventListener("dragstart", (event) => {
    if (isMerging) {
        event.preventDefault();
        return;
    }

    event.dataTransfer.setData(
        "text/plain",
        String(index)
    );

    event.dataTransfer.effectAllowed = "move";
    row.style.opacity = "0.5";
});

row.addEventListener("dragend", () => {
    row.style.opacity = "1";
    fileList.querySelectorAll(".file").forEach(fileRow => {
        fileRow.style.borderColor = "";
    });
});

row.addEventListener("dragover", (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    row.style.borderColor = "#2563eb";
});

row.addEventListener("dragleave", () => {
    row.style.borderColor = "";
});

row.addEventListener("drop", (event) => {
    event.preventDefault();
    row.style.borderColor = "";

    if (isMerging) return;

    const fromIndex = Number(
        event.dataTransfer.getData("text/plain")
    );
    const toIndex = index;

    if (
        !Number.isInteger(fromIndex) ||
        fromIndex < 0 ||
        fromIndex >= pdfFiles.length ||
        fromIndex === toIndex
    ) {
        return;
    }

    const [movedFile] = pdfFiles.splice(fromIndex, 1);
    pdfFiles.splice(toIndex, 0, movedFile);

    renderFiles();
});
    });

    const totalSize = pdfFiles.reduce(
        (sum, item) => sum + item.file.size,
        0
    );

    const totalPages = pdfFiles.every(
        item => Number.isInteger(item.pageCount)
    )
        ? pdfFiles.reduce(
            (sum, item) => sum + item.pageCount,
            0
        )
        : null;

    if (pdfFiles.length === 0) {
        fileSummary.textContent = "No PDFs selected.";
    } else {
        fileSummary.textContent =
            `${pdfFiles.length} PDF(s) · ${formatSize(totalSize)} total` +
            (totalPages !== null
                ? ` · ${totalPages} total page(s)`
                : "");
    }

    mergeBtn.disabled =
        isMerging || pdfFiles.length < 2;

    pdfInput.disabled = isMerging;
}

// ==============================
// SELECT PDF FILES
// ==============================

pdfInput.addEventListener("change", async () => {
    cleanupPreview();
    showStatus("");

    const selected = Array.from(pdfInput.files || []);
    pdfInput.value = "";

    if (selected.length === 0) {
        return;
    }

    const combined = [
        ...pdfFiles,
        ...selected.map(file => ({
            file,
            pageCount: null
        }))
    ];

    const seen = new Set();

    for (const item of combined) {
        const file = item.file;

        if (!file.name.toLowerCase().endsWith(".pdf")) {
            showStatus(
                "Please select PDF files only.",
                "error"
            );
            return;
        }

        const identity =
            `${file.name}:${file.size}:${file.lastModified}`;

        if (seen.has(identity)) {
            showStatus(
                "Duplicate file detected. Remove duplicates before merging.",
                "error"
            );
            return;
        }

        seen.add(identity);
    }

    if (combined.length > MAX_FILES) {
        showStatus(
            "You can select up to 20 PDF files.",
            "error"
        );
        return;
    }

    const totalSize = combined.reduce(
        (sum, item) => sum + item.file.size,
        0
    );

    if (totalSize > MAX_TOTAL_SIZE) {
        showStatus(
            "The combined file size must be 100 MB or less.",
            "error"
        );
        return;
    }

    pdfFiles = combined;
    renderFiles();

    // Read page counts for newly selected files.
    showStatus("Reading PDF page counts...");

    for (const item of pdfFiles) {
        if (item.pageCount !== null) {
            continue;
        }

        try {
            item.pageCount = await getPageCount(item.file);
        } catch (error) {
            console.error(
                "Unable to read PDF page count:",
                item.file.name,
                error
            );

            item.pageCount = "Unknown";
        }

        renderFiles();
    }

    showStatus("PDF files are ready.", "success");
});

// ==============================
// MERGE AND DOWNLOAD
// ==============================

mergeBtn.addEventListener("click", async () => {
    if (isMerging || pdfFiles.length < 2) {
        return;
    }

    isMerging = true;
    renderFiles();

    showStatus(
        "Merging your PDFs. Please wait..."
    );

    const formData = new FormData();

    pdfFiles.forEach(item => {
        formData.append(
            "files",
            item.file,
            item.file.name
        );
    });

    try {
        const response = await fetch(
            `${API_BASE}/api/merge-pdf`,
            {
                method: "POST",
                body: formData
            }
        );

        if (!response.ok) {
            let message =
                "Unable to merge the selected PDFs.";

            try {
                const data = await response.json();
                message = data.detail || message;
            } catch (_) {}

            throw new Error(message);
        }

        const blob = await response.blob();

        if (blob.size === 0) {
            throw new Error(
                "The server returned an empty PDF."
            );
        }

        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = downloadUrl;
        link.download = "merged.pdf";

        document.body.append(link);
        link.click();
        link.remove();

        setTimeout(() => {
            URL.revokeObjectURL(downloadUrl);
        }, 1000);

        showStatus(
            "Success! Your merged PDF has been downloaded.",
            "success"
        );

    } catch (error) {
        showStatus(
            `${error.message}\nCheck that your local API is running.`,
            "error"
        );

    } finally {
        isMerging = false;
        renderFiles();
    }
});

// ==============================
// CLEANUP
// ==============================

window.addEventListener(
    "beforeunload",
    cleanupPreview
);

renderFiles();
