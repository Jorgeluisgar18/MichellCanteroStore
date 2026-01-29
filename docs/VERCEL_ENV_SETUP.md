# Configuración de Variables de Entorno en Vercel

## Wompi Production Keys

Ejecuta estos comandos uno por uno:

```bash
# 1. Public Key (visible en el cliente)
vercel env add NEXT_PUBLIC_WOMPI_PUBLIC_KEY production
# Valor: pub_prod_NirDvZP9LnojM1jXIg240pTBpeCa7hPF
# Cuando pregunte "How to proceed?": Selecciona "Leave as is"

# 2. Private Key (solo servidor)
vercel env add WOMPI_PRIVATE_KEY production
# Valor: prv_prod_baKX1IyXwd7RQQfPFTk2nQ7X4vFw0w5G

# 3. Events Secret (webhooks)
vercel env add WOMPI_EVENTS_SECRET production
# Valor: prod_events_J399xlBHnN23oZ5koXoQy4IeMoFfGwHy

# 4. Integrity Secret (firma de parámetros)
vercel env add WOMPI_INTEGRITY_SECRET production
# Valor: prod_integrity_DHbiRtaWaewpAacn2itZIzCq7HCOuQlg

# 5. Cron Secret (protección de cron jobs)
vercel env add CRON_SECRET production
# Valor: Genera un UUID con PowerShell:
# [guid]::NewGuid().ToString()
```

## Verificar Variables

```bash
vercel env ls
```

Debes ver todas las variables listadas para el ambiente "production".

## Notas

- Las variables con prefijo `NEXT_PUBLIC_` son visibles en el cliente
- Las demás son solo accesibles en el servidor
- Después de agregar las variables, el próximo deployment las usará automáticamente
