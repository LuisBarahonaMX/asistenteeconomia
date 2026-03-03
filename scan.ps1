Write-Host '--- ESCANEO DE ESTADO ---' -ForegroundColor Cyan
$port5001 = Get-NetTCPConnection | Where-Object { $_.LocalPort -eq 5001 }
if ($port5001) { Write-Host 'OK: Puerto 5001 activo' -ForegroundColor Green } 
else { Write-Host 'ERROR: El servidor 5001 está apagado' -ForegroundColor Red }
dir ./functions | Select-Object Name
try {
    $r = Invoke-RestMethod -Uri 'http://127.0.0.1:5001/asistente-economia/us-central1/api/faq' -Method Get -ErrorAction Stop
    Write-Host '¡ÉXITO! El servidor responde' -ForegroundColor Green
} catch { Write-Host 'La API no responde' -ForegroundColor Red }
