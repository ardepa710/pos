FROM python:3.12-slim AS builder
WORKDIR /app
RUN pip install --upgrade pip
COPY pyproject.toml .
RUN pip install --no-cache-dir --user ".[dev]" 2>/dev/null || pip install --no-cache-dir --user .
COPY . .

FROM python:3.12-slim AS runner
WORKDIR /app
RUN groupadd -r appuser && useradd -r -g appuser appuser
COPY --from=builder /root/.local /home/appuser/.local
COPY --from=builder /app .
RUN chown -R appuser:appuser /app
USER appuser
ENV PATH=/home/appuser/.local/bin:$PATH
EXPOSE 8000
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
