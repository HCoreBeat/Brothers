let cart = JSON.parse(localStorage.getItem('cart')) || [];
let products = [];
let currentProduct = null;
let categories = [];
let topProductsScrollPosition = 0;

let storeStatus = {
    abierto: true,
    descripcion: ''
};

// Función para ir al inicio
function goToHome() {
    window.location.hash = '';
    hideProductDetail();
    toggleTopProductsPanel(true);
    renderProducts();
}

// Manejo del historial con hash
window.addEventListener('popstate', handleRouteChange);
window.addEventListener('hashchange', handleRouteChange);

function handleRouteChange() {
    const productName = decodeURIComponent(window.location.hash.substring(1));
    const searchInput = document.getElementById('search-input');
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
    
    if (!productName) {
        hideProductDetail();
        if (!searchTerm) {
            toggleTopProductsPanel(true); // Mostrar el panel solo si no hay búsqueda activa
        }
    } else {
        showProductDetail(productName);
    }
}

const bannerContainer = document.querySelector('.banner-container'); // <-- Nueva referencia al banner

// Cargar productos
async function loadProducts() {
    await loadStoreStatus();
    try {
        const response = await fetch('Json/products.json');
        if (!response.ok) throw new Error('Error al cargar productos');
        const data = await response.json();
        
        // Procesar productos para manejar variantes
        const productGroups = {};
        
        data.products.forEach(product => {
            // Extraer nombre base y versión
            const baseName = product.nombre.split('(')[0].trim();
            const variantName = product.nombre.match(/\((.*?)\)/)?.[1] || '';
            
            if (!productGroups[baseName]) {
                productGroups[baseName] = {
                    baseName: baseName,
                    variants: []
                };
            }
            
            productGroups[baseName].variants.push({
                ...product,
                cleanName: product.nombre.replace(/\(v\d+\)\s*/g, ''),
                variantName: variantName
            });
        });
        
        // Crear array de productos
        products = [];
        for (const baseName in productGroups) {
            const group = productGroups[baseName];
            
            if (group.variants.length > 1) {
                // Producto con variantes
                products.push({
                    ...group.variants[0],
                    id: `group_${baseName}`, // ID único para grupos
                    isGrouped: true,
                    baseName: baseName,
                    variants: group.variants,
                    currentVariant: 0
                });
            } else {
                // Producto sin variantes
                products.push(group.variants[0]);
            }
        }
        
        categories = ['Todo', ...new Set(products.map(product => product.categoria))];
        renderCategories();
        initPriceFilter();
        renderTopProducts(); // Renderizar productos top
        renderProducts();
        updateCartCount();
        updateCart();
        
        if (window.location.hash) {
            handleRouteChange();
        }

        document.getElementById('close-sidebar')?.addEventListener('click', toggleSidebar);
        document.getElementById('menu-toggle')?.addEventListener('click', toggleSidebar);
        document.getElementById('overlay')?.addEventListener('click', toggleSidebar);
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar los productos. Por favor recarga la página.');
    }
}

// Renderizar categorías
function renderCategories() {
    const sidebarCategories = document.getElementById('sidebar-categories');
    const desktopCategories = document.getElementById('categories-list');
    
    const categoryItems = categories.map(category => `
        <li onclick="filterByCategory('${category}')">
            <i class="fas fa-${getCategoryIcon(category)}"></i>
            ${category}
        </li>
    `).join('');
    
    if (sidebarCategories) sidebarCategories.innerHTML = categoryItems;
    if (desktopCategories) desktopCategories.innerHTML = categoryItems;
}
// Función auxiliar para iconos de categorías
function getCategoryIcon(category) {
    const icons = {
        'todo': 'th-large',
        'electrónica': 'mobile-alt',
        'ropa': 'tshirt',
        'hogar': 'home',
        'deportes': 'running',
        'juguetes': 'gamepad',
        'salud': 'heartbeat',
        'belleza': 'spa',
        'automóviles': 'car',
        'herramientas': 'wrench',
        'combos': 'utensils',
        'bebidas': 'wine-glass-alt',
        'postres': 'cookie-bite',
        'frutas': 'apple-alt',
        'verduras': 'carrot',
        'carnicería': 'drumstick-bite',
        'pescado': 'fish',
        'panadería': 'bread-slice',
        'lácteos': 'cheese',
        'snacks': 'coffee',
        'embutidos': 'hamburger',
        'despensa': 'shopping-basket',
        'pizza': 'pizza-slice'
    };

    return icons[category.toLowerCase().trim()] || 'tag'; // Convertimos a minúsculas y eliminamos espacios extra
}


function initPriceFilter() {
    const minPriceInput = document.getElementById('min-price');
    const maxPriceInput = document.getElementById('max-price');
    const minPriceSlider = document.getElementById('price-slider-min');
    const maxPriceSlider = document.getElementById('price-slider-max');
    const applyFilterBtn = document.getElementById('apply-price-filter');
    
    if (!minPriceInput || !maxPriceInput || !minPriceSlider || !maxPriceSlider) return;
    

    // Valores iniciales basados en el precio real mostrado al usuario (precio final)
    const realPrices = products.map(p => (p.oferta && p.descuento > 0) ? Number(p.descuento) : Number(p.precio));
    const minPrice = Math.floor(Math.min(...realPrices));
    const maxPrice = Math.ceil(Math.max(...realPrices));
    
    // Configurar sliders
    minPriceSlider.min = minPrice;
    minPriceSlider.max = maxPrice;
    minPriceSlider.value = minPrice;
    
    maxPriceSlider.min = minPrice;
    maxPriceSlider.max = maxPrice;
    maxPriceSlider.value = maxPrice;
    
    // Set initial input values
    minPriceInput.value = minPrice;
    maxPriceInput.value = maxPrice;
    
    // Update slider track initially
    updatePriceSlider();
    
    // Actualizar inputs cuando se mueven los sliders
    minPriceSlider.addEventListener('input', () => {
        minPriceInput.value = minPriceSlider.value;
        updatePriceSlider();
    });
    
    maxPriceSlider.addEventListener('input', () => {
        maxPriceInput.value = maxPriceSlider.value;
        updatePriceSlider();
    });
    
    // Actualizar sliders cuando se editan los inputs
    minPriceInput.addEventListener('change', () => {
        let value = Math.max(minPrice, Math.min(maxPrice, parseInt(minPriceInput.value) || minPrice));
        minPriceSlider.value = value;
        minPriceInput.value = value;
        updatePriceSlider();
    });
    
    maxPriceInput.addEventListener('change', () => {
        let value = Math.max(minPrice, Math.min(maxPrice, parseInt(maxPriceInput.value) || maxPrice));
        maxPriceSlider.value = value;
        maxPriceInput.value = value;
        updatePriceSlider();
    });
    
    // Aplicar filtros
    applyFilterBtn.addEventListener('click', applyPriceFilter);
    
    // Función para actualizar el track del slider
    function updatePriceSlider() {
        const minVal = parseInt(minPriceSlider.value);
        const maxVal = parseInt(maxPriceSlider.value);
        
        // Prevent sliders from crossing
        if (minVal > maxVal) {
            minPriceSlider.value = maxVal;
            minPriceInput.value = maxVal;
        } else if (maxVal < minVal) {
            maxPriceSlider.value = minVal;
            maxPriceInput.value = minVal;
        }
        
        const track = document.querySelector('.price-slider-track');
        if (track) {
            const minPercent = ((minPriceSlider.value - minPrice) / (maxPrice - minPrice)) * 100;
            const maxPercent = ((maxPriceSlider.value - minPrice) / (maxPrice - minPrice)) * 100;
            
            track.style.left = `${minPercent}%`;
            track.style.width = `${maxPercent - minPercent}%`;
        }
    }
    
    // Función para aplicar filtros
    function applyPriceFilter() {
        const minPrice = parseInt(minPriceInput.value) || 0;
        const maxPrice = parseInt(maxPriceInput.value) || Infinity;
        
        const filteredProducts = products.filter(product => {
            // Usar el precio real mostrado al usuario
            const finalPrice = product.oferta && product.descuento > 0 
                ? Number(product.descuento)
                : Number(product.precio);
            return finalPrice >= minPrice && finalPrice <= maxPrice;
        });
        
        renderProducts(filteredProducts);
        closeSidebar();
    }
}

