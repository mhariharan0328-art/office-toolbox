const API_URL = "http://127.0.0.1:8000";

function scrollToTools() {
    const tools = document.getElementById("tools");
    if (tools) {
        tools.scrollIntoView({ behavior: "smooth" });
    }
}

function showComingSoon() {
    alert("🚀 This tool is coming soon. We are building it!");
}

function openDocumentPacker() {
    window.location.href = "packer.html";
}

const documentInput = document.getElementById("documents");
const dropZone = document.getElementById("dropZone");
const documentList = document.getElementById("documentList");
const emptyMessage = document.getElementById("emptyMessage");
const fileCount = document.getElementById("fileCount");
const summaryTitle = document.getElementById("summaryTitle");
const summaryText = document.getElementById("summaryText");
const summaryCount = document.getElementById("summaryCount");
const createButton = document.getElementById("createButton");
const statusMessage = document.getElementById("status");

let selectedFiles = [];
let draggedDocumentIndex = null;
let previewDocumentIndex = null;
let previewObjectUrl = null;

const documentTypes = [
    "Aadhaar",
    "PAN",
    "Bank",
    "Photo",
    "Offer Letter",
    "Joining Form",
    "Educational Certificate",
    "Experience Certificate",
    "Other"
];

function formatFileSize(bytes) {
    if (bytes === 0) {
        return "0 Bytes";
    }

    const sizes = ["Bytes", "KB", "MB", "GB"];

    const i = Math.floor(
        Math.log(bytes) / Math.log(1024)
    );

    return (
        parseFloat(
            (
                bytes /
                Math.pow(1024, i)
            ).toFixed(2)
        ) +
        " " +
        sizes[i]
    );
}

function getFileIcon(file) {
    const extension = file.name
        .split(".")
        .pop()
        .toLowerCase();

    if (extension === "pdf") {
        return "📄";
    }

    if (
        extension === "jpg" ||
        extension === "jpeg" ||
        extension === "png"
    ) {
        return "🖼️";
    }

    return "📎";
}

function isAllowedFile(file) {
    const allowedExtensions = [
        "pdf",
        "jpg",
        "jpeg",
        "png"
    ];

    const extension = file.name
        .split(".")
        .pop()
        .toLowerCase();

    return allowedExtensions.includes(extension);
}

