# Employee Document Packer

A lightweight Office Toolbox app for creating employee document packs.

## Features

- Upload employee documents
- Assign document categories
- Bundle them into a ZIP pack
- Download the generated archive automatically

## Run the backend

```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python "EMPLOYEE DOCUMENT PACKER.py"
```

The app listens on:

- http://127.0.0.1:8000/
- http://127.0.0.1:8000/api/health

## Frontend

Open the HTML file in the browser from the `frontend` folder, or serve the folder with a simple HTTP server.

```bash
python -m http.server 8080
```

Then open:

- http://127.0.0.1:8080/frontend/index.html

## Notes

The backend is also available through the project entry point in `backend/main.py` and supports the document pack upload route used by the frontend.
