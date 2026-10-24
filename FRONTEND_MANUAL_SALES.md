# Venta manual de productos: frontend

Acceso: Admin → Pedidos → Registrar venta manual.
Ruta protegida: `/admin/orders/nueva-venta-manual`.

Se implementaron cliente, búsqueda de productos activos, variantes reales con modelo/color/talle, carrito, validación contra availableStock, pago recibido obligatorio, confirmación, carga, éxito y errores. Pedidos y Pagos muestran el origen manual explícito usando paymentSource, sin inferirlo por ausencia de un ID de Mercado Pago.

## Contrato pendiente de integración con backend

El cliente llama `POST /api/v1/admin/orders/manual`, bajo la misma base y autenticación del admin. El endpoint es el propuesto por la especificación: su existencia y respuesta en el servidor no se verificaron con una venta real.

Solicitud:

```json
{
  "customer": { "name": "María", "phone": null, "email": null },
  "paymentMethod": "TRANSFER",
  "items": [{ "variantId": "uuid", "quantity": 2 }],
  "note": "Venta presencial"
}
```

Métodos: CASH, TRANSFER, OTHER. La nota es opcional. No se envían importes, stock ni nombres de productos.

Respuesta esperada: `AdminOrderDetail`, el contrato existente de GET de detalle, con `order.id` y `order.totalInCents`. El éxito muestra el total devuelto por el servidor. Los listados deben devolver `paymentSource: MANUAL`, `manualPaymentMethod`, cliente y productos mediante el contrato existente de orders.

Errores reconocidos: INSUFFICIENT_STOCK / STOCK_INSUFFICIENT, VARIANT_NOT_FOUND, VARIANT_INACTIVE, PRODUCT_NOT_FOUND, PRODUCT_INACTIVE. Otros errores muestran un mensaje genérico. Tras un error se recargan catálogo y stock; si falla la recarga se bloquea la confirmación hasta reintentar.

El catálogo y el inventario se leen desde los endpoints existentes, recorriendo todas sus páginas. Se usa availableStock, que ya considera reservas. Los listados de pedidos/pagos y la pantalla de stock consultan sus endpoints al abrirse; no se mantienen órdenes ni descuentos de stock locales.

El backend debe recalcular precios, validar stock/actividad concurrentemente, crear el pedido pagado, registrar el pago manual, mantener entrega pendiente y guardar auditoría en su transacción. Este cambio no implementa esas operaciones ni modifica checkout, webhooks o Mercado Pago. No requiere migraciones frontend.

## Validación

Pruebas del admin para selección de variantes, stock cero, cantidades, total visual, cliente/email, confirmación de pago, payload, doble clic, carga, éxito, errores y recuperación, paginación de inventario, acceso y visualización en Pedidos/Pagos.

Flujo de navegador probado con API simulada a 320, 390 y 1280 px, sin desbordamiento horizontal ni errores de ejecución. No se registraron ventas reales durante la verificación.