function showStatus(message, type = "info") {
    if (!statusMessage) {
        return;
    }

    statusMessage.textContent = message;
    statusMessage.className = "status";

    if (type === "success") {
        statusMessage.classList.add("success");
    }

    if (type === "error") {
        statusMessage.classList.add("error");
    }

    if (type === "info") {
        statusMessage.classList.add("info");
    }
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function cleanCustomDocumentType(value) {
    return String(value || "")
        .trim()
        .replace(/[\\/:*?"<>|]/g, "")
        .replace(/\s+/g, " ")
        .slice(0, 80);
}

function createPreviewModal() {
    if (
        document.getElementById(
            "documentPreviewModal"
        )
    ) {
        return;
    }

    const modal =
        document.createElement("div");

    modal.id =
        "documentPreviewModal";

    modal.className =
        "document-preview-modal";

    modal.innerHTML = `
        <div class="document-preview-overlay"></div>

        <div class="document-preview-dialog">

            <div class="document-preview-header">

                <div class="document-preview-title">

                    <div
                        id="previewFileIcon"
                        class="preview-file-icon"
                    >
                        📄
                    </div>

                    <div>

                        <div
                            id="previewFileName"
                            class="preview-file-name"
                        >
                            Document Preview
                        </div>

                        <div
                            id="previewCounter"
                            class="preview-counter"
                        >
                            1 / 1
                        </div>

                    </div>

                </div>

                <button
                    type="button"
                    id="closePreviewButton"
                    class="preview-close-button"
                    title="Close preview"
                >
                    ✕
                </button>

            </div>

            <div
                id="previewContent"
                class="document-preview-content"
            ></div>

            <div class="document-preview-footer">

                <button
                    type="button"
                    id="previousPreviewButton"
                    class="preview-navigation-button"
                >
                    ← Previous
                </button>

                <div
                    id="previewDocumentType"
                    class="preview-document-type"
                >
                    Document
                </div>

                <button
                    type="button"
                    id="nextPreviewButton"
                    class="preview-navigation-button"
                >
                    Next →
                </button>

            </div>

        </div>
    `;

    document.body.appendChild(modal);

    const closeButton =
        document.getElementById(
            "closePreviewButton"
        );

    if (closeButton) {
        closeButton.addEventListener(
            "click",
            closePreview
        );
    }

    const overlay =
        modal.querySelector(
            ".document-preview-overlay"
        );

    if (overlay) {
        overlay.addEventListener(
            "click",
            closePreview
        );
    }

    const previousButton =
        document.getElementById(
            "previousPreviewButton"
        );

    if (previousButton) {
        previousButton.addEventListener(
            "click",
            function () {
                changePreview(-1);
            }
        );
    }

    const nextButton =
        document.getElementById(
            "nextPreviewButton"
        );

    if (nextButton) {
        nextButton.addEventListener(
            "click",
            function () {
                changePreview(1);
            }
        );
    }
}

function openPreview(index) {
    if (
        index < 0 ||
        index >= selectedFiles.length
    ) {
        return;
    }

    createPreviewModal();

    previewDocumentIndex = index;

    const modal =
        document.getElementById(
            "documentPreviewModal"
        );

    const content =
        document.getElementById(
            "previewContent"
        );

    const fileName =
        document.getElementById(
            "previewFileName"
        );

    const fileIcon =
        document.getElementById(
            "previewFileIcon"
        );

    const counter =
        document.getElementById(
            "previewCounter"
        );

    const documentType =
        document.getElementById(
            "previewDocumentType"
        );

    if (!modal || !content) {
        return;
    }

    if (previewObjectUrl) {
        URL.revokeObjectURL(
            previewObjectUrl
        );

        previewObjectUrl = null;
    }

    const item =
        selectedFiles[index];

    const file =
        item.file;

    const extension =
        file.name
            .split(".")
            .pop()
            .toLowerCase();

    previewObjectUrl =
        URL.createObjectURL(file);

    if (fileName) {
        fileName.textContent =
            file.name;
    }

    if (fileIcon) {
        fileIcon.textContent =
            getFileIcon(file);
    }

    if (counter) {
        counter.textContent =
            `${index + 1} / ${selectedFiles.length}`;
    }

    if (documentType) {
        documentType.textContent =
            item.documentType === "Other"
                ? item.customType || "Other"
                : item.documentType;
    }

    content.innerHTML = "";

    if (extension === "pdf") {

        const iframe =
            document.createElement(
                "iframe"
            );

        iframe.src =
            previewObjectUrl;

        iframe.className =
            "document-preview-pdf";

        iframe.title =
            "PDF preview";

        content.appendChild(
            iframe
        );

    } else if (
        extension === "jpg" ||
        extension === "jpeg" ||
        extension === "png"
    ) {

        const image =
            document.createElement(
                "img"
            );

        image.src =
            previewObjectUrl;

        image.alt =
            file.name;

        image.className =
            "document-preview-image";

        content.appendChild(
            image
        );

    } else {

        content.innerHTML = `
            <div class="preview-not-supported">
                <div class="preview-not-supported-icon">
                    📎
                </div>
                <p>
                    Preview is not available for this file.
                </p>
            </div>
        `;
    }

    modal.classList.add("show");

    document.body.classList.add(
        "preview-open"
    );

    updatePreviewNavigation();
}

function closePreview() {
    const modal =
        document.getElementById(
            "documentPreviewModal"
        );

    if (previewObjectUrl) {
        URL.revokeObjectURL(
            previewObjectUrl
        );

        previewObjectUrl = null;
    }

    previewDocumentIndex = null;

    if (modal) {
        modal.classList.remove(
            "show"
        );
    }

    document.body.classList.remove(
        "preview-open"
    );
}

function closePreviewModal() {
    closePreview();
}

function changePreview(direction) {
    if (
        previewDocumentIndex === null ||
        selectedFiles.length === 0
    ) {
        return;
    }

    let nextIndex =
        previewDocumentIndex +
        direction;

    if (nextIndex < 0) {
        nextIndex =
            selectedFiles.length - 1;
    }

    if (
        nextIndex >=
        selectedFiles.length
    ) {
        nextIndex = 0;
    }

    openPreview(nextIndex);
}

function updatePreviewNavigation() {
    const previousButton =
        document.getElementById(
            "previousPreviewButton"
        );

    const nextButton =
        document.getElementById(
            "nextPreviewButton"
        );

    if (!previousButton ||
        !nextButton) {
        return;
    }

    const disabled =
        selectedFiles.length <= 1;

    previousButton.disabled =
        disabled;

    nextButton.disabled =
        disabled;
}

document.addEventListener(
    "keydown",
    function (event) {

        const modal =
            document.getElementById(
                "documentPreviewModal"
            );

        if (
            !modal ||
            !modal.classList.contains("show")
        ) {
            return;
        }

        if (event.key === "Escape") {
            closePreview();
        }

        if (event.key === "ArrowLeft") {
            changePreview(-1);
        }

        if (event.key === "ArrowRight") {
            changePreview(1);
        }
    }
);

function updateSummary() {
    const count =
        selectedFiles.length;

    if (fileCount) {
        fileCount.textContent =
            `${count} ${
                count === 1
                    ? "file"
                    : "files"
            }`;
    }

    if (summaryCount) {
        summaryCount.textContent =
            count;
    }

    if (summaryTitle) {

        if (count === 0) {

            summaryTitle.textContent =
                "Ready to create";

        } else {

            summaryTitle.textContent =
                "Pack ready";

        }
    }

    if (summaryText) {

        if (count === 0) {

            summaryText.textContent =
                "Add employee details and documents.";

        } else {

            summaryText.textContent =
                `${count} document${
                    count === 1
                        ? ""
                        : "s"
                } selected for this employee.`;
        }
    }
}

function updateCreateButton() {
    if (!createButton) {
        return;
    }

    if (selectedFiles.length === 0) {
        createButton.disabled =
            true;

        return;
    }

    const invalidCustomType =
        selectedFiles.some(
            item =>
                item.documentType ===
                    "Other" &&
                !item.customType
        );

    createButton.disabled =
        invalidCustomType;
}

function addFiles(fileList) {
    if (!fileList) {
        return;
    }

    const files =
        Array.from(fileList);

    const MAX_TOTAL_SIZE =
        200 * 1024 * 1024;

    let currentTotal =
        selectedFiles.reduce(
            (total, item) =>
                total + item.file.size,
            0
        );

    files.forEach(file => {

        if (!isAllowedFile(file)) {

            showStatus(
                `Unsupported file type: ${file.name}`,
                "error"
            );

            return;
        }

        if (
            currentTotal +
            file.size >
            MAX_TOTAL_SIZE
        ) {

            showStatus(
                "Total file size cannot exceed 200 MB.",
                "error"
            );

            return;
        }

        const duplicate =
            selectedFiles.some(
                item =>
                    item.file.name ===
                        file.name &&
                    item.file.size ===
                        file.size &&
                    item.file.lastModified ===
                        file.lastModified
            );

        if (duplicate) {

            showStatus(
                `File already added: ${file.name}`,
                "error"
            );

            return;
        }

        selectedFiles.push({
            file: file,
            documentType: "Other",
            customType: ""
        });

        currentTotal +=
            file.size;
    });

    renderDocuments();
}

function renderDocuments() {

    if (!documentList) {
        return;
    }

    documentList.innerHTML = "";

    if (
        selectedFiles.length === 0
    ) {

        if (emptyMessage) {
            emptyMessage.style.display =
                "block";
        }

        updateSummary();
        updateCreateButton();

        return;
    }

    if (emptyMessage) {
        emptyMessage.style.display =
            "none";
    }

    selectedFiles.forEach(
        (item, index) => {

            const card =
                document.createElement(
                    "div"
                );

            card.className =
                "document-card";

            card.draggable =
                true;

            card.dataset.index =
                index;

            const options =
                documentTypes.map(
                    type =>
                        `<option value="${escapeHtml(type)}"${
                            item.documentType === type
                                ? " selected"
                                : ""
                        }>${escapeHtml(type)}</option>`
                ).join("");

            const customType =
                item.customType || "";

            card.innerHTML = `

                <div class="document-order-number">
                    ${index + 1}
                </div>

                <div class="document-drag-handle">
                    ⋮⋮
                </div>

                <div class="document-icon">
                    ${getFileIcon(item.file)}
                </div>

                <div class="document-info">

                    <div class="document-name">
                        ${escapeHtml(item.file.name)}
                    </div>

                    <div class="document-size">
                        ${formatFileSize(item.file.size)}
                    </div>

                </div>

                <div class="document-type-wrapper">

                    <select
                        class="document-type-select"
                        data-index="${index}"
                    >
                        ${options}
                    </select>

                    ${
                        item.documentType === "Other"
                            ? `
                                <input
                                    type="text"
                                    class="custom-document-type"
                                    data-index="${index}"
                                    placeholder="Enter document type"
                                    value="${escapeHtml(customType)}"
                                >
                            `
                            : ""
                    }

                </div>

                <button
                    type="button"
                    class="document-preview-button"
                    data-preview-index="${index}"
                >
                    Preview
                </button>

                <button
                    type="button"
                    class="document-remove-button"
                    data-remove-index="${index}"
                >
                    Remove
                </button>
            `;

            documentList.appendChild(
                card
            );

            card.addEventListener(
                "dragstart",
                function () {
                    draggedDocumentIndex =
                        index;

                    card.classList.add(
                        "dragging"
                    );
                }
            );

            card.addEventListener(
                "dragend",
                function () {
                    draggedDocumentIndex =
                        null;

                    card.classList.remove(
                        "dragging"
                    );

                    document
                        .querySelectorAll(
                            ".drag-over-document"
                        )
                        .forEach(
                            element =>
                                element.classList.remove(
                                    "drag-over-document"
                                )
                        );
                }
            );

            card.addEventListener(
                "dragover",
                function (event) {

                    event.preventDefault();

                    if (
                        draggedDocumentIndex ===
                            null ||
                        draggedDocumentIndex ===
                            index
                    ) {
                        return;
                    }

                    card.classList.add(
                        "drag-over-document"
                    );
                }
            );

            card.addEventListener(
                "dragleave",
                function () {
                    card.classList.remove(
                        "drag-over-document"
                    );
                }
            );

            card.addEventListener(
                "drop",
                function (event) {

                    event.preventDefault();

                    card.classList.remove(
                        "drag-over-document"
                    );

                    if (
                        draggedDocumentIndex ===
                            null ||
                        draggedDocumentIndex ===
                            index
                    ) {
                        return;
                    }

                    const moved =
                        selectedFiles.splice(
                            draggedDocumentIndex,
                            1
                        )[0];

                    selectedFiles.splice(
                        index,
                        0,
                        moved
                    );

                    draggedDocumentIndex =
                        null;

                    renderDocuments();
                }
            );
        }
    );

    document
        .querySelectorAll(
            ".document-type-select"
        )
        .forEach(select => {

            select.addEventListener(
                "change",
                function () {

                    const index =
                        Number(
                            this.dataset.index
                        );

                    selectedFiles[
                        index
                    ].documentType =
                        this.value;

                    if (
                        this.value !==
                        "Other"
                    ) {
                        selectedFiles[
                            index
                        ].customType = "";
                    }

                    renderDocuments();
                }
            );
        });

    document
        .querySelectorAll(
            ".custom-document-type"
        )
        .forEach(input => {

            input.addEventListener(
                "input",
                function () {

                    const index =
                        Number(
                            this.dataset.index
                        );

                    selectedFiles[
                        index
                    ].customType =
                        cleanCustomDocumentType(
                            this.value
                        );

                    updateCreateButton();
                }
            );
        });

    document
        .querySelectorAll(
            ".document-preview-button"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                function () {

                    openPreview(
                        Number(
                            this.dataset
                                .previewIndex
                        )
                    );
                }
            );
        });

    document
        .querySelectorAll(
            ".document-remove-button"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                function () {

                    const index =
                        Number(
                            this.dataset
                                .removeIndex
                        );

                    selectedFiles.splice(
                        index,
                        1
                    );

                    renderDocuments();
                }
            );
        });

    updateSummary();
    updateCreateButton();
}