// Filtrar por categoría
function filterByCategory(category) {
    // Ocultar mensaje de no resultados si está visible
    hideNoResultsMessage();
    
    // Limpiar campo de búsqueda
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.value = '';
    }
    
    // Ocultar detalle de produto se está visível
    if (document.getElementById('product-detail')?.style.display === 'block') {
        hideProductDetail();
    }
    
    // Filtrar productos
    const filteredProducts = category === 'Todo' 
        ? products 
        : products.filter(product => product.categoria === category);
    
    renderProducts(filteredProducts);
    
    // Cerrar sidebar en móvil
    if (window.innerWidth <= 768) {
        closeSidebar();
    }
}

// Buscar productos (ahora en tiempo real)
function searchProducts() {
    const searchInput = document.getElementById('search-input');
    const bannerContainer = document.querySelector('.banner-container');
    if (!searchInput) return;

    // Ocultar o mostrar el carrusel/banner según si hay texto en la barra de búsqueda
    const searchTerm = searchInput.value.toLowerCase().trim();
    if (bannerContainer) {
        if (searchTerm.length > 0) {
            bannerContainer.style.display = 'none';
        } else {
            bannerContainer.style.display = 'block';
        }
    }

    // Ocultar detalle de producto si está visible
    if (document.getElementById('product-detail')?.style.display === 'block') {
        hideProductDetail();
    }

    // Si la barra está vacía, mostrar todos los productos y ocultar mensaje de no resultados
    if (!searchTerm) {
        renderProducts();
        hideNoResultsMessage();
        return;
    }

    // Filtrar productos en tiempo real
    const filteredProducts = products.filter(product =>
        product.nombre.toLowerCase().includes(searchTerm) ||
        product.descripcion.toLowerCase().includes(searchTerm) ||
        product.categoria.toLowerCase().includes(searchTerm)
    );

    if (filteredProducts.length > 0) {
        renderProducts(filteredProducts);
        hideNoResultsMessage();
    } else {
        renderProducts([]); // Mostrar vacío
        showNoResultsMessage(searchTerm);
    }
}

function showNoResultsMessage(searchTerm) {
    const noResultsMessage = document.getElementById('no-results-message');
    if (noResultsMessage) {
        // Actualizar el término de búsqueda en el span
        const termSpan = noResultsMessage.querySelector('.no-results-term');
        if (termSpan) termSpan.textContent = searchTerm;
        noResultsMessage.style.display = 'block';
    }
}

function hideNoResultsMessage() {
    const noResultsMessage = document.getElementById('no-results-message');
    if (noResultsMessage) {
        noResultsMessage.style.display = 'none';
    }
}

// Función para limpiar la búsqueda
function clearSearch() {
    const searchInput = document.getElementById('search-input');
    const bannerContainer = document.querySelector('.banner-container');
    if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
    }
    if (bannerContainer) bannerContainer.style.display = 'block';
    renderProducts();
    hideNoResultsMessage();
}

// Toggle del menú lateral
function toggleSidebar() {
    if (window.innerWidth > 768) return;
    
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    
    if (!sidebar) return;

    const isOpening = !sidebar.classList.contains('active');
    
    // Cerrar carrito si está abierto
    closeCart();
    
    // Alternar estado del sidebar
    sidebar.classList.toggle('active');
    document.body.classList.toggle('sidebar-open', isOpening);

    // Manejar el overlay
    if (isOpening) {
        if (!sidebarOverlay) {
            const overlay = document.createElement('div');
            overlay.id = 'sidebar-overlay';
            overlay.className = 'sidebar-overlay';
            overlay.onclick = closeSidebar;
            document.body.appendChild(overlay);
            setTimeout(() => overlay.classList.add('active'), 10);
        } else {
            sidebarOverlay.classList.add('active');
        }
    } else {
        closeSidebar();
    }
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    
    if (sidebar && sidebar.classList.contains('active')) {
        sidebar.classList.remove('active');
        document.body.classList.remove('sidebar-open');
    }
    
    if (sidebarOverlay) {
        sidebarOverlay.classList.remove('active');
        setTimeout(() => {
            if (sidebarOverlay && !sidebarOverlay.classList.contains('active')) {
                sidebarOverlay.remove();
            }
        }, 300);
    }
}

// Mostrar modal de carrito vacío
function showEmptyCartModal() {
    const modal = document.getElementById('empty-cart-modal');
    if (!modal) return;
    
    modal.style.display = 'flex';
    setTimeout(() => {
        modal.classList.add('active');
    }, 10);
}

