FROM python:3.12-slim AS builder
WORKDIR /app
RUN pip install --upgrade pip --quiet
COPY pyproject.toml .
COPY app ./app
RUN pip install --no-cache-dir --user .

FROM python:3.12-slim AS runner
# BUILD_SHA is injected by docker compose build (git rev-parse --short HEAD)
# and exposed at runtime via the BUILD_SHA env var → /health endpoint.
ARG BUILD_SHA=unknown
ENV BUILD_SHA=${BUILD_SHA}
WORKDIR /app
RUN groupadd -r appuser && useradd -r -g appuser appuser
COPY --from=builder /root/.local /home/appuser/.local
COPY --from=builder /app .
COPY alembic.ini .
COPY alembic ./alembic
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
RUN chown -R appuser:appuser /app /entrypoint.sh
USER appuser
ENV PATH=/home/appuser/.local/bin:$PATH
EXPOSE 8000
ENTRYPOINT ["/entrypoint.sh"]