if (documentInput) {

    documentInput.addEventListener(
        "change",
        function (event) {

            addFiles(
                event.target.files
            );

            event.target.value =
                "";
        }
    );
}

if (dropZone) {

    dropZone.addEventListener(
        "dragover",
        function (event) {

            event.preventDefault();

            dropZone.classList.add(
                "drag-over"
            );
        }
    );

    dropZone.addEventListener(
        "dragleave",
        function () {

            dropZone.classList.remove(
                "drag-over"
            );
        }
    );

    dropZone.addEventListener(
        "drop",
        function (event) {

            event.preventDefault();

            dropZone.classList.remove(
                "drag-over"
            );

            addFiles(
                event.dataTransfer.files
            );
        }
    );
}

const browseButton =
    document.getElementById(
        "browseButton"
    );

if (browseButton) {

    browseButton.addEventListener(
        "click",
        function () {

            if (documentInput) {
                documentInput.click();
            }
        }
    );
}// ============================================================
// CREATE DOCUMENT PACK
// ============================================================

async function createDocumentPack() {

    const employeeIdInput =
        document.getElementById(
            "employeeId"
        );

    const employeeNameInput =
        document.getElementById(
            "employeeName"
        );

    const employeeId =
        employeeIdInput
            ? employeeIdInput.value.trim()
            : "";

    const employeeName =
        employeeNameInput
            ? employeeNameInput.value.trim()
            : "";


    // --------------------------------------------------------
    // EMPLOYEE ID VALIDATION
    // --------------------------------------------------------

    if (!employeeId) {

        showStatus(
            "Please enter Employee ID.",
            "error"
        );

        if (employeeIdInput) {
            employeeIdInput.focus();
        }

        return;
    }


    // --------------------------------------------------------
    // EMPLOYEE NAME VALIDATION
    // --------------------------------------------------------

    if (!employeeName) {

        showStatus(
            "Please enter Employee Name.",
            "error"
        );

        if (employeeNameInput) {
            employeeNameInput.focus();
        }

        return;
    }


    // --------------------------------------------------------
    // DOCUMENT VALIDATION
    // --------------------------------------------------------

    if (
        selectedFiles.length === 0
    ) {

        showStatus(
            "Please add at least one document.",
            "error"
        );

        return;
    }


    // --------------------------------------------------------
    // CUSTOM TYPE VALIDATION
    // --------------------------------------------------------

    const invalidCustomDocument =
        selectedFiles.find(
            item => {

                return (
                    item.documentType ===
                        "Other" &&
                    !item.customType
                );

            }
        );


    if (invalidCustomDocument) {

        showStatus(
            "Please enter a document type for every file marked as Other.",
            "error"
        );

        return;
    }


    // --------------------------------------------------------
    // DISABLE BUTTON
    // --------------------------------------------------------

    if (createButton) {

        createButton.disabled =
            true;

        createButton.textContent =
            "Creating Pack...";

    }


    showStatus(
        "Creating employee document pack...",
        "info"
    );


    // --------------------------------------------------------
    // FORM DATA
    // --------------------------------------------------------

    const formData =
        new FormData();


    formData.append(
        "employee_id",
        employeeId
    );


    formData.append(
        "employee_name",
        employeeName
    );


    // --------------------------------------------------------
    // DOCUMENT TYPES
    // --------------------------------------------------------

    const types =
        selectedFiles.map(
            item => {

                if (
                    item.documentType ===
                        "Other" &&
                    item.customType
                ) {

                    return cleanCustomDocumentType(
                        item.customType
                    );

                }

                return item.documentType;

            }
        );


    formData.append(
        "document_types",
        JSON.stringify(types)
    );


    // --------------------------------------------------------
    // FILES
    // --------------------------------------------------------

    selectedFiles.forEach(
        item => {

            formData.append(
                "files",
                item.file,
                item.file.name
            );

        }
    );


    // --------------------------------------------------------
    // SEND TO FASTAPI
    // --------------------------------------------------------

    try {

        const response =
            await fetch(
                `${API_URL}/api/create-pack`,
                {
                    method: "POST",
                    body: formData
                }
            );


        // ----------------------------------------------------
        // ERROR RESPONSE
        // ----------------------------------------------------

        if (!response.ok) {

            let errorMessage =
                "Unable to create document pack.";

            try {

                const errorData =
                    await response.json();

                if (
                    errorData.detail
                ) {

                    errorMessage =
                        errorData.detail;

                }

            } catch (error) {

                // Ignore JSON parsing error

            }

            throw new Error(
                errorMessage
            );
        }


        // ----------------------------------------------------
        // ZIP FILE
        // ----------------------------------------------------

        const blob =
            await response.blob();


        // ----------------------------------------------------
        // DOWNLOAD URL
        // ----------------------------------------------------

        const downloadUrl =
            window.URL.createObjectURL(
                blob
            );


        const downloadLink =
            document.createElement(
                "a"
            );


        downloadLink.href =
            downloadUrl;


        // ----------------------------------------------------
        // SAFE EMPLOYEE NAME
        // ----------------------------------------------------

        const safeEmployeeName =
            employeeName
                .replace(
                    /\s+/g,
                    "_"
                )
                .replace(
                    /[^a-zA-Z0-9_-]/g,
                    ""
                );


        // ----------------------------------------------------
        // ZIP FILE NAME
        // ----------------------------------------------------

        const packName =
            `${employeeId}_${safeEmployeeName}.zip`;


        downloadLink.download =
            packName;


        document.body.appendChild(
            downloadLink
        );


        downloadLink.click();


        downloadLink.remove();


        window.URL.revokeObjectURL(
            downloadUrl
        );


        // ----------------------------------------------------
        // SUCCESS MESSAGE
        // ----------------------------------------------------

        showStatus(
            "✅ Document pack created successfully!",
            "success"
        );


        // ----------------------------------------------------
        // V6 SUCCESS SCREEN
        // ----------------------------------------------------

        showSuccessScreen({

            employeeId:
                employeeId,

            employeeName:
                employeeName,

            documentCount:
                selectedFiles.length,

            packName:
                packName

        });


    } catch (error) {

        console.error(
            "Create pack error:",
            error
        );


        showStatus(
            `❌ ${error.message}`,
            "error"
        );


    } finally {

        // ----------------------------------------------------
        // RESTORE BUTTON
        // ----------------------------------------------------

        if (createButton) {

            createButton.textContent =
                "📦 Create Document Pack";

            updateCreateButton();

        }

    }

}


