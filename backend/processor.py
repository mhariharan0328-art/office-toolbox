from pathlib import Path
import shutil
import zipfile
import tempfile


def create_document_pack(
    employee_id: str,
    employee_name: str,
    documents: list
):
    """
    Creates an employee document pack and returns
    the ZIP file path.
    """

    safe_name = (
        employee_name
        .strip()
        .replace(" ", "_")
    )

    pack_name = f"{employee_id}_{safe_name}"

    temp_dir = Path(
        tempfile.mkdtemp(
            prefix="office_toolbox_"
        )
    )

    employee_folder = temp_dir / pack_name
    employee_folder.mkdir(
        parents=True,
        exist_ok=True
    )

    try:

        # Create renamed documents
        for index, document in enumerate(
            documents,
            start=1
        ):

            original_name = document["filename"]
            content = document["content"]
            document_type = document["document_type"]

            extension = Path(
                original_name
            ).suffix.lower()

            filename = (
                f"{index:02d}_"
                f"{document_type}"
                f"{extension}"
            )

            file_path = (
                employee_folder /
                filename
            )

            file_path.write_bytes(content)

        # Create ZIP
        zip_path = temp_dir / f"{pack_name}.zip"

        with zipfile.ZipFile(
            zip_path,
            "w",
            zipfile.ZIP_DEFLATED
        ) as zip_file:

            for file in employee_folder.iterdir():

                zip_file.write(
                    file,
                    arcname=(
                        f"{pack_name}/"
                        f"{file.name}"
                    )
                )

        return zip_path

    except Exception:

        shutil.rmtree(
            temp_dir,
            ignore_errors=True
        )

        raise