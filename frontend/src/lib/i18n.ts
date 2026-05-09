// @module:base
export const t = {
  // Navigation
  nav: {
    pos: "Punto de Venta",
    catalog: "Catálogo",
    customers: "Clientes",
    suppliers: "Proveedores",
    purchases: "Compras",
    gift_cards: "Tarjetas Regalo",
    returns: "Devoluciones",
    reports: "Reportes",
    settings: "Configuración",
    users: "Usuarios",
  },

  // Common actions
  action: {
    save: "Guardar",
    cancel: "Cancelar",
    delete: "Eliminar",
    edit: "Editar",
    create: "Crear",
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
    logout: "Cerrar sesión",
    login: "Iniciar sesión",
    view: "Ver",
    void: "Anular",
    apply: "Aplicar",
    clear: "Limpiar",
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
    voided: "Anulado",
    open: "Abierto",
    closed: "Cerrado",
    received: "Recibido",
    low_stock: "Stock bajo",
    out_of_stock: "Sin stock",
  },

  // Payment methods
  payment: {
    method: "Método de pago",
    cash_mxn: "Efectivo MXN",
    cash_usd: "Efectivo USD",
    credit_card: "Tarjeta de crédito",
    debit_card: "Tarjeta de débito",
    gift_card: "Tarjeta regalo",
    loyalty_points: "Puntos de lealtad",
    transfer: "Transferencia",
    terminal_reference: "Referencia terminal",
    terminal_reference_placeholder: "Ej: 123456",
    terminal_reference_required:
      "La referencia de terminal es obligatoria para pagos con tarjeta",
    amount: "Monto",
    total: "Total",
    change: "Cambio",
    paid: "Pagado",
    remaining: "Restante",
  },

  // Currency
  currency: {
    mxn: "MXN",
    usd: "USD",
    exchange_rate: "Tipo de cambio",
    exchange_rate_badge: "1 USD = {rate} MXN",
    rate_as_of: "Tasa al",
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
    items: "Artículos",
    customer: "Cliente",
    walk_in: "Cliente general",
    cashier: "Cajero",
    session: "Sesión",
    open_session: "Abrir caja",
    close_session: "Cerrar caja",
    starting_cash: "Efectivo inicial",
    physical_cash: "Efectivo físico",
    expected_cash: "Efectivo esperado",
    difference: "Diferencia",
    void_sale: "Anular venta",
    void_reason: "Motivo de anulación",
    quantity: "Cantidad",
    unit_price: "Precio unitario",
    loyalty_points: "Puntos ganados",
    price_tier: "Nivel de precio",
  },

  // Products
  products: {
    title: "Productos",
    new_product: "Nuevo producto",
    sku: "SKU",
    name: "Nombre",
    description: "Descripción",
    category: "Categoría",
    price: "Precio",
    price_general: "Precio general",
    price_a: "Precio A",
    price_b: "Precio B",
    price_c: "Precio C",
    last_cost: "Último costo",
    stock: "Existencia",
    min_stock: "Mínimo",
    track_inventory: "Controlar inventario",
    consignment: "Consignación",
    is_consignment: "En consignación",
    no_products: "No hay productos",
    supplier: "Proveedor",
    attributes: "Atributos",
    add_product: "Agregar producto",
    edit_product: "Editar producto",
    search_placeholder: "Buscar por nombre o SKU...",
    status: "Estado",
  },

  // Customers
  customers: {
    name: "Nombre",
    email: "Correo electrónico",
    phone: "Teléfono",
    rfc: "RFC",
    address: "Dirección",
    loyalty_points: "Puntos de lealtad",
    add_customer: "Agregar cliente",
    search_placeholder: "Buscar cliente...",
  },

  // Suppliers
  suppliers: {
    name: "Nombre",
    contact_name: "Contacto",
    email: "Correo",
    phone: "Teléfono",
    add_supplier: "Agregar proveedor",
  },

  // Purchases
  purchases: {
    folio: "Folio",
    supplier: "Proveedor",
    total_cost: "Costo total",
    reference: "Referencia",
    new_purchase: "Nueva compra",
    consignment: "Consignación",
    settle: "Liquidar",
  },

  // Gift cards
  gift_cards: {
    code: "Código",
    initial_balance: "Saldo inicial",
    current_balance: "Saldo actual",
    status: "Estado",
    expires: "Vence",
    issue: "Emitir tarjeta",
    redeem: "Canjear",
    void_card: "Anular tarjeta",
  },

  // Returns
  returns: {
    folio: "Folio",
    original_sale: "Venta original",
    reason: "Motivo",
    total_returned: "Total devuelto",
    refund_method: "Método de reembolso",
    new_return: "Nueva devolución",
    refund: {
      cash: "Efectivo",
      gift_card: "Tarjeta regalo",
      store_credit: "Crédito en tienda",
    },
  },

  // Reports
  reports: {
    daily: "Reporte diario",
    sales_period: "Ventas por período",
    inventory: "Inventario",
    products: "Productos más vendidos",
    customers: "Clientes",
    download_pdf: "Descargar PDF",
    download_excel: "Descargar Excel",
    date_from: "Fecha desde",
    date_to: "Fecha hasta",
    total_sales: "Total ventas",
    total_revenue: "Ingresos totales",
    period: {
      day: "Por día",
      week: "Por semana",
      month: "Por mes",
    },
  },

  // Settings
  settings: {
    business_name: "Nombre del negocio",
    business_type: "Tipo de negocio",
    logo: "Logo",
    colors: "Colores",
    primary_color: "Color principal",
    theme: "Tema",
    theme_light: "Claro",
    theme_dark: "Oscuro",
    theme_system: "Sistema",
    wizard_title: "Configuración inicial",
    wizard_subtitle: "Configura tu negocio para comenzar",
  },

  // Auth
  auth: {
    username: "Usuario",
    password: "Contraseña",
    current_password: "Contraseña actual",
    new_password: "Nueva contraseña",
    confirm_password: "Confirmar contraseña",
    login_title: "Iniciar sesión",
    change_password_title: "Cambiar contraseña",
    change_password_required: "Debes cambiar tu contraseña antes de continuar",
    invalid_credentials: "Usuario o contraseña incorrectos",
    passwords_dont_match: "Las contraseñas no coinciden",
    password_too_short: "La contraseña debe tener al menos 8 caracteres",
  },

  // Errors
  error: {
    generic: "Ocurrió un error. Intenta de nuevo.",
    network: "Error de conexión. Verifica que el servidor esté activo.",
    unauthorized: "No autorizado",
    forbidden: "Sin permisos",
    not_found: "No encontrado",
    validation: "Por favor revisa los campos marcados.",
    required: "Este campo es requerido",
  },

  // Pagination
  pagination: {
    showing: "Mostrando",
    of: "de",
    prev: "Anterior",
    next: "Siguiente",
    per_page: "por página",
  },

  // Demo mode
  demo: {
    banner:
      "⚠️ MODO DEMO — Los datos son ficticios y se reiniciarán periódicamente",
    badge: "DEMO",
    message: "Modo demostración activo",
  },
} as const;