// ============================================================
// CREATE BUTTON CLICK
// ============================================================

if (createButton) {

    createButton.addEventListener(
        "click",
        createDocumentPack
    );

}


// ============================================================
// INITIAL STATE
// ============================================================

renderDocuments();


// ============================================================
// V6 SUCCESS SCREEN
// ============================================================

let successScreenData = null;


// ============================================================
// CREATE SUCCESS SCREEN
// ============================================================

function createSuccessScreen() {

    if (
        document.getElementById(
            "packSuccessScreen"
        )
    ) {
        return;
    }


    const successScreen =
        document.createElement(
            "div"
        );


    successScreen.id =
        "packSuccessScreen";


    successScreen.className =
        "pack-success-screen";


    successScreen.innerHTML = `

        <div class="pack-success-overlay">

            <div class="pack-success-dialog">


                <button
                    type="button"
                    class="success-close-button"
                    id="successCloseButton"
                    aria-label="Close"
                >
                    ×
                </button>


                <div class="success-check-wrapper">

                    <div class="success-check-circle">

                        <span class="success-check">
                            ✓
                        </span>

                    </div>

                </div>


                <div class="success-badge">

                    ✓ PACK CREATED

                </div>


                <h2>
                    Document pack is ready
                </h2>


                <p class="success-description">

                    Your employee documents have been
                    successfully organized and packed.

                </p>


                <div class="success-file-box">

                    <div class="success-file-icon">
                        📦
                    </div>

                    <div class="success-file-info">

                        <span class="success-file-label">
                            GENERATED FILE
                        </span>

                        <strong id="successPackName">
                            document_pack.zip
                        </strong>

                    </div>

                </div>


                <div class="success-details-grid">


                    <div class="success-detail">

                        <span>
                            EMPLOYEE
                        </span>

                        <strong id="successEmployeeName">
                            -
                        </strong>

                    </div>


                    <div class="success-detail">

                        <span>
                            EMPLOYEE ID
                        </span>

                        <strong id="successEmployeeId">
                            -
                        </strong>

                    </div>


                    <div class="success-detail">

                        <span>
                            DOCUMENTS
                        </span>

                        <strong id="successDocumentCount">
                            0
                        </strong>

                    </div>


                    <div class="success-detail">

                        <span>
                            STATUS
                        </span>

                        <strong class="success-status-text">
                            Downloaded
                        </strong>

                    </div>


                </div>


                <div class="success-privacy-box">

                    <span class="privacy-icon">
                        🔒
                    </span>

                    <div>

                        <strong>
                            Your files stay private
                        </strong>

                        <p>
                            Documents are processed for creating
                            your pack and are not displayed publicly.
                        </p>

                    </div>

                </div>


                <div class="success-actions">

                    <button
                        type="button"
                        id="createAnotherPackButton"
                        class="success-primary-button"
                    >
                        📦 Create Another Pack
                    </button>


                    <button
                        type="button"
                        id="backToToolboxButton"
                        class="success-secondary-button"
                    >
                        ← Back to Office Toolbox
                    </button>

                </div>


                <div class="success-download-note">

                    ✓ Download started automatically

                </div>


            </div>

        </div>

    `;


    document.body.appendChild(
        successScreen
    );


    // --------------------------------------------------------
    // CLOSE
    // --------------------------------------------------------

    const closeButton =
        document.getElementById(
            "successCloseButton"
        );


    if (closeButton) {

        closeButton.addEventListener(
            "click",
            closeSuccessScreen
        );

    }


    // --------------------------------------------------------
    // CREATE ANOTHER PACK
    // --------------------------------------------------------

    const createAnotherButton =
        document.getElementById(
            "createAnotherPackButton"
        );


    if (createAnotherButton) {

        createAnotherButton.addEventListener(
            "click",
            resetForNewPack
        );

    }


    // --------------------------------------------------------
    // BACK TO TOOLBOX
    // --------------------------------------------------------

    const backButton =
        document.getElementById(
            "backToToolboxButton"
        );


    if (backButton) {

        backButton.addEventListener(
            "click",
            function () {

                window.location.href =
                    "index.html";

            }
        );

    }


    // --------------------------------------------------------
    // CLICK OUTSIDE
    // --------------------------------------------------------

    successScreen.addEventListener(
        "click",
        function (event) {

            if (
                event.target ===
                successScreen
            ) {

                closeSuccessScreen();

            }

        }
    );

}


