FROM python:3.13-slim

WORKDIR /app

RUN pip install --no-cache-dir fastapi uvicorn sqlalchemy aiosqlite pydantic requests urllib3 pyyaml

COPY . /app

# Install post-it from local package
RUN pip install --no-cache-dir /packages/post-it 2>/dev/null || true

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
