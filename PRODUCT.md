# Product

## Register

product

## Users

Pequeños comercios de México — colectivos, boutiques, tiendas de ropa y accesorios — operando una sola caja por instalación. Tres roles:

- **Cajero:** el usuario de mayor frecuencia. De pie frente a un cliente, a veces en pantalla táctil, bajo presión de tiempo. Su trabajo: cobrar rápido (efectivo o tarjeta), buscar productos, abrir y cerrar caja. No es técnico.
- **Supervisor:** maneja devoluciones, compras, consignación y reportes. Confía en los números.
- **Admin:** dueño o encargado. Configura el negocio, productos, usuarios e impresión.

Contexto físico: mostrador de tienda, iluminación variable, equipo modesto (la app corre localmente en una computadora del cliente vía Docker). A veces tablet, a veces monitor de escritorio.

## Product Purpose

Sistema de Punto de Venta dockerizado, autoinstalable, para que un negocio pequeño cobre, controle inventario y entienda sus ventas sin depender de un SaaS mensual ni de un sysadmin. Diferenciadores: doble divisa MXN/USD (tipo de cambio Banxico), inventario opcional por artículo, consignación de proveedores con liquidación por periodo, tarjetas de regalo con QR, devoluciones a crédito. La base de datos y API quedan listas para una futura app móvil.

Éxito = un ticket de efectivo se cierra en menos de 30 segundos, el cajero nunca se traba, y el dueño confía en que el dinero reportado es el dinero real.

## Brand Personality

Cálido y artesanal. Kolekto se siente como un negocio de barrio bien llevado, no como software corporativo: humano, confiable, con raíz local mexicana (es-MX nativo). La calidez vive en la identidad — verde olivo, crema, tinta, tipografía legible — mientras la operación diaria se mantiene seria y eficiente. Tres palabras: **cálido, confiable, eficiente.**

## Anti-references

- **SaaS genérico:** cards azules, gradientes morados, eyebrows en mayúsculas tracked, hero-metrics, look de plantilla. Kolekto no es un dashboard de startup.
- **POS corporativo frío:** Square / Clover / Toast — neutro, gris, sin alma ni acento local.
- **Recargado / colorido:** muchos colores compitiendo, badges por todas partes, ruido visual. El color se gana su lugar (semántico), no decora.
- **Anticuado:** POS viejos estilo Windows XP, tablas densas sin jerarquía, formularios interminables.

## Design Principles

1. **Velocidad sobre adorno.** Cada pantalla del flujo de cobro se mide en segundos. Una acción primaria clara por pantalla; el camino feliz nunca se interrumpe.
2. **El dinero nunca miente.** Totales, saldos y reportes son la promesa central. La UI hace que los números sean inequívocos (tabular-nums, jerarquía, confirmaciones donde importa).
3. **Calidez local, rigor operativo.** La identidad es cálida y mexicana; la mecánica es precisa y predecible. Nunca se sacrifica claridad por estética.
4. **Para manos ocupadas.** Áreas de toque generosas, feedback de presión en controles de alta frecuencia, legible bajo cualquier luz. Pensado para táctil y escritorio por igual.
5. **es-MX nativo.** Toda la UI en español mexicano, sin traducciones literales ni tono de software importado.

## Accessibility & Inclusion

Meta WCAG 2.1 **AA**: contraste de texto ≥4.5:1 (≥3:1 para texto grande), foco visible en todo control interactivo, operable por teclado, y respeto a `prefers-reduced-motion`. Uso intensivo y prolongado por cajeros exige legibilidad sostenida; el color semántico (éxito/advertencia/error) nunca es el único portador de significado — se acompaña de ícono o texto.