// ============================================================
// SHOW SUCCESS SCREEN
// ============================================================

function showSuccessScreen(data) {

    successScreenData =
        data;


    createSuccessScreen();


    const successScreen =
        document.getElementById(
            "packSuccessScreen"
        );


    if (!successScreen) {
        return;
    }


    const packNameElement =
        document.getElementById(
            "successPackName"
        );


    const employeeNameElement =
        document.getElementById(
            "successEmployeeName"
        );


    const employeeIdElement =
        document.getElementById(
            "successEmployeeId"
        );


    const documentCountElement =
        document.getElementById(
            "successDocumentCount"
        );


    if (packNameElement) {

        packNameElement.textContent =
            data.packName;

    }


    if (employeeNameElement) {

        employeeNameElement.textContent =
            data.employeeName;

    }


    if (employeeIdElement) {

        employeeIdElement.textContent =
            data.employeeId;

    }


    if (documentCountElement) {

        documentCountElement.textContent =
            `${data.documentCount} ${
                data.documentCount === 1
                    ? "document"
                    : "documents"
            }`;

    }


    successScreen.classList.add(
        "show"
    );


    document.body.classList.add(
        "success-screen-open"
    );

}


// ============================================================
// CLOSE SUCCESS SCREEN
// ============================================================

function closeSuccessScreen() {

    const successScreen =
        document.getElementById(
            "packSuccessScreen"
        );


    if (successScreen) {

        successScreen.classList.remove(
            "show"
        );

    }


    document.body.classList.remove(
        "success-screen-open"
    );

}


