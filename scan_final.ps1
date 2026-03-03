Write-Host "--- DIAGNÓSTICO DE EMERGENCIA ---" -ForegroundColor Cyan
Write-Host "1. Probando conexión local al puerto 5001..." -ForegroundColor Yellow
try {
    $url = "http://127.0.0.1:5001/asistente-economia/us-central1/api/chat"
    $body = @{ question = "hola" } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri $url -Method Post -Body $body -ContentType "application/json" -ErrorAction Stop
    Write-Host "¡ÉXITO! El backend respondió: $(.answer)" -ForegroundColor Green
} catch {
    Write-Host "FALLO: El backend no responde. Error: $(.Exception.Message)" -ForegroundColor Red
}

Write-Host "
2. Verificando archivos en functions..." -ForegroundColor Yellow
dir ./functions | Select-Object Name
