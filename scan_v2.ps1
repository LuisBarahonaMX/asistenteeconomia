Write-Host '--- INICIANDO DIAGNÓSTICO FINAL ---' -ForegroundColor Cyan
Write-Host '1. Verificando Puertos (Buscando 5001 y 5000)...' -ForegroundColor Yellow
Get-NetTCPConnection | Where-Object { $_.LocalPort -in 5001, 5000 } | Select-Object LocalPort, State
Write-Host '2. Verificando Archivos en /functions...' -ForegroundColor Yellow
dir ./functions | Select-Object Name
Write-Host '3. Prueba de Conexión a la API...' -ForegroundColor Yellow
try {
    $test = Invoke-RestMethod -Uri 'http://127.0.0.1:5001/asistente-economia/us-central1/api/faq' -Method Get -ErrorAction Stop
    Write-Host '¡ÉXITO! El backend respondió.' -ForegroundColor Green
} catch {
    Write-Host 'FALLO: No hay conexión con la API en el puerto 5001.' -ForegroundColor Red
}