// Cerrar modal de carrito vacío
function closeEmptyCartModal() {
    const modal = document.getElementById('empty-cart-modal');
    if (!modal) return;
    
    modal.classList.remove('active');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

function changeProductVariant(thumbElement, baseName, variantIndex, event) {
    if (event) event.stopPropagation();

    const productCard = thumbElement.closest('.product-card');
    const product = products.find(p => p.baseName === baseName);

    if (!product || !product.isGrouped) return;

    // Actualizar la variante actual
    product.currentVariant = variantIndex;
    const variant = product.variants[variantIndex];

    // Recalcular precios para la variante seleccionada
    const isOnSale = variant.oferta && variant.descuento > 0;
    let finalPrice, discountPercent;
    if (isOnSale) {
        finalPrice = Number(variant.descuento).toFixed(2);
        discountPercent = Math.round(100 - (variant.descuento * 100 / variant.precio));
    } else {
        finalPrice = Number(variant.precio).toFixed(2);
        discountPercent = 0;
    }

    // Actualizar la imagen principal
    productCard.querySelector('.product-image').src = `Images/products/${variant.imagenes[0]}`;
    productCard.querySelector('.product-image').alt = variant.cleanName;
    productCard.querySelector('.product-image').setAttribute('onclick', `showProductDetail('${encodeURIComponent(variant.nombre)}')`);

    // Actualizar el título
    productCard.querySelector('.product-title').textContent = variant.cleanName;
    productCard.querySelector('.product-title').setAttribute('onclick', `showProductDetail('${encodeURIComponent(variant.nombre)}')`);

    // Actualizar la sección de precios
    const priceContainer = productCard.querySelector('.price-container');
    if (priceContainer) {
        priceContainer.innerHTML = `
            ${isOnSale ? `
                <span class="original-price">${Number(variant.precio).toFixed(2)}<img src='Images/Zelle-Symbol.png' alt='Zelle' class='zelle-symbol'></span>
                <span class="discount-percent">-${discountPercent}%</span>
            ` : ''}
            <span class="current-price">${finalPrice} <img src='Images/Zelle-Symbol.png' alt='Zelle' class='zelle-symbol'></span>
        `;
    }

    // Actualizar los badges (Nuevo, Oferta, Más Vendido)
    const productBadges = productCard.querySelector('.product-badges');
    if (productBadges) {
        productBadges.innerHTML = `
                ${variant.nuevo ? '<img src="Images/badge_new.png" alt="Nuevo" class="badge-image">' : ''}
                ${variant.oferta ? '<img src="Images/oferta.png" alt="Oferta" class="badge-image">' : ''}
                ${variant.mas_vendido ? '<img src="Images/badge_top.png" alt="Top" class="badge-image">' : ''}
        `;
    }

    // Actualizar el botón de añadir al carrito
    productCard.querySelector('.add-to-cart').setAttribute('onclick', `addToCart('${variant.nombre}', false, event)`);

    // Actualizar las miniaturas activas
    const thumbs = productCard.querySelectorAll('.variant-thumb');
    thumbs.forEach((thumb, index) => {
        if (index === variantIndex) {
            thumb.classList.add('active');
        } else {
            thumb.classList.remove('active');
        }
    });
}

// Mostrar detalle del producto con precios corregidos
function showProductDetail(productName) {
    window.scrollTo({top: 0});
    toggleTopProductsPanel(false); // Ocultar el panel de productos top
    const decodedName = decodeURIComponent(productName);

    // Ocultar el banner al entrar al detalle del producto
    if (bannerContainer) {
        bannerContainer.style.display = 'none'; // <-- OCULTA EL BANNER
    }
    
    // Buscar el producto principal
    let product = products.find(p => p.nombre === decodedName);
    let isVariant = false;
    let mainProduct = null;
    let variantIndex = 0;
    
    if (!product) {
        mainProduct = products.find(p => 
            p.isGrouped && p.variants.some(v => v.nombre === decodedName)
        );
        
        if (mainProduct) {
            isVariant = true;
            variantIndex = mainProduct.variants.findIndex(v => v.nombre === decodedName);
            product = mainProduct.variants[variantIndex];
        } else {
            window.location.hash = '';
            hideProductDetail();
            return;
        }
    } else if (product.isGrouped) {
        mainProduct = product;
        product = product.variants[0];
        variantIndex = 0;
    }
    
    window.location.hash = encodeURIComponent(product.nombre);
    
    const detailContainer = document.getElementById('product-detail');
    const productsContainer = document.getElementById('products-container');

    if (!detailContainer || !productsContainer) return;

    const isOnSale = product.oferta && product.descuento > 0;
    let finalPrice, discountPercent;
    if (isOnSale) {
        finalPrice = Number(product.descuento).toFixed(2);
        discountPercent = Math.round(100 - (product.descuento * 100 / product.precio));
    } else {
        finalPrice = Number(product.precio).toFixed(2);
        discountPercent = 0;
    }
    const priceSave = isOnSale ? (product.precio - finalPrice).toFixed(2) : 0;

    // Obtener productos sugeridos mejorados
    const suggestedProducts = getSuggestedProducts(mainProduct || product, 6); // Mostrar 6 sugerencias
    
    // Miniaturas de variantes
    const variantThumbnails = mainProduct?.isGrouped ? `
        <div class="variant-thumbnails-detail-container">
            <p class="variant-title">Variantes disponibles:</p>
            <div class="variant-thumbnails-detail">
                ${mainProduct.variants.map((v, index) => `
                    <div class="variant-thumb ${index === variantIndex ? 'active' : ''}" 
                         onclick="changeDetailVariant('${mainProduct.baseName}', ${index}, event)">
                        <img src="Images/products/${v.imagenes[0]}" alt="${v.variantName}">
                        <span class="variant-tooltip">${v.variantName}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    ` : '';

    // Badges
    const badges = [];
    if (product.nuevo) badges.push('<span class="detail-badge nuevo"><i class="fas fa-star"></i> Nuevo</span>');
    if (product.mas_vendido) badges.push('<span class="detail-badge mas-vendido"><i class="fas fa-trophy"></i> Más Vendido</span>');

    // Especificaciones
    const specs = [
        `<li><strong>Categoría</strong> ${product.categoria}</li>`,
        `<li><strong>Disponibilidad</strong> ${product.disponibilidad ? 'En stock' : 'Agotado'}</li>`,
        ...(product.especificaciones || []).map(spec => `<li><strong>${spec.key}</strong> ${spec.value}</li>`)
    ];

    // Sección de productos sugeridos mejorada
    const suggestedProductsHTML = suggestedProducts.length > 0 ? `
        <div class="suggested-products-section">
            <div class="section-header">
                <h3 class="section-title">Productos relacionados</h3>
                <div class="section-divider"></div>
            </div>
            <div class="suggested-products-carousel">
                ${suggestedProducts.map(suggested => {
                    const isOnSaleSuggested = suggested.oferta && suggested.descuento > 0;
                    let finalPriceSuggested, discountPercentSuggested;
                    if (isOnSaleSuggested) {
                        finalPriceSuggested = Number(suggested.descuento).toFixed(2);
                        discountPercentSuggested = Math.round(100 - (suggested.descuento * 100 / suggested.precio));
                    } else {
                        finalPriceSuggested = Number(suggested.precio).toFixed(2);
                        discountPercentSuggested = 0;
                    }
                    return `
                        <div class="suggested-item">
                            <div class="suggested-badges">
                                ${suggested.nuevo ? '<img src="Images/badge_new.png" alt="Nuevo" class="badge-image">' : ''}
                                ${suggested.oferta ? '<img src="Images/oferta.png" alt="Oferta" class="badge-image">' : ''}
                                ${suggested.mas_vendido ? '<img src="Images/badge_top.png" alt="Top" class="badge-image">' : ''}
                            </div>
                            <div class="suggested-image" onclick="showProductDetail('${encodeURIComponent(suggested.nombre)}')">
                                <img src="Images/products/${suggested.imagenes[0]}" alt="${suggested.cleanName || suggested.nombre}">
                            </div>
                            <div class="suggested-details">
                                <h4 class="suggested-name" onclick="showProductDetail('${encodeURIComponent(suggested.nombre)}')">
                                    ${suggested.cleanName || suggested.nombre}
                                </h4>
                                <div class="suggested-price">
                                    ${isOnSaleSuggested ? `
                                        <span class="original-price">${Number(suggested.precio).toFixed(2)}<img src='Images/Zelle-Symbol.png' alt='Zelle' class='zelle-symbol'></span>
                                        <span class="discount-percent">-${discountPercentSuggested}%</span>
                                        <span class="current-price">${finalPriceSuggested} <img src='Images/Zelle-Symbol.png' alt='Zelle' class='zelle-symbol'></span>
                                    ` : `
                                        <span class="current-price">${finalPriceSuggested} <img src='Images/Zelle-Symbol.png' alt='Zelle' class='zelle-symbol'></span>
                                    `}
                                </div>
                                <button class="add-to-cart-mini" onclick="addToCart('${suggested.nombre}', false, event)">
                                    <i class="fas fa-cart-plus"></i> Añadir
                                </button>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    ` : '';

    detailContainer.innerHTML = `
        <div class="detail-container">
            <div class="detail-gallery">
                <div class="main-image-container">
                    <img src="Images/products/${product.imagenes[0]}" class="main-image" alt="${product.cleanName}" id="main-product-image">
                </div>
            </div>
            <div class="detail-info">
                <h1 class="detail-title">${product.cleanName}</h1>
                ${variantThumbnails}
                ${badges.length ? `<div class="detail-badges">${badges.join('')}</div>` : ''}
                <div class="price-section">
                    ${isOnSale ? `
                        <div class="price-with-discount">
                            <span class="price-original">${Number(product.precio).toFixed(2)}<img src='Images/Zelle-Symbol.png' alt='Zelle' class='zelle-symbol'></span>
                            <span class="discount-percent">-${discountPercent}%</span>
                        </div>
                        <span class="price-current">${finalPrice} <img src='Images/Zelle-Symbol.png' alt='Zelle' class='zelle-symbol'></span>
                        <div class="price-save">Ahorras ${(product.precio - finalPrice).toFixed(2)} <img src='Images/Zelle-Symbol.png' alt='Zelle' class='zelle-symbol'></div>
                    ` : `
                        <span class="price-current">${finalPrice} <img src='Images/Zelle-Symbol.png' alt='Zelle' class='zelle-symbol'></span>
                    `}
                </div>
                
                <div class="quantity-section">
                    <label class="quantity-label">Cantidad:</label>
                    <div class="quantity-controls">
                        <button class="quantity-btn" onclick="adjustDetailQuantity(-1, event)">
                            <i class="fas fa-minus"></i>
                        </button>
                        <span class="quantity-display" id="detail-quantity">1</span>
                        <button class="quantity-btn" onclick="adjustDetailQuantity(1, event)">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </div>

                <button class="add-to-cart-btn" onclick="addToCart('${product.nombre}', true, event)">
                    <i class="fas fa-cart-plus"></i>
                    Añadir al carrito
                </button>
                
                <div class="product-description">
                    <h4 class="description-title"><i class="fas fa-align-left"></i> Descripción</h4>
                    <div class="description-content">
                        ${formatProductDescription(product.descripcion)}
                    </div>
                </div>
                
                <div class="product-specs">
                    <h3 class="specs-title"><i class="fas fa-list-ul"></i> Especificaciones</h3>
                    <ul class="specs-list">
                        ${specs.join('')}
                    </ul>
                </div>
            </div>
            
            <div class="back-btn-container">
                <button class="back-btn" onclick="hideProductDetail()">
                    <i class="fas fa-arrow-left"></i> Volver a productos
                </button>
            </div>
            
            ${suggestedProductsHTML}
        </div>
    `;

    productsContainer.style.display = 'none';
    detailContainer.style.display = 'block';
    currentProduct = product;

    // Inicializar carrusel después de renderizar
    setTimeout(() => {
        initSuggestedProductsCarousel();
    }, 100);
}

function changeDetailVariant(baseName, variantIndex, event) {
    if (event) event.stopPropagation();
    
    const product = products.find(p => p.baseName === baseName);
    
    if (product && product.isGrouped && product.variants[variantIndex]) {
        const variant = product.variants[variantIndex];
        window.location.hash = encodeURIComponent(variant.nombre);
        showProductDetail(variant.nombre);
    }
}

function getSuggestedProducts(currentProduct, count = 6) {
    if (!currentProduct || !products.length) return [];
    
    const baseProduct = currentProduct.isGrouped ? currentProduct : currentProduct;
    const currentCategory = baseProduct.categoria;
    
    // Excluir el producto actual y sus variantes
    const excludedIds = baseProduct.isGrouped 
        ? [...baseProduct.variants.map(v => v.id), baseProduct.id]
        : [baseProduct.id];
    
    // Primero: productos de la misma categoría
    const sameCategory = products.filter(p => 
        p.categoria === currentCategory && 
        !excludedIds.includes(p.id) &&
        p.id !== baseProduct.id
    );
    
    // Segundo: productos destacados de otras categorías
    const featuredProducts = products.filter(p => 
        p.categoria !== currentCategory && 
        !excludedIds.includes(p.id) &&
        (p.mas_vendido || p.nuevo || p.oferta)
    );
    
    // Combinar y ordenar
    const suggested = [
        ...sameCategory.map(p => ({ product: p, score: 3 })),
        ...featuredProducts.map(p => ({ product: p, score: 1 }))
    ];
    
    // Aleatorizar y limitar
    return suggested
        .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            if (b.product.mas_vendido !== a.product.mas_vendido) return b.product.mas_vendido ? 1 : -1;
            if (b.product.oferta !== a.product.oferta) return b.product.oferta ? 1 : -1;
            return Math.random() - 0.5;
        })
        .slice(0, count)
        .map(item => item.product);
}

// Carrusel de productos sugeridos
function initSuggestedProductsCarousel() {
    const carousel = document.querySelector('.suggested-products-carousel');
    if (!carousel) return;

    const prevBtn = document.createElement('button');
    prevBtn.className = 'carousel-nav prev hidden';
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevBtn.onclick = () => scrollCarousel(-1);
    
    const nextBtn = document.createElement('button');
    nextBtn.className = 'carousel-nav next';
    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextBtn.onclick = () => scrollCarousel(1);

    carousel.parentElement.insertBefore(prevBtn, carousel);
    carousel.parentElement.insertBefore(nextBtn, carousel.nextSibling);

    // Actualizar visibilidad de botones
    function updateNavButtons() {
        const { scrollLeft, scrollWidth, clientWidth } = carousel;
        prevBtn.classList.toggle('hidden', scrollLeft === 0);
        nextBtn.classList.toggle('hidden', scrollLeft >= scrollWidth - clientWidth - 1);
    }

    // Función para desplazar el carrusel
    function scrollCarousel(direction) {
        const itemWidth = carousel.querySelector('.suggested-item').offsetWidth;
        const scrollAmount = (itemWidth + 20) * direction; // 20px es el gap
        
        carousel.scrollBy({
            left: scrollAmount,
            behavior: 'smooth'
        });
    }

    // Event listeners
    carousel.addEventListener('scroll', updateNavButtons);
    updateNavButtons();

    // Touch events para móviles
    let isDragging = false;
    let startX;
    let scrollLeft;

    carousel.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.pageX - carousel.offsetLeft;
        scrollLeft = carousel.scrollLeft;
        carousel.style.cursor = 'grabbing';
        carousel.style.scrollBehavior = 'auto';
    });

    carousel.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX - carousel.offsetLeft;
        const walk = (x - startX) * 2;
        carousel.scrollLeft = scrollLeft - walk;
    });

    carousel.addEventListener('mouseup', () => {
        isDragging = false;
        carousel.style.cursor = 'grab';
        carousel.style.scrollBehavior = 'smooth';
        updateNavButtons();
    });

    carousel.addEventListener('mouseleave', () => {
        isDragging = false;
        carousel.style.cursor = 'grab';
    });

    // Touch events
    carousel.addEventListener('touchstart', (e) => {
        isDragging = true;
        startX = e.touches[0].pageX - carousel.offsetLeft;
        scrollLeft = carousel.scrollLeft;
        carousel.style.scrollBehavior = 'auto';
    });

    carousel.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        const x = e.touches[0].pageX - carousel.offsetLeft;
        const walk = (x - startX) * 2;
        carousel.scrollLeft = scrollLeft - walk;
    });

    carousel.addEventListener('touchend', () => {
        isDragging = false;
        carousel.style.scrollBehavior = 'smooth';
        updateNavButtons();
    });

    // Actualizar al redimensionar
    window.addEventListener('resize', updateNavButtons);
}

