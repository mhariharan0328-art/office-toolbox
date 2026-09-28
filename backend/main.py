from fastapi import (
    FastAPI,
    UploadFile,
    File,
    Form,
    HTTPException
)

from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from typing import List
import json
import os
import shutil

from backend.processor import create_document_pack


app = FastAPI(
    title="Office Toolbox API",
    version="1.0.0"
)


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

        # Convert document type JSON
        types = json.loads(document_types)

        if len(types) != len(files):

            raise HTTPException(
                status_code=400,
                detail="Number of document types must match number of files."
            )


        documents = []

        for index, uploaded_file in enumerate(files):

            content = await uploaded_file.read()

            documents.append(
                {
                    "filename": uploaded_file.filename,
                    "content": content,
                    "document_type": types[index]
                }
            )


        # Create ZIP
        zip_path = create_document_pack(
            employee_id,
            employee_name,
            documents
        )


        # Return ZIP to browser
        response = FileResponse(
            path=zip_path,
            media_type="application/zip",
            filename=zip_path.name
        )


        # Delete temporary folder after response
        original_background = response.background


        async def cleanup():

            if original_background:

                await original_background()


            try:

                shutil.rmtree(
                    zip_path.parent,
                    ignore_errors=True
                )

            except Exception:

                pass


        from starlette.background import BackgroundTask

        response.background = BackgroundTask(
            cleanup
        )


        return response


    except HTTPException:

        raise


    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )