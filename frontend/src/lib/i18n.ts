// @module:base
export const t = {
  // Navigation
  nav: {
    sales: "Ventas",
    products: "Productos",
    customers: "Clientes",
    suppliers: "Proveedores",
    purchases: "Compras",
    giftCards: "Tarjetas de regalo",
    returns: "Devoluciones",
    reports: "Reportes",
    settings: "Configuración",
    cashier: "Sesión de caja",
  },

  // Common actions
  action: {
    save: "Guardar",
    cancel: "Cancelar",
    delete: "Eliminar",
    edit: "Editar",
    add: "Agregar",
    search: "Buscar",
    filter: "Filtrar",
    export: "Exportar",
    print: "Imprimir",
    confirm: "Confirmar",
    close: "Cerrar",
    back: "Regresar",
    next: "Siguiente",
    previous: "Anterior",
    finish: "Finalizar",
    loading: "Cargando...",
    retry: "Reintentar",
  },

  // Status
  status: {
    active: "Activo",
    inactive: "Inactivo",
    pending: "Pendiente",
    completed: "Completado",
    cancelled: "Cancelado",
    draft: "Borrador",
    approved: "Aprobado",
  },

  // Payment methods
  payment: {
    cash_mxn: "Efectivo MXN",
    cash_usd: "Efectivo USD",
    credit_card: "Tarjeta de crédito",
    debit_card: "Tarjeta de débito",
    gift_card: "Tarjeta de regalo",
    loyalty_points: "Puntos de lealtad",
    transfer: "Transferencia",
    terminal_reference: "Referencia terminal",
    terminal_reference_placeholder: "Ej: 123456",
    terminal_reference_required:
      "La referencia de terminal es obligatoria para pagos con tarjeta",
  },

  // Currency
  currency: {
    mxn: "MXN",
    usd: "USD",
    exchange_rate: "Tipo de cambio",
    exchange_rate_badge: "1 USD = {rate} MXN",
  },

  // Sales
  sales: {
    new_sale: "Nueva venta",
    search_product: "Buscar producto o escanear código",
    cart_empty: "El carrito está vacío",
    add_customer: "Agregar cliente",
    total: "Total",
    subtotal: "Subtotal",
    tax: "IVA",
    discount: "Descuento",
    change: "Cambio",
    complete_sale: "Completar venta",
    cancel_sale: "Cancelar venta",
    receipt: "Recibo",
    print_receipt: "Imprimir recibo",
    folio: "Folio",
    consignment_badge: "Consignación",
    low_stock_badge: "Poco stock",
    out_of_stock: "Sin stock",
  },

  // Products
  products: {
    title: "Productos",
    new_product: "Nuevo producto",
    sku: "SKU",
    name: "Nombre",
    category: "Categoría",
    price_general: "Precio general",
    price_a: "Precio A",
    price_b: "Precio B",
    price_c: "Precio C",
    last_cost: "Último costo",
    stock: "Existencia",
    track_inventory: "Controlar inventario",
    consignment: "Consignación",
    no_products: "No hay productos",
  },

  // Errors
  error: {
    generic: "Ocurrió un error. Intenta de nuevo.",
    network: "Error de conexión. Verifica tu red.",
    unauthorized: "No tienes permiso para realizar esta acción.",
    not_found: "No se encontró el recurso solicitado.",
    validation: "Por favor revisa los campos marcados.",
  },

  // Demo mode
  demo: {
    banner:
      "⚠️ MODO DEMO — Los datos son ficticios y se reiniciarán periódicamente",
  },
} as const;