// Función auxiliar para formatear la descripción
function formatProductDescription(description) {
    if (!description) return '<p class="no-description">No hay descripción disponible</p>';
    
    // Dividir en oraciones considerando múltiples signos de puntuación
    const sentences = description.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
    
    return sentences.map(sentence => {
        const trimmedSentence = sentence.trim();
        // Destacar oraciones importantes
        const isImportant = /(garantiza|ideal|perfecto|exclusiv|especial)/i.test(trimmedSentence);
        
        return `
            <div class="description-sentence ${isImportant ? 'important-sentence' : ''}">
                <div class="sentence-icon">
                    <i class="fas ${isImportant ? 'fa-star' : 'fa-angle-right'}"></i>
                </div>
                <div class="sentence-text">
                    ${trimmedSentence}
                    ${!trimmedSentence.endsWith('.') && !trimmedSentence.endsWith('!') && !trimmedSentence.endsWith('?') ? '.' : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Función auxiliar para cambiar imagen principal
function changeMainImage(imgSrc) {
    const mainImg = document.getElementById('main-product-image');
    if (mainImg) {
        mainImg.src = `Images/products/${imgSrc}`;
        mainImg.style.opacity = '0';
        setTimeout(() => {
            mainImg.style.opacity = '1';
            mainImg.style.transition = 'opacity 0.3s ease';
        }, 10);
    }
}

// Ocultar detalle
// Función para ocultar el detalle del producto
function hideProductDetail() {
    const productsContainer = document.getElementById('products-container');
    const detailContainer = document.getElementById('product-detail');
    
    toggleTopProductsPanel(true); // Mostrar el panel de productos top
    
    if (productsContainer) {
        productsContainer.style.display = 'grid';
        productsContainer.style.animation = 'fadeIn 0.4s ease-out';
    }

    // Mostrar el banner cuando se vuelve a la página principal
    if (bannerContainer) {
        bannerContainer.style.display = 'block'; // <-- MUESTRA EL BANNER
    }
    
    if (detailContainer) {
        detailContainer.style.display = 'none';
        detailContainer.innerHTML = '';
    }
    
    currentProduct = null;
    window.location.hash = '';

    showBannerIfNeeded();
}

// Carrito
function addToCart(productName, fromDetail = false, event) {
    if (event) event.stopPropagation();
    
    const decodedName = decodeURIComponent(productName);
    const product = products.find(p => p.nombre === decodedName) || 
                   products.flatMap(p => p.isGrouped ? p.variants : []).find(v => v.nombre === decodedName);
    
    if (!product) return;

    let quantity;
    if (fromDetail) {
        const quantityElement = document.getElementById('detail-quantity');
        quantity = quantityElement ? parseInt(quantityElement.textContent) || 1 : 1;
    } else {
        // Modificado para manejar productos con variantes
        const productCard = event.target.closest('.product-card');
        if (!productCard) return;
        
        const quantityElement = productCard.querySelector('.product-quantity');
        quantity = quantityElement ? parseInt(quantityElement.textContent) || 1 : 1;
    }

    const existingItem = cart.find(item => item.product.nombre === decodedName);
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({ product: product, quantity: quantity });
    }

    updateCart();
    saveCart();
    showCartNotification(product.cleanName || product.nombre, quantity);
}

function updateCart() {
    const cartItems = document.getElementById('cart-items');
    const totalElement = document.getElementById('total');
    const emptyPanel = document.getElementById('empty-cart-panel');
    const cartSidebar = document.getElementById('cart');
    const closedMsgId = 'store-closed-cart-msg';
    // Mostrar mensaje si la tienda está cerrada JUNTO AL BOTÓN DE CHECKOUT
    let closedMsg = document.getElementById(closedMsgId);
    // Buscar el botón de checkout dentro del carrito
    const checkoutBtn = cartSidebar ? cartSidebar.querySelector('.checkout-btn') : null;
    if (!storeStatus.abierto && checkoutBtn) {
        if (!closedMsg) {
            closedMsg = document.createElement('div');
            closedMsg.id = closedMsgId;
            closedMsg.className = 'cart-closed-message';
            closedMsg.innerHTML = `<i class="fas fa-lock"></i> La tienda está cerrada. Puedes seguir agregando productos al carrito y procesar tu pedido cuando la tienda esté abierta.`;
            // Insertar justo después del botón de checkout
            checkoutBtn.parentNode.insertBefore(closedMsg, checkoutBtn.nextSibling);
        } else {
            // Si ya existe, asegúrate de que esté en la posición correcta
            if (closedMsg.previousSibling !== checkoutBtn) {
                checkoutBtn.parentNode.insertBefore(closedMsg, checkoutBtn.nextSibling);
            }
        }
        closedMsg.style.display = 'block';
    } else if (closedMsg) {
        closedMsg.style.display = 'none';
    }
    // Si el botón de checkout no existe (carrito vacío), elimina el mensaje si existe
    if (!checkoutBtn && closedMsg) {
        closedMsg.remove();
    }
    
    if (!cartItems || !totalElement || !emptyPanel || !cartSidebar) return;
    
    cartItems.innerHTML = '';
    let total = 0;
    
    if (cart.length === 0) {
        cartSidebar.classList.add('empty');
    } else {
        cartSidebar.classList.remove('empty');
        
        cart.forEach((item, index) => {
            // Calcular precio con descuento si aplica
            const isOnSale = item.product.oferta && item.product.descuento > 0;
            let unitPrice;
            if (isOnSale) {
                unitPrice = Number(item.product.descuento);
            } else {
                unitPrice = Number(item.product.precio);
            }
            const itemTotal = unitPrice * item.quantity;
            total += itemTotal;
            
            const itemEl = document.createElement('div');
            itemEl.className = 'cart-item';
            itemEl.innerHTML = `
                ${isOnSale ? '<span class="cart-item-badge oferta">OFERTA</span>' : ''}
                <img src="Images/products/${item.product.imagenes[0]}" alt="${item.product.nombre}">
                <div class="cart-item-info">
                    <p>${item.product.nombre}</p>
                    <p><img src='Images/Zelle-Symbol.png' alt='Zelle' class='zelle-symbol'> ${unitPrice.toFixed(2)} c/u</p>
                    <div class="cart-item-controls">
                        <button class="cart-quantity-btn decrease-btn" onclick="updateCartQuantity(${index}, -1, event)">-</button>
                        <span class="cart-quantity">${item.quantity}</span>
                        <button class="cart-quantity-btn increase-btn" onclick="updateCartQuantity(${index}, 1, event)">+</button>
                        <button class="delete-item-btn" onclick="removeFromCart(${index}, event)">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                    <p>Total: <img src='Images/Zelle-Symbol.png' alt='Zelle' class='zelle-symbol'> ${itemTotal.toFixed(2)}</p>
                </div>
            `;
            cartItems.appendChild(itemEl);
        });
        
        totalElement.innerHTML = `<img src='Images/Zelle-Symbol.png' alt='Zelle' class='zelle-symbol'> ${total.toFixed(2)}`;
    }
    
    updateCartCount();
}

function removeFromCart(index, event) {
    if (event) event.stopPropagation();
    
    if (cart[index]) {
        const productName = cart[index].product.nombre;
        cart.splice(index, 1);
        updateCart();
        saveCart();
        
        // Mostrar notificación de eliminación
        showRemoveNotification(productName);
    }
}

function showRemoveNotification(productName) {
    const notification = document.createElement('div');
    notification.className = 'cart-notification removed';
    notification.innerHTML = `
        <p>${productName} eliminado del carrito</p>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 10);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function updateCartQuantity(index, change, event) {
    if (event) event.stopPropagation();
    
    if (cart[index]) {
        cart[index].quantity += change;
        if (cart[index].quantity < 1) cart.splice(index, 1);
        updateCart();
        saveCart();
    }
}

function showCartNotification(productName, quantity) {
    const notification = document.createElement('div');
    notification.className = 'cart-notification';
    notification.innerHTML = `
        <p>${quantity}x ${productName} añadido al carrito</p>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 10);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Vaciar completamente el carrito
function clearCart() {
    cart = [];
    localStorage.removeItem('cart');
    updateCart();
    updateCartCount();
}

// Funciones auxiliares
function adjustQuantity(btn, change, productName, event) {
    if (event) event.stopPropagation();
    const quantityElement = document.getElementById(`quantity-${productName}`);
    if (quantityElement) {
        let quantity = parseInt(quantityElement.textContent) || 1;
        quantity = Math.max(1, quantity + change);
        quantityElement.textContent = quantity;
    }
}

function adjustDetailQuantity(change, event) {
    if (event) event.stopPropagation();
    const quantityElement = document.getElementById('detail-quantity');
    if (quantityElement) {
        let quantity = parseInt(quantityElement.textContent) || 1;
        quantity = Math.max(1, quantity + change);
        quantityElement.textContent = quantity;
    }
}

function toggleCart() {
    const cart = document.getElementById('cart');
    const cartOverlay = document.getElementById('cart-overlay');
    
    if (!cart) return;

    const isOpening = !cart.classList.contains('active');
    
    // Cerrar sidebar si está abierto
    closeSidebar();
    
    // Alternar estado del carrito
    cart.classList.toggle('active');
    document.body.classList.toggle('cart-open', isOpening);

    // Manejar el overlay
    if (isOpening) {
        if (!cartOverlay) {
            const overlay = document.createElement('div');
            overlay.id = 'cart-overlay';
            overlay.className = 'cart-overlay';
            overlay.onclick = closeCart;
            document.body.appendChild(overlay);
            setTimeout(() => overlay.classList.add('active'), 10);
        } else {
            cartOverlay.classList.add('active');
        }
    } else {
        closeCart();
    }
}

function closeCart() {
    const cart = document.getElementById('cart');
    const cartOverlay = document.getElementById('cart-overlay');
    
    if (cart && cart.classList.contains('active')) {
        cart.classList.remove('active');
        document.body.classList.remove('cart-open');
    }
    
    if (cartOverlay) {
        cartOverlay.classList.remove('active');
        setTimeout(() => {
            if (cartOverlay && !cartOverlay.classList.contains('active')) {
                cartOverlay.remove();
            }
        }, 300);
    }
}

function updateCartCount() {
    const countElement = document.getElementById('cart-count');
    if (countElement) {
        const count = cart.reduce((acc, item) => acc + item.quantity, 0);
        countElement.textContent = count;
    }
}

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

// Cerrar carrito al hacer clic fuera
document.addEventListener('click', (e) => {
    const cart = document.getElementById('cart');
    const cartBtn = document.querySelector('.cart-btn');
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.getElementById('menu-toggle');
    
    // Manejar cierre del carrito
    if (cart && cartBtn && cart.classList.contains('active') && 
        !cart.contains(e.target) && e.target !== cartBtn && !cartBtn.contains(e.target)) {
        closeCart();
    }
    
    // Manejar cierre del sidebar
    if (sidebar && menuToggle && sidebar.classList.contains('active') && 
        !sidebar.contains(e.target) && e.target !== menuToggle && !menuToggle.contains(e.target)) {
        closeSidebar();
    }
});

/**
 * Abre WhatsApp with mensaje predeterminado
 */
function openWhatsApp() {
    const phoneNumber = '+5358865385';
    const message = encodeURIComponent('Estoy interesado en los productos que vi en su tienda. ¿Podrían ayudarme?');
    const url = `https://wa.me/${phoneNumber}?text=${message}`;
    
    // Abrir en una nueva pestaña
    window.open(url, '_blank');
}

// --- Funcionalidad para ocultar/mostrar header al hacer scroll ---

let lastScrollY = 0;
const header = document.querySelector('.header');
const headerHeight = header ? header.offsetHeight : 60; // Obtiene la altura del header, o usa un valor por defecto

window.addEventListener('scroll', () => {
    const currentScrollY = window.scrollY;

    // Si estás en la parte superior de la página, asegúrate de que el header esté visible
    if (currentScrollY <= headerHeight / 2) { // Un pequeño umbral para mostrarlo al principio
        header.classList.remove('header-hidden');
    } 
    // Si haces scroll hacia abajo Y has pasado el header
    else if (currentScrollY > lastScrollY && currentScrollY > headerHeight) {
        header.classList.add('header-hidden');
    } 
    // Si haces scroll hacia arriba
    else if (currentScrollY < lastScrollY) {
        header.classList.remove('header-hidden');
    }

    lastScrollY = currentScrollY;
});

// --- Fin de la funcionalidad del header ---

// Función para cargar el estado de la tienda
async function loadStoreStatus() {
    try {
        const response = await fetch('Json/estado.json');
        if (!response.ok) throw new Error('No se pudo cargar el estado de la tienda');
        let data = await response.json();
        // Si es un array, tomar el primer elemento
        if (Array.isArray(data)) {
            data = data[0] || {};
        }
        // Detectar el campo correcto y convertir correctamente a booleano
        let abierto = true;
        let raw = undefined;
        if (Object.prototype.hasOwnProperty.call(data, 'Open')) {
            raw = data.Open;
        } else if (Object.prototype.hasOwnProperty.call(data, 'open')) {
            raw = data.open;
        } else if (Object.prototype.hasOwnProperty.call(data, 'abierto')) {
            raw = data.abierto;
        } else if (Object.prototype.hasOwnProperty.call(data, 'Abierto')) {
            raw = data.Abierto;
        }
        if (typeof raw === 'boolean') {
            abierto = raw;
        } else if (typeof raw === 'string') {
            abierto = raw.trim().toLowerCase() === 'true';
        } else {
            abierto = true; // Por defecto abierta si no se encuentra el campo
        }
        storeStatus.abierto = abierto;
        storeStatus.descripcion = data.descripcion || '';
    } catch (e) {
        storeStatus.abierto = true;
        storeStatus.descripcion = '';
    }
    renderStoreStatusBanner();
    updateCheckoutButtonState();
    // Deshabilitar botones de procesar pedido si la tienda está cerrada
    const processBtns = document.querySelectorAll('.checkout-btn, .process-order-btn');
    processBtns.forEach(btn => {
        btn.disabled = !storeStatus.abierto;
        btn.classList.toggle('disabled', !storeStatus.abierto);
        btn.title = storeStatus.abierto ? '' : 'La tienda está cerrada. No se pueden procesar pedidos.';
    });
}

// Función para renderizar el banner de estado de la tienda
function renderStoreStatusBanner() {
    let banner = document.getElementById('store-status-banner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'store-status-banner';
        banner.className = 'store-status-banner';
        // Insertar el banner antes del contenedor principal
        const mainContent = document.getElementById('main-content') || document.body;
        mainContent.insertBefore(banner, mainContent.firstChild);
    }
    // Si la tienda está abierta, ocultar el banner
    if (storeStatus.abierto) {
        banner.style.display = 'none';
        return;
    }
    // Banner estilizado y profesional para tienda cerrada
    banner.innerHTML = `
        <div class="store-status-banner-content">
            <div class="store-status-banner-icon">
                <i class="fas fa-store-slash"></i>
            </div>
            <div class="store-status-banner-info">
                <div class="store-status-banner-title">
                    <i class="fas fa-lock"></i> Tienda Cerrada
                </div>
                <div class="store-status-banner-desc">
                    ${storeStatus.descripcion ? `<span>${storeStatus.descripcion}</span>` : 'Actualmente no estamos procesando pedidos.'}
                </div>
                <div class="store-status-banner-extra">
                    <i class="fas fa-info-circle"></i> Puedes seguir navegando y agregando productos al carrito. Podrás procesar tu pedido cuando la tienda esté abierta.
                </div>
            </div>
        </div>
    `;
    banner.style.display = 'block';
}

// Función para actualizar el estado del botón de checkout
function updateCheckoutButtonState() {
    // Deshabilita el botón de checkout si la tienda está cerrada
    const checkoutBtns = document.querySelectorAll('.checkout-btn');
    checkoutBtns.forEach(btn => {
        btn.disabled = !storeStatus.abierto;
        btn.classList.toggle('disabled', !storeStatus.abierto);
        btn.title = storeStatus.abierto ? '' : 'La tienda está cerrada. No se pueden procesar pedidos.';
    });
}

// Mostrar/ocultar banner según la vista
function showBannerIfNeeded() {
    const banner = document.getElementById('store-status-banner');
    if (!banner) return;
    // Si la tienda está abierta, ocultar el banner
    if (storeStatus.abierto) {
        banner.style.display = 'none';
        return;
    }
    // Mostrar solo en la vista principal y carrito
    const detailContainer = document.getElementById('product-detail');
    if (detailContainer && detailContainer.style.display === 'block') {
        banner.style.display = 'none';
    } else {
        banner.style.display = 'block';
    }
}

// Llamar a showBannerIfNeeded en los lugares correctos
// En renderProducts y hideProductDetail (ya tienes lógica para el banner, solo llama a showBannerIfNeeded)

// Renderizar productos con precios corregidos
function renderProducts(productsToRender = products) {
    const container = document.getElementById('products-container');
    const searchInput = document.getElementById('search-input');
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
    
    // Mostrar el panel de productos top solo en la página principal y cuando no hay búsqueda
    if (!window.location.hash && !searchTerm) {
        toggleTopProductsPanel(true);
    } else {
        toggleTopProductsPanel(false);
    }

    // Mostrar el banner solo si la barra de búsqueda está vacía
    if (bannerContainer) {
        if (!searchTerm) {
            bannerContainer.style.display = 'block';
        } else {
            bannerContainer.style.display = 'none';
        }
    }

    if (!container) return;
    container.innerHTML = '';

    productsToRender.forEach(product => {
        const displayProduct = product.isGrouped ? product.variants[product.currentVariant] : product;
        const cleanName = displayProduct.nombre.replace(/'/g, "\\'");
        const productEl = document.createElement('div');
        productEl.className = 'product-card';
        const isOnSale = displayProduct.oferta && displayProduct.descuento > 0;
        let finalPrice, discountPercent;
        if (isOnSale) {
            finalPrice = Number(displayProduct.descuento).toFixed(2); // Ahora es el precio final
            discountPercent = Math.round(100 - (displayProduct.descuento * 100 / displayProduct.precio));
        } else {
            finalPrice = Number(displayProduct.precio).toFixed(2);
            discountPercent = 0;
        }
        // Miniaturas de variantes
        const variantThumbnails = product.isGrouped ? `
            <div class="variant-thumbnails-container">
                <div class="variant-thumbnails">
                    ${product.variants.map((variant, index) => `
                        <div class="variant-thumb ${index === product.currentVariant ? 'active' : ''}" 
                             onclick="changeProductVariant(this, '${product.baseName}', ${index}, event)">
                            <img src="Images/products/${variant.imagenes[0]}" alt="${variant.variantName}">
                            <span class="variant-tooltip">${variant.variantName}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : '';
        productEl.innerHTML = `
            <div class="product-image-container">
                <div class="product-badges">
                    ${displayProduct.nuevo ? '<img src="Images/badge_new.png" alt="Nuevo" class="badge-image">' : ''}
                    ${displayProduct.oferta ? '<img src="Images/oferta.png" alt="Oferta" class="badge-image">' : ''}
                    ${displayProduct.mas_vendido ? '<img src="Images/badge_top.png" alt="Top" class="badge-image">' : ''}
                </div>
                <img src="Images/products/${displayProduct.imagenes[0]}" 
                    class="product-image" 
                    alt="${displayProduct.cleanName}"
                    onclick="showProductDetail('${encodeURIComponent(displayProduct.nombre)}')">
            </div>
            <div class="product-info">
                <div class="product-category">
                    ${displayProduct.categoria}
                </div>
                <h3 class="product-title" onclick="showProductDetail('${encodeURIComponent(displayProduct.nombre)}')">
                    ${displayProduct.cleanName}
                </h3>
                ${variantThumbnails}
                <div class="price-container">
                    ${isOnSale ? `
                        <span class="original-price">${Number(displayProduct.precio).toFixed(2)}<img src='Images/Zelle-Symbol.png' alt='Zelle' class='zelle-symbol'></span>
                        <span class="discount-percent">-${discountPercent}%</span>
                    ` : ''}
                    <span class="current-price">${finalPrice} <img src='Images/Zelle-Symbol.png' alt='Zelle' class='zelle-symbol'></span>
                </div>
                <div class="quantity-section">
                    <button class="add-to-cart" onclick="addToCart('${displayProduct.nombre}', false, event)">
                        <i class="fas fa-cart-plus"></i>
                        <span>Añadir al carrito</span>
                    </button>
                </div>
            </div>
        `;
        container.appendChild(productEl);
    });
    showBannerIfNeeded();
}

function hideProductDetail() {
    const productsContainer = document.getElementById('products-container');
    const detailContainer = document.getElementById('product-detail');
    
    if (productsContainer) {
        productsContainer.style.display = 'grid';
        productsContainer.style.animation = 'fadeIn 0.4s ease-out';
    }

    // Mostrar el banner cuando se vuelve a la página principal
    if (bannerContainer) {
        bannerContainer.style.display = 'block'; // <-- MUESTRA EL BANNER
    }
    
    if (detailContainer) {
        detailContainer.style.display = 'none';
        detailContainer.innerHTML = '';
    }
    
    currentProduct = null;
    window.location.hash = '';

    showBannerIfNeeded();
}

// Si tienes lógica para mostrar el carrito, también llama a showBannerIfNeeded allí si es necesario

// --- Fin de la funcionalidad del header ---

// Inicialización
// Función para renderizar productos top
function updateTopProductsNavigation() {
    const container = document.getElementById('topProductsContainer');
    const prevBtn = document.querySelector('.top-products-nav.prev');
    const nextBtn = document.querySelector('.top-products-nav.next');
    
    if (!container || !prevBtn || !nextBtn) return;

    const isAtStart = container.scrollLeft <= 0;
    const isAtEnd = container.scrollLeft + container.offsetWidth >= container.scrollWidth - 1;

    prevBtn.classList.toggle('disabled', isAtStart);
    nextBtn.classList.toggle('disabled', isAtEnd);
}

function scrollTopProducts(direction) {
    const container = document.getElementById('topProductsContainer');
    if (!container) return;

    const scrollAmount = container.offsetWidth * 0.8;
    const newPosition = direction === 'next' 
        ? container.scrollLeft + scrollAmount 
        : container.scrollLeft - scrollAmount;
    
    container.scrollTo({
        left: newPosition,
        behavior: 'smooth'
    });
}

function toggleTopProductsPanel(show) {
    const panel = document.getElementById('topProductsPanel');
    if (!panel) return;
    
    if (show === undefined) {
        show = !panel.classList.contains('hidden');
    }
    
    panel.classList.toggle('hidden', !show);
}

function renderTopProducts() {
    const topProductsContainer = document.getElementById('topProductsContainer');
    if (!topProductsContainer) return;

    // Obtener todos los productos top, incluyendo las variantes
    let topProducts = [];
    products.forEach(product => {
        if (product.isGrouped) {
            // Para productos agrupados, incluir cada variante que sea top
            product.variants.forEach(variant => {
                if (variant.mas_vendido) {
                    topProducts.push({
                        ...variant,
                        cleanName: variant.nombre.replace(/\(v\d+\)\s*/g, '')
                    });
                }
            });
        } else if (product.mas_vendido) {
            // Para productos individuales, incluir si es top
            topProducts.push(product);
        }
    });

    // Ordenar por precio y limitar a 10
    topProducts = topProducts.slice(0, 10);

    topProductsContainer.innerHTML = topProducts.map(product => {
        const finalPrice = product.descuento > 0 
            ? product.precio - (product.precio * product.descuento / 100)
            : product.precio;
        
        const discountPercent = product.descuento > 0
            ? Math.round(100 - (product.descuento * 100 / product.precio))
            : 0;

        return `
            <div class="top-product-card" onclick="showProductDetail('${encodeURIComponent(product.nombre)}')">
                <div class="top-product-image-container">
                    <img src="Images/products/${product.imagenes[0]}" 
                         alt="${product.cleanName}" 
                         class="top-product-image">
                    ${product.oferta ? `<span class="top-discount-badge">-${discountPercent}%</span>` : ''}
                </div>
                <div class="top-product-info">
                    <h3 class="top-product-name">${product.cleanName}</h3>
                    <div class="top-product-price-container">
                        ${product.descuento > 0 ? `
                            <span class="top-original-price">$${product.precio.toFixed(2)}</span>
                        ` : ''}
                        <div class="top-product-price">$${finalPrice.toFixed(2)}</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Configurar los botones de navegación
    const prevBtn = document.querySelector('.top-products-nav.prev');
    const nextBtn = document.querySelector('.top-products-nav.next');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', () => scrollTopProducts('prev'));
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', () => scrollTopProducts('next'));
    }

    // Configurar el evento de scroll
    topProductsContainer.addEventListener('scroll', updateTopProductsNavigation);
    
    // Actualizar estado inicial de los botones
    updateTopProductsNavigation();
}

// Reemplaza la línea de DOMContentLoaded para cargar productos y estado
// document.addEventListener('DOMContentLoaded', loadProducts);
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
});