# Gatarsis

## Administración

El panel lazy vive bajo `https://gatarsis.com.ar/admin`. No se enlaza desde la navegación pública. Usa la API `https://gatarsis-back.onrender.com/api/v1/admin` y requiere que el backend de Fase 3 esté desplegado.

Los tokens de acceso y refresh viven exclusivamente en memoria durante la pestaña: recargar o cerrar sesión vuelve al login. El panel no guarda credenciales ni tokens en `localStorage`, `sessionStorage`, cookies o URLs.

Incluye dashboard, catálogo y variantes, inventario seguro (restock/ajuste), pedidos, pagos/review/refund y auditoría. El ajuste nunca habilita un stock en mano menor que el reservado y el diálogo de refund exige motivo y la confirmación literal `REEMBOLSAR`; el backend sigue siendo la autoridad de seguridad e idempotencia.

Aplicación estática Angular 22 + Tailwind CSS para publicar casos de rescate animal y facilitar colaboración por transferencia bancaria.

## Development server

Para iniciar el servidor local:

```bash
npm start
```

Abrí `http://localhost:4200/`.

## Cómo publicar un nuevo caso

1. Creá `src/app/data/cases/<slug-del-caso>.case.ts`.
2. Agregá las fotos reales AVIF en `public/images/cases/<slug-del-caso>/`.
3. Completá en ese archivo un objeto `RescueCase` con `slug`, `name`, `status`, `summary`, `coverImage`, `gallery`, `story`, `currentNeeds`, `updates` y `updatedAt`.
4. Usá un `status` válido: `needs-help`, `treatment`, `recovering`, `closed` o `memorial`.
5. Separá la historia en párrafos dentro de `story` y agregá `currentNeeds` o `updates` sólo si tenés información real.
6. Importá la constante nueva en `src/app/data/rescue-cases.data.ts`.
7. Agregala a `RESCUE_CASES`.
8. Ejecutá tests, build y deploy.

No hay backend, CMS ni base de datos: publicar un nuevo caso requiere un nuevo build/deploy.

## Cómo actualizar la deuda

Modificá únicamente `src/app/core/config/donation.config.ts`:

- `currentDebt`
- `debtUpdatedAt`

El alias bancario y titular también viven en ese archivo para evitar valores duplicados.

## Cómo agregar un producto

1. Creá `src/app/data/merch/products/<slug>.product.ts`.
2. Agregá las fotos reales en `public/images/products/`.
3. Completá nombre, descripción, variantes y dimensiones reales de cada imagen.
4. Importá el producto en `src/app/data/merch/merch-products.data.ts`.
5. Ejecutá tests, build y deploy.

## Cómo abrir o cerrar una preventa

Modificá `src/app/core/config/merch-preorder.config.ts`. Ahí se centralizan el estado, fechas, contacto y nota de entrega. No agregues un enlace de reserva hasta tener un canal de contacto real.

## Build

```bash
npm run build
```

## Tests

```bash
npm test
```

## Deploy estático

El build de Angular genera archivos estáticos en `dist/`. El proyecto incluye `public/_redirects` para que Netlify resuelva deep links del Router como SPA.

Para GitHub Pages con el dominio personalizado `gatarsis.com.ar`, generá y publicá el build:

```bash
npm run prod
npm run deploy
```

`npm run prod` usa el `base href` raíz (`/`) y `public/CNAME` mantiene asociado el dominio personalizado durante cada despliegue.

### Retornos de Mercado Pago

La preferencia de pago se crea en el backend. Su configuración de `back_urls` debe usar:

- `success`: `https://gatarsis.com.ar/checkout/success`
- `pending`: `https://gatarsis.com.ar/checkout/pending`
- `failure`: `https://gatarsis.com.ar/checkout/failure`

Si el backend construye estas URLs desde una variable de entorno como `FRONTEND_URL`, `APP_URL` o `PUBLIC_WEB_URL`, su valor debe ser `https://gatarsis.com.ar` y el servicio debe volver a desplegarse.

## Restricciones de contenido

No inventar animales, historias, diagnósticos, fechas, montos, porcentajes ni datos veterinarios. Si falta información, usá placeholders explícitos o no renderices la sección.

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