// ============================================================
// CREATE ANOTHER PACK
// ============================================================

function resetForNewPack() {

    closeSuccessScreen();


    const employeeIdInput =
        document.getElementById(
            "employeeId"
        );


    const employeeNameInput =
        document.getElementById(
            "employeeName"
        );


    if (employeeIdInput) {
        employeeIdInput.value = "";
    }


    if (employeeNameInput) {
        employeeNameInput.value = "";
    }


    selectedFiles = [];


    if (documentInput) {
        documentInput.value = "";
    }


    closePreview();


    if (statusMessage) {

        statusMessage.textContent =
            "";

        statusMessage.className =
            "status";

    }


    renderDocuments();


    updateSummary();


    updateCreateButton();


    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });


    setTimeout(
        function () {

            if (employeeIdInput) {

                employeeIdInput.focus();

            }

        },
        400
    );

}


// ============================================================
// SUCCESS SCREEN ESC KEY
// ============================================================

document.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key !==
            "Escape"
        ) {
            return;
        }


        const successScreen =
            document.getElementById(
                "packSuccessScreen"
            );


        if (
            successScreen &&
            successScreen.classList.contains(
                "show"
            )
        ) {

            closeSuccessScreen();

        }

    }
);// ============================================================
// FINAL INITIALIZATION
// ============================================================

updateSummary();

updateCreateButton();


// ============================================================
// V6 SUCCESS SCREEN READY
// ============================================================

console.log(
    "Office Toolbox Employee Document Packer V6 loaded successfully."
);// ============================================================
// FINAL PREVIEW BUTTON FIX
// ============================================================

document.addEventListener("click", function (event) {

    const previewButton =
        event.target.closest(".preview-document-button");

    if (!previewButton) {
        return;
    }

    event.preventDefault();
    event.stopPropagation();

    const card =
        previewButton.closest(".document-card");

    if (!card) {
        console.error("Preview: document card not found");
        return;
    }

    const index =
        Number(card.dataset.index);

    if (
        Number.isNaN(index) ||
        !selectedFiles[index]
    ) {
        console.error(
            "Preview: invalid document index",
            index
        );
        return;
    }

    console.log(
        "Preview opening:",
        selectedFiles[index].file.name
    );

    openPreview(index);

});