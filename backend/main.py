
from fastapi import (
    FastAPI,
    UploadFile,
    File,
    Form,
    HTTPException
)

from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask

from typing import Annotated, List
from pathlib import Path
from pypdf import PdfWriter, PdfReader
from backend.processor import create_document_pack

import json
import shutil
import tempfile


app = FastAPI(
    title="Office Toolbox API",
    version="1.0.0"
)


# ==============================
# SWAGGER FILE UPLOAD COMPATIBILITY
# ==============================

# Use OpenAPI 3.0 binary-file schema for Swagger's file picker.
app.openapi_version = "3.0.3"

_original_openapi = app.openapi


def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    schema = _original_openapi()

    def fix_file_schema(obj):
        if isinstance(obj, dict):
            if (
                obj.get("type") == "string"
                and obj.get("contentMediaType")
                == "application/octet-stream"
            ):
                obj.pop("contentMediaType", None)
                obj["format"] = "binary"

            for value in obj.values():
                fix_file_schema(value)

        elif isinstance(obj, list):
            for item in obj:
                fix_file_schema(item)

    fix_file_schema(schema)

    app.openapi_schema = schema
    return schema


app.openapi = custom_openapi


# ==============================
# CORS
# ==============================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==============================
# HOME
# ==============================

@app.get("/")
def home():
    return {
        "status": "success",
        "message": "Office Toolbox API is running"
    }


# ==============================
# HEALTH CHECK
# ==============================

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy"
    }


# ==============================
# CREATE DOCUMENT PACK
# ==============================

@app.post("/api/create-pack")
async def create_pack(
    employee_id: str = Form(...),
    employee_name: str = Form(...),
    document_types: str = Form(...),
    files: List[UploadFile] = File(...)
):
    try:
        types = json.loads(document_types)

        if not isinstance(types, list):
            raise HTTPException(
                status_code=400,
                detail="Document types must be a list."
            )

        if len(types) != len(files):
            raise HTTPException(
                status_code=400,
                detail=(
                    "Number of document types must "
                    "match number of files."
                )
            )

        documents = []

        for index, uploaded_file in enumerate(files):
            content = await uploaded_file.read()

            documents.append({
                "filename": uploaded_file.filename,
                "content": content,
                "document_type": types[index]
            })

        zip_path = create_document_pack(
            employee_id,
            employee_name,
            documents
        )

        response = FileResponse(
            path=zip_path,
            media_type="application/zip",
            filename=zip_path.name
        )

        original_background = response.background

        async def cleanup():
            if original_background:
                await original_background()

            shutil.rmtree(
                zip_path.parent,
                ignore_errors=True
            )

        response.background = BackgroundTask(cleanup)

        return response

    except HTTPException:
        raise

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Unable to create the document pack."
        )

    finally:
        for uploaded_file in files:
            await uploaded_file.close()


# ==============================
# MERGE PDF
# ==============================

@app.post("/api/merge-pdf")
async def merge_pdf(
    files: Annotated[
        List[UploadFile],
        File(description="Select two or more PDF files")
    ]
):
    if len(files) < 2:
        for uploaded_file in files:
            await uploaded_file.close()

        raise HTTPException(
            status_code=400,
            detail="Please upload at least two PDF files."
        )

    if len(files) > 20:
        for uploaded_file in files:
            await uploaded_file.close()

        raise HTTPException(
            status_code=400,
            detail="You can merge a maximum of 20 PDF files at once."
        )

    temp_dir = tempfile.mkdtemp(
        prefix="office_toolbox_merge_"
    )

    writer = PdfWriter()
    cleanup_after_response = False
    total_size = 0
    max_total_size = 100 * 1024 * 1024  # 100 MB

    try:
        for index, uploaded_file in enumerate(files):
            filename = uploaded_file.filename or ""

            if Path(filename).suffix.lower() != ".pdf":
                raise HTTPException(
                    status_code=400,
                    detail=f"File {index + 1} must be a PDF."
                )

            input_path = (
                Path(temp_dir) / f"input_{index + 1}.pdf"
            )

            file_size = 0

            with open(input_path, "wb") as output_file:
                while True:
                    chunk = await uploaded_file.read(
                        1024 * 1024
                    )

                    if not chunk:
                        break

                    file_size += len(chunk)
                    total_size += len(chunk)

                    if total_size > max_total_size:
                        raise HTTPException(
                            status_code=413,
                            detail="The combined upload limit is 100 MB."
                        )

                    output_file.write(chunk)

            if file_size == 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"File {index + 1} is empty."
                )

            reader = PdfReader(
                str(input_path),
                strict=False
            )

            if reader.is_encrypted:
                raise HTTPException(
                    status_code=400,
                    detail=f"File {index + 1} is password-protected."
                )

            if len(reader.pages) == 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"File {index + 1} contains no pages."
                )

            writer.append(str(input_path))

        merged_path = Path(temp_dir) / "merged.pdf"

        with open(merged_path, "wb") as output_file:
            writer.write(output_file)

        writer.close()

        response = FileResponse(
            path=str(merged_path),
            media_type="application/pdf",
            filename="merged.pdf"
        )

        # Remove temporary files after the download response finishes.
        response.background = BackgroundTask(
            shutil.rmtree,
            temp_dir,
            ignore_errors=True
        )

        cleanup_after_response = True

        return response

    except HTTPException:
        raise

    except Exception:
        raise HTTPException(
            status_code=400,
            detail=(
                "Unable to merge these PDFs. Check that they "
                "are valid and not password-protected."
            )
        )

    finally:
        try:
            writer.close()
        except Exception:
            pass

        for uploaded_file in files:
            await uploaded_file.close()

        if not cleanup_after_response:
            shutil.rmtree(
                temp_dir,
                ignore_errors=True
            )
